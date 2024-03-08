import {
	IndexError,
	IndexRepository,
	type GetSelfModsParams,
	type ModSearchParams,
	type Paginated,
	type UpdateModBody,
	type UpdateSelfBody,
	type UpdateVersionBody
} from './index-repository.js';
import type {
	BeginLoginInfo,
	DeveloperMeta,
	ModID,
	ModMeta,
	ModVersionMeta,
	SimpleModMeta
} from './models.js';

const BASE_URL = 'https://api.geode-sdk.org';

interface BaseRequest<T> {
	error: string;
	payload: T;
}

type BasePaginatedRequest<T> = BaseRequest<Paginated<T>>;

export class IndexRepositoryLive extends IndexRepository {
	private token: string | null = null;

	setToken(token: string): void {
		this.token = token;
	}

	private validate<T>(data: BaseRequest<T>) {
		if (data.error) {
			throw new IndexError(data.error);
		}

		return data.payload;
	}

	async getMods(searchParams?: ModSearchParams): Promise<Paginated<ModMeta>> {
		const url = new URL(`${BASE_URL}/v1/mods`);

		let requiresAuth = false;

		if (searchParams?.page != null) {
			const page = searchParams.page;
			url.searchParams.set('page', page.toString());
		}

		if (searchParams?.perPage != null) {
			const limit = searchParams?.perPage ?? 10;
			url.searchParams.set('per_page', limit.toString());
		}

		if (searchParams?.developer) {
			url.searchParams.set('developer', searchParams.developer);
		}

		if (searchParams?.pendingValidation) {
			url.searchParams.set('pending_validation', 'true');
			requiresAuth = true;
		}

		if (searchParams?.featured != null) {
			url.searchParams.set('featured', 'true');
		}

		if (searchParams?.tags) {
			url.searchParams.set('tags', searchParams.tags.join(','));
		}

		if (searchParams?.platforms) {
			url.searchParams.set('platforms', searchParams.platforms.join(','));
		}

		if (searchParams?.query) {
			url.searchParams.set('query', searchParams.query);
		}

		if (searchParams?.gd) {
			url.searchParams.set('gd', searchParams.gd);
		}

		if (searchParams?.sort) {
			url.searchParams.set('sort', searchParams.sort);
		}

		const r = await fetch(url, {
			headers: requiresAuth
				? {
						Authorization: `Bearer ${this.token}`
					}
				: undefined
		});
		const data: BasePaginatedRequest<ModMeta> = await r.json();

		return this.validate(data);
	}

	async getMod(id: ModID): Promise<ModMeta> {
		const r = await fetch(`${BASE_URL}/v1/mods/${id}`, {
			headers: this.token
				? {
						Authorization: `Bearer ${this.token}`
					}
				: undefined
		});
		const data: BaseRequest<ModMeta> = await r.json();

		return this.validate(data);
	}

	async createMod(downloadLink: string): Promise<void> {
		const r = await fetch(`${BASE_URL}/v1/mods`, {
			headers: new Headers({
				Authorization: `Bearer ${this.token}`,
				'Content-Type': 'application/json'
			}),
			method: 'POST',
			body: JSON.stringify({ download_link: downloadLink })
		});

		if (r.status != 204) {
			const data: BaseRequest<void> = await r.json();
			throw new IndexError(data.error);
		}
	}

	async getModLatestVersion(id: ModID): Promise<ModVersionMeta> {
		const r = await fetch(`${BASE_URL}/v1/mods/${id}/versions/latest`);
		const data = await r.json();

		return this.validate<ModVersionMeta>(data);
	}

	async getModVersion(id: ModID, version: string): Promise<ModVersionMeta> {
		const r = await fetch(`${BASE_URL}/v1/mods/${id}/versions/${version}`, {
			headers: this.token
				? {
						Authorization: `Bearer ${this.token}`
					}
				: undefined
		});
		const data = await r.json();

		return this.validate<ModVersionMeta>(data);
	}

	async createModVersion(id: ModID, downloadLink: string): Promise<void> {
		const r = await fetch(`${BASE_URL}/v1/mods/${id}/versions`, {
			headers: new Headers({
				Authorization: `Bearer ${this.token}`,
				'Content-Type': 'application/json'
			}),
			method: 'POST',
			body: JSON.stringify({ download_link: downloadLink })
		});

		if (r.status != 204) {
			const data: BaseRequest<void> = await r.json();
			throw new IndexError(data.error);
		}
	}

	async updateMod(id: ModID, body: UpdateModBody): Promise<void> {
		const r = await fetch(`${BASE_URL}/v1/mods/${id}`, {
			headers: new Headers({
				Authorization: `Bearer ${this.token}`,
				'Content-Type': 'application/json'
			}),
			method: 'PUT',
			body: JSON.stringify(body)
		});

		if (r.status != 204) {
			const data: BaseRequest<void> = await r.json();
			throw new IndexError(data.error);
		}
	}

	async updateModVersion(id: ModID, version: string, body: UpdateVersionBody): Promise<void> {
		const r = await fetch(`${BASE_URL}/v1/mods/${id}/versions/${version}`, {
			headers: new Headers({
				Authorization: `Bearer ${this.token}`,
				'Content-Type': 'application/json'
			}),
			method: 'PUT',
			body: JSON.stringify(body)
		});

		if (r.status != 204) {
			const data: BaseRequest<void> = await r.json();
			throw new IndexError(data.error);
		}
	}

	getModLogo(id: ModID): string {
		return `${BASE_URL}/v1/mods/${id}/logo`;
	}

	async getModLogoData(id: string): Promise<Blob> {
		const logoUrl = this.getModLogo(id);

		const r = await fetch(logoUrl, {
			headers: this.token
				? {
						Authorization: `Bearer ${this.token}`
					}
				: undefined
		});

		if (r.status != 200) {
			const data: BaseRequest<void> = await r.json();
			throw new IndexError(data.error);
		}

		return r.blob();
	}

	getModLatestDownload(id: string): string {
		return `${BASE_URL}/v1/mods/${id}/versions/latest/download`;
	}

	getModDownload(id: string, version: string): string {
		return `${BASE_URL}/v1/mods/${id}/versions/${version}/download`;
	}

	async getModLatestDownloadData(id: string): Promise<Blob> {
		const downloadUrl = this.getModLatestDownload(id);

		const r = await fetch(downloadUrl, {
			headers: this.token
				? {
						Authorization: `Bearer ${this.token}`
					}
				: undefined
		});

		if (r.status != 200) {
			const data: BaseRequest<void> = await r.json();
			throw new IndexError(data.error);
		}

		return r.blob();
	}

	async getModDownloadData(id: string, version: string): Promise<Blob> {
		const logoUrl = this.getModDownload(id, version);

		const r = await fetch(logoUrl, {
			headers: this.token
				? {
						Authorization: `Bearer ${this.token}`
					}
				: undefined
		});

		if (r.status != 200) {
			const data: BaseRequest<void> = await r.json();
			throw new IndexError(data.error);
		}

		return r.blob();
	}

	async beginLoginFlow(): Promise<BeginLoginInfo> {
		const r = await fetch(`${BASE_URL}/v1/login/github`, {
			method: 'POST'
		});
		const data: BaseRequest<BeginLoginInfo> = await r.json();

		return this.validate(data);
	}

	async pollLogin(uuid: string): Promise<string> {
		const r = await fetch(`${BASE_URL}/v1/login/github/poll`, {
			method: 'POST',
			headers: {
				'Content-Type': 'application/json'
			},
			body: JSON.stringify({ uuid })
		});
		const data: BaseRequest<string> = await r.json();

		return this.validate(data);
	}

	async getSelf(): Promise<DeveloperMeta> {
		const r = await fetch(`${BASE_URL}/v1/me`, {
			headers: new Headers({
				Authorization: `Bearer ${this.token}`
			})
		});
		const data: BaseRequest<DeveloperMeta> = await r.json();

		return this.validate(data);
	}

	async getSelfMods(params?: GetSelfModsParams): Promise<SimpleModMeta[]> {
		const url = new URL(`${BASE_URL}/v1/me/mods`);
		if (params?.validated != null) {
			url.searchParams.set('validated', params.validated ? 'true' : 'false');
		}

		const r = await fetch(url, {
			headers: new Headers({
				Authorization: `Bearer ${this.token}`
			})
		});

		const data: BaseRequest<SimpleModMeta[]> = await r.json();

		return this.validate(data);
	}

	async updateSelf(body: UpdateSelfBody): Promise<void> {
		const r = await fetch(`${BASE_URL}/v1/me`, {
			headers: new Headers({
				Authorization: `Bearer ${this.token}`,
				'Content-Type': 'application/json'
			}),
			method: 'PUT',
			body: JSON.stringify({ display_name: body.displayName })
		});

		if (r.status != 204) {
			const data: BaseRequest<void> = await r.json();
			throw new IndexError(data.error);
		}
	}

	async deleteToken(): Promise<void> {
		this.token = null;
		const r = await fetch(`${BASE_URL}/v1/me/token`, {
			headers: new Headers({
				Authorization: `Bearer ${this.token}`
			}),
			method: 'DELETE'
		});

		if (r.status != 204) {
			const data: BaseRequest<void> = await r.json();
			throw new IndexError(data.error);
		}
	}

	async deleteAllTokens(): Promise<void> {
		this.token = null;

		const r = await fetch(`${BASE_URL}/v1/me/tokens`, {
			headers: new Headers({
				Authorization: `Bearer ${this.token}`
			}),
			method: 'DELETE'
		});

		if (r.status != 204) {
			const data: BaseRequest<void> = await r.json();
			throw new IndexError(data.error);
		}
	}
}
