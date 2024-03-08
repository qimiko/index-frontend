import { browser } from '$app/environment';
import type { BeginLoginInfo } from '$lib/api/models';
import { writable } from 'svelte/store';

const LOGIN_KEY = 'active-login';

const loginValue = browser ? window.localStorage.getItem(LOGIN_KEY) ?? null : null;

const parsedValue: BeginLoginInfo | null = loginValue ? JSON.parse(loginValue) : null;
export const login = writable(parsedValue);

login.subscribe((v) => {
	if (browser) {
		if (v) {
			window.localStorage.setItem(LOGIN_KEY, JSON.stringify(v));
		} else {
			window.localStorage.removeItem(LOGIN_KEY);
		}
	}
});
