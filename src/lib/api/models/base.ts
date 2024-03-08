export type ModID = string;

export interface BeginLoginInfo {
	uuid: string;
	interval: number;
	uri: string;
	code: string;
}

export type Platform = 'win' | 'android32' | 'android64' | 'ios' | 'mac';
