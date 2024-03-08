import { browser } from '$app/environment';
import { writable } from 'svelte/store';

const TOKEN_KEY = 'token';

const tokenValue = browser ? window.localStorage.getItem('token') ?? null : null;
export const token = writable<string | null>(tokenValue);

token.subscribe((v) => {
	if (browser) {
		if (v) {
			window.localStorage.setItem(TOKEN_KEY, v);
		} else {
			window.localStorage.removeItem(TOKEN_KEY);
		}
	}
});
