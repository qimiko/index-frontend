export interface ModDeveloperMeta {
	id: number;
	username: string;
	display_name: string;
	is_owner: boolean;
}

export interface DeveloperMeta {
	id: number;
	username: string;
	display_name: string;
	verified: boolean;
	admin: boolean;
}

export class ModDeveloper {
	readonly id: number;
	readonly username: string;
	readonly displayName: string;

	constructor(data: ModDeveloperMeta) {
		this.id = data.id;
		this.username = data.username;
		this.displayName = data.display_name;
	}
}

export class Developer {
	readonly id: number;
	readonly username: string;
	displayName: string;
	readonly verified: boolean;
	readonly admin: boolean;

	constructor(data: DeveloperMeta) {
		this.id = data.id;
		this.username = data.username;
		this.displayName = data.display_name;
		this.verified = data.verified;
		this.admin = data.admin;
	}
}

export class ModDeveloperManager {
	developers: ModDeveloper[];
	private _owner: ModDeveloper | null;

	get owner() {
		if (this._owner) {
			return this._owner;
		}

		return this.developers[0];
	}

	constructor(data: ModDeveloperMeta[]) {
		this.developers = [];
		this._owner = null;

		for (const developer of data) {
			const developerObj = new ModDeveloper(developer);
			if (developer.is_owner) {
				this._owner = developerObj;
			}

			this.developers.push(developerObj);
		}
	}

	list() {
		return this.developers;
	}
}
