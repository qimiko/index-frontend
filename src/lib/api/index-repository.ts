import type {
	ModID,
	ModMeta,
	DeveloperMeta,
	BeginLoginInfo,
	ModVersionMeta,
	ModVersionString,
	Platform,
	SimpleModMeta,
	ModStatus
} from './models.js';

type Awaitable<T> = Promise<T> | T;

export interface Paginated<T> {
	data: T[];
	count: number;
}

export class IndexError extends Error {
	constructor(message: string) {
		super(message);

		this.name = 'IndexError';
	}
}

export enum ModSort {
	Downloads = 'downloads',
	RecentlyUpdated = 'recently_updated',
	RecentlyPublished = 'recently_published',
	Name = 'name',
	NameReverse = 'name_reverse'
}

export interface ModSearchParams {
	page?: number;
	developer?: string;
	status?: ModStatus;
	featured?: boolean;
	perPage?: number;
	tags?: string[];
	platforms?: Platform[];
	query?: string;
	gd?: string;
	sort?: ModSort;
}

export interface UpdateModBody {
	featured: boolean;
}

export interface UpdateVersionBody {
	status: ModStatus;
	info?: string;
}

export interface UpdateSelfBody {
	displayName: string;
}

export interface GetSelfModsParams {
	status?: ModStatus;
}

export abstract class IndexRepository {
	abstract getMods(params?: ModSearchParams): Awaitable<Paginated<ModMeta>>;
	abstract getMod(id: ModID): Awaitable<ModMeta>;

	abstract getModLatestVersion(id: ModID): Awaitable<ModVersionMeta>;
	abstract getModVersion(id: ModID, version: ModVersionString): Awaitable<ModVersionMeta>;

	abstract createMod(downloadLink: string): Awaitable<void>;
	abstract createModVersion(id: ModID, downloadLink: string): Awaitable<void>;

	abstract updateMod(id: ModID, body: UpdateModBody): Awaitable<void>;
	abstract updateModVersion(
		id: ModID,
		version: ModVersionString,
		body: UpdateVersionBody
	): Awaitable<void>;

	abstract getModLogo(id: ModID): URL;
	abstract getModLogoData(id: ModID): Awaitable<Blob>;

	abstract getModLatestDownload(id: ModID): URL;
	abstract getModDownload(id: ModID, version: ModVersionString): URL;

	abstract getModLatestDownloadLink(id: ModID): Awaitable<string>;
	abstract getModDownloadLink(id: ModID, version: ModVersionString): Awaitable<string>;

	abstract getSelf(): Awaitable<DeveloperMeta>;
	abstract updateSelf(body: UpdateSelfBody): Awaitable<void>;
	abstract getSelfMods(params?: GetSelfModsParams): Awaitable<SimpleModMeta[]>;

	abstract beginLoginFlow(): Awaitable<BeginLoginInfo>;
	abstract pollLogin(uuid: string): Awaitable<string>;

	abstract setToken(token: string): void;
	abstract deleteToken(): Awaitable<void>;
	abstract deleteAllTokens(): Awaitable<void>;
}
