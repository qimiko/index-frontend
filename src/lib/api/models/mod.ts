import type { GetSelfModsParams, ModSearchParams } from '../index-repository.js';
import type { IndexService } from '../index-service.js';
import type { ModID } from './base.js';
import { ModDeveloperManager, type ModDeveloperMeta } from './mod-developer.js';
import { ModVersionManager, SimpleModVersionManager, VersionManager } from './mod-version.js';
import { type ModVersionMeta, type SimpleModVersionMeta } from './mod-version.js';

export interface SimpleModMeta {
	id: string;
	featured: boolean;
	download_count: number;
	versions: SimpleModVersionMeta[];
	developers: ModDeveloperMeta[];
}

/**
 * References a simple mod, returned by the /v1/self/mods endpoint.
 * While the layout is almost identical to the Mod class, many fields are missing.
 * (This is more noticeable in the ModVersion.)
 *
 * As such, usage of this class is opt-in, if you don't see the additional mod fields as useful.
 */
export class SimpleMod {
	id: string;
	featured: boolean;
	downloadCount: number;
	developers: ModDeveloperManager;
	versions: SimpleModVersionManager;

	constructor(
		data: SimpleModMeta,
		private manager: ModManager
	) {
		this.id = data.id;
		this.featured = data.featured;
		this.downloadCount = data.download_count;

		this.developers = new ModDeveloperManager(data.developers);

		const versionManager = manager.versions.byMod(data.id);
		this.versions = new SimpleModVersionManager(this.manager.index, this.id, versionManager);

		if (data.versions.length == 1) {
			const latestVersion = data.versions[0];
			this.versions._insertLatest(latestVersion);
		} else {
			for (const version of data.versions) {
				this.versions._insert(version);
			}
		}
	}

	getLogoUrl() {
		return this.manager.index.repository.getModLogo(this.id);
	}

	/**
	 * Gets the data associated with the mod's logo, with authentication (for unverified mods)
	 * @returns A blob containing the bytes of a PNG file
	 */
	async getLogoData() {
		return this.manager.index.repository.getModLogoData(this.id);
	}

	async fetch(): Promise<Mod> {
		return this.manager.get(this.id);
	}
}

export interface ModMeta {
	id: ModID;
	repository?: string;
	featured: boolean;
	developers: ModDeveloperMeta[];
	download_count: number;
	tags: string[];
	versions: ModVersionMeta[];
	about?: string;
	changelog?: string;
	created_at: string;
	updated_at: string;
}

export class Mod {
	id: ModID;
	developers: ModDeveloperManager;
	tags: string[];
	about?: string;
	changelog?: string;
	private _featured: boolean;
	downloadCount: number;
	repository?: URL;

	createdAt: Date;
	updatedAt: Date;

	readonly versions: ModVersionManager;

	/**
	 * Determines if a mod is partially fetched, aka not all versions are known.
	 */
	partial: boolean = true;

	private indexRepository() {
		return this.manager.index.repository;
	}

	constructor(
		data: ModMeta,
		private manager: ModManager
	) {
		this.id = data.id;
		this.tags = data.tags;
		this._featured = data.featured;
		this.downloadCount = data.download_count;
		this.repository = data.repository ? new URL(data.repository) : undefined;

		this.versions = manager.versions.byMod(data.id);
		this.loadVersionsFromData(data);

		this.developers = new ModDeveloperManager(data.developers);

		this.about = data.about;
		this.changelog = data.changelog;

		this.createdAt = new Date(data.created_at);
		this.updatedAt = new Date(data.updated_at);
	}

	private loadVersionsFromData(data: ModMeta) {
		// versions are not promised to be ordered
		// so only way it is known if something is latest is if it is the only version
		if (data.versions.length == 1) {
			const latestVersion = data.versions[0];
			this.versions._insertLatest(latestVersion);
		} else {
			for (const version of data.versions) {
				this.versions._insert(version);
			}
		}
	}

	getLogoUrl() {
		return this.indexRepository().getModLogo(this.id);
	}

	async getLogoData() {
		return this.indexRepository().getModLogoData(this.id);
	}

	/**
	 * Clears the partial flag.
	 * @internal
	 */
	_markAsFetched() {
		this.partial = false;
	}

	/**
	 * Resolves the remaining information of the mod, if missing.
	 */
	async fetch() {
		if (!this.partial) {
			return this;
		}

		const data = await this.indexRepository().getMod(this.id);
		this.loadVersionsFromData(data);

		this.about = data.about;
		this.changelog = data.changelog;

		this._markAsFetched();

		return this;
	}

	public get featured() {
		return this._featured;
	}

	async setFeatured(featured: boolean) {
		if (this._featured == featured) {
			return;
		}

		await this.indexRepository().updateMod(this.id, { featured });
		this._featured = featured;
	}
}

export class ModManager {
	versions: VersionManager;
	private collection: Record<string, Mod | SimpleMod> = {};

	constructor(public index: IndexService) {
		this.versions = new VersionManager(this.index);
	}

	async get(id: ModID, allowSimple?: false): Promise<Mod>;
	async get(id: ModID, allowSimple?: true): Promise<Mod | SimpleMod>;
	async get(id: ModID, allowSimple: boolean = false): Promise<Mod | SimpleMod> {
		if (id in this.collection) {
			const modCandidate = this.collection[id];
			if (allowSimple || modCandidate instanceof Mod) {
				return this.collection[id];
			}
		}

		const mod = await this.index.repository.getMod(id);
		const modObj = new Mod(mod, this);
		modObj._markAsFetched();

		this.collection[id] = modObj;

		return this.collection[id];
	}

	async search(params?: ModSearchParams) {
		const mods = await this.index.repository.getMods(params);
		const modObjs = mods.data.map((m) => {
			const modId = m.id;

			// update mods in collection
			if (!(modId in this.collection)) {
				this.collection[modId] = new Mod(m, this);
			}

			return this.collection[modId];
		});

		return { data: modObjs, count: mods.count };
	}

	async bySelf(params?: GetSelfModsParams) {
		const mods = await this.index.repository.getSelfMods(params);
		const modObjs = mods.map((m) => {
			const modId = m.id;

			// update mods in collection, if they've never been loaded
			const modObj = new SimpleMod(m, this);
			if (!(modId in this.collection)) {
				this.collection[modId] = new SimpleMod(m, this);
			}

			return modObj;
		});

		return modObjs;
	}

	async create(downloadUrl: string) {
		await this.index.repository.createMod(downloadUrl);
	}
}
