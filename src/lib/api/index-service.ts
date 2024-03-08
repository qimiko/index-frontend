import { getContext, setContext } from 'svelte';
import { IndexError, IndexRepository, type UpdateSelfBody } from './index-repository.js';
import { Developer, ModManager, type BeginLoginInfo } from './models.js';
import { IndexRepositoryLive } from './index-repository-live.js';

export class IndexService {
	static Symbol = Symbol('IndexRepository');

	static getContext() {
		return getContext<IndexService>(IndexService.Symbol);
	}

	static createContext() {
		const repository = new IndexRepositoryLive();
		const inst = new IndexService(repository);
		setContext(IndexService.Symbol, inst);
	}

	readonly mods: ModManager;

	user: Developer | null = null;
	activeLogin: BeginLoginInfo | null = null;

	private hasLoggedIn = false;

	constructor(public repository: IndexRepository) {
		this.mods = new ModManager(this);
	}

	loggedIn(): boolean {
		return this.hasLoggedIn;
	}

	async login(token: string): Promise<void> {
		this.hasLoggedIn = true;

		this.repository.setToken(token);

		try {
			const developerObj = await this.repository.getSelf();
			this.user = new Developer(developerObj);
		} catch (e) {
			if (e instanceof IndexError) {
				if (e.message == 'You need to be authenticated to perform this action') {
					throw e;
				}
			}
			this.hasLoggedIn = false;
		}
	}

	/**
	 * Creates a new active login session.
	 */
	async beginLogin(): Promise<BeginLoginInfo> {
		this.activeLogin = await this.repository.beginLoginFlow();
		return this.activeLogin;
	}

	/**
	 * Polls the server to determine if an active login session was completed.
	 * If it was completed, the value of this.user will be set to the current user.
	 * This function does not check for timeouts - do it yourself!
	 * @returns the user token, or null if poll was not a success
	 */
	async pollLogin(): Promise<string | null> {
		if (!this.activeLogin) {
			return null;
		}

		try {
			const token = await this.repository.pollLogin(this.activeLogin.uuid);
			await this.login(token);

			this.hasLoggedIn = true;
			this.activeLogin = null;
			return token;
		} catch (e) {
			if (e instanceof IndexError) {
				// check if indicate login failed/cancelled
				if (e.message == 'Login attempt expired' || e.message.startsWith('No attempt made')) {
					this.activeLogin = null;
				}
			}
			return null;
		}
	}

	cancelLogin() {
		this.activeLogin = null;
	}

	private clearUser() {
		this.hasLoggedIn = false;
		this.user = null;
	}

	async logout() {
		if (!this.user) {
			return;
		}

		this.clearUser();
		await this.repository.deleteToken();
	}

	async logoutAll() {
		if (!this.user) {
			return;
		}

		this.clearUser();
		await this.repository.deleteAllTokens();
	}

	async updateSelf(body: UpdateSelfBody) {
		if (!this.user) {
			return;
		}

		await this.repository.updateSelf(body);
		this.user.displayName = body.displayName;
	}
}
