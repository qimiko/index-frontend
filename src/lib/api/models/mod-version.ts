import { compareVersions } from 'compare-versions';
import type { IndexService } from '../index-service.js';
import type { ModID } from './base.js';

export type ModVersionString = string;
type GDVersionMeta =
	| {
			win?: string | null;
			mac?: string | null;
			ios?: string | null;
			android32?: string | null;
			android64?: string | null;
	  }
	| string;

export type ModStatus = 'accepted' | 'pending' | 'rejected' | 'unlisted';

export interface ModVersionMeta {
	name: string;
	download_count: number;
	description?: string;
	early_load: boolean;
	api: boolean;
	geode: ModVersionString;
	version: ModVersionString;
	download_link: string;
	hash: string;
	gd: GDVersionMeta;
	mod_id: ModID;
	dependencies?: DependencyMeta[];
	incompatibilities?: IncompatibilityMeta[];
	status: ModStatus;
}

export interface DependencyMeta {
	mod_id: string;
	version: string;
	importance: string;
}

enum DependencyImportance {
	Suggested = 'suggested',
	Recommended = 'recommended',
	Required = 'required'
}

export class Dependency {
	modId: string;
	version: string;
	importance: DependencyImportance;

	constructor(data: DependencyMeta) {
		this.modId = data.mod_id;
		this.version = data.version;
		this.importance = data.importance as DependencyImportance;
	}
}

export interface IncompatibilityMeta {
	mod_id: string;
	version: string;
	importance: string;
}

enum IncompatibilityImportance {
	Breaking = 'breaking',
	Conflicting = 'conflicting',
	Superseded = 'Superseeded'
}

export class Incompatibility {
	modId: string;
	version: string;
	importance: IncompatibilityImportance;

	constructor(data: IncompatibilityMeta) {
		this.modId = data.mod_id;
		this.version = data.version;
		this.importance = data.importance as IncompatibilityImportance;
	}
}

export class GDVersion {
	readonly win?: string;
	readonly mac?: string;
	readonly ios?: string;
	readonly android32?: string;
	readonly android64?: string;

	constructor(data: GDVersionMeta) {
		if (typeof data == 'string') {
			this.win = data;
			this.mac = data;
			this.ios = data;
			this.android32 = data;
			this.android64 = data;
		} else {
			this.win = data.win ?? undefined;
			this.mac = data.mac ?? undefined;
			this.ios = data.ios ?? undefined;
			this.android32 = data.android32 ?? undefined;
			this.android64 = data.android64 ?? undefined;
		}
	}
}

export interface SimpleModVersionMeta {
	name: string;
	version: string;
	download_count: number;
	validated: boolean;
}

export class SimpleModVersion {
	readonly name: string;
	readonly version: string;
	readonly downloadCount: number;
	readonly validated: boolean;

	constructor(
		data: SimpleModVersionMeta,
		private manager: ModVersionManager,
		private modId: ModID
	) {
		this.name = data.name;
		this.version = data.version;
		this.downloadCount = data.download_count;
		this.validated = data.validated;
	}

	async fetch(): Promise<ModVersion> {
		// go the long way and avoid getting a new mod
		const versionManager = this.manager.index.mods.versions.byMod(this.modId);
		return await versionManager.get(this.version);
	}

	async getDownloadLink(): Promise<URL> {
		const url = await this.manager.index.repository.getModDownloadLink(this.modId, this.version);
		return new URL(url);
	}
}

/**
 * A simplified form of the ModVersionManager, for SimpleMods.
 */
export class SimpleModVersionManager {
	private collection: Record<ModVersionString, SimpleModVersion> = {};
	private latestVersion: SimpleModVersion | null = null;

	constructor(
		public index: IndexService,
		private mod: ModID,
		private modVersionManager: ModVersionManager
	) {}

	async latest() {
		return this.latestVersion!;
	}

	get(version: ModVersionString) {
		return this.collection[version];
	}

	/**
	 * Inserts a new version for a mod with its identifier
	 * @internal
	 */
	_insertLatest(version: SimpleModVersionMeta) {
		const modVersion = new SimpleModVersion(version, this.modVersionManager, this.mod);

		this.latestVersion = modVersion;
		this.collection[version.version] = modVersion;
	}

	_insert(version: SimpleModVersionMeta) {
		const modVersion = new SimpleModVersion(version, this.modVersionManager, this.mod);

		this.collection[version.version] = modVersion;
	}
}

export class ModVersion {
	readonly name: string;
	readonly version: string;
	readonly description?: string;
	readonly gd: GDVersion;
	readonly geode: ModVersionString;
	readonly earlyLoad: boolean;
	readonly api: boolean;
	readonly downloadLink: string;
	readonly downloadCount: number;

	private _status: ModStatus;

	incompatibilities?: Incompatibility[];
	dependencies?: Dependency[];

	private readonly modId: ModID;

	/**
	 * Indicates that the mod is partially loaded, aka without dependencies/incompatibilities.
	 */
	partial: boolean = true;

	constructor(
		data: ModVersionMeta,
		private manager: ModVersionManager
	) {
		this.name = data.name;
		this.version = data.version;
		this.description = data.description;
		this.gd = new GDVersion(data.gd);

		// having a leading v in a version is legal, surprisingly
		this.geode = data.geode.startsWith('v') ? data.geode.substring(1) : data.geode;

		this.earlyLoad = data.early_load;
		this.api = data.api;
		this.downloadLink = data.download_link;
		this.downloadCount = data.download_count;
		this.modId = data.mod_id;
		this._status = data.status;

		this.handleDependencies(data);
	}

	/**
	 * Gets a mod's direct download link with proper authentication.
	 * This is counted as a download, so don't run this unless you intend to trigger one.
	 * @returns The URL to the mod's direct download
	 */
	async getDownloadLink(): Promise<URL> {
		const url = await this.manager.index.repository.getModDownloadLink(this.modId, this.version);
		return new URL(url);
	}

	private handleDependencies(data: ModVersionMeta) {
		if (data.incompatibilities != null) {
			this.incompatibilities = data.incompatibilities.map((i) => new Incompatibility(i));
		}

		if (data.dependencies != null) {
			this.dependencies = data.dependencies.map((d) => new Dependency(d));
		}
	}

	/**
	 * Clears the partial flag.
	 * @internal
	 */
	_markAsFetched() {
		this.partial = false;
	}

	/**
	 * Resolves the remaining information of the version, if missing.
	 */
	async fetch(): Promise<ModVersion> {
		if (!this.partial) {
			return this;
		}

		const data = await this.manager.index.repository.getModVersion(this.modId, this.version);
		this.handleDependencies(data);

		this._markAsFetched();

		return this;
	}

	get status() {
		return this._status;
	}

	async setStatus(status: ModStatus) {
		await this.manager.index.repository.updateModVersion(this.modId, this.version, {
			status
		});

		// now we definitely know the status
		this._status = status;
	}
}

export class ModVersionManager {
	private collection: Record<ModVersionString, ModVersion> = {};
	private latestVersion: ModVersion | null = null;

	constructor(
		public index: IndexService,
		private mod: ModID
	) {}

	async latest() {
		if (!this.latestVersion) {
			const latest = await this.index.repository.getModLatestVersion(this.mod);
			this._insertLatest(latest, true);
		}

		return this.latestVersion!;
	}

	async get(version: ModVersionString) {
		if (!(version in this.collection)) {
			const data = await this.index.repository.getModVersion(this.mod, version);
			this._insert(data, true);
		}

		return this.collection[version];
	}

	/**
	 * Gets a list of all mod versions known to the client.
	 * You may want to call mod.fetch() first to get this information.
	 * @returns A listing of all known mod versions, ordered by their version in semantic ordering
	 */
	list(): ModVersion[] {
		return Object.values(this.collection).sort((a, b) => compareVersions(b.version, a.version));
	}

	async create(downloadUrl: string) {
		return this.index.repository.createModVersion(this.mod, downloadUrl);
	}

	/**
	 * Inserts a new version for a mod with its identifier
	 * @internal
	 */
	_insertLatest(version: ModVersionMeta, fromFetch = false) {
		const modVersion = new ModVersion(version, this);
		if (fromFetch) {
			modVersion._markAsFetched();
		}

		this.latestVersion = modVersion;
		this.collection[version.version] = modVersion;
	}

	_insert(version: ModVersionMeta, fromFetch = false) {
		const modVersion = new ModVersion(version, this);
		if (fromFetch) {
			modVersion._markAsFetched();
		}

		this.collection[version.version] = modVersion;
	}
}

export class VersionManager {
	private collection: Record<ModID, ModVersionManager> = {};

	constructor(private index: IndexService) {}

	byMod(mod: ModID) {
		if (!(mod in this.collection)) {
			this.collection[mod] = new ModVersionManager(this.index, mod);
		}

		return this.collection[mod];
	}
}
