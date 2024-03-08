import type { Developer } from '$lib/api/models';
import { writable } from 'svelte/store';

export const user = writable<Developer | null>(null);
