import { writable } from 'svelte/store';

export const db = writable(null);
export const inited = writable(false);

export const File = writable("strand");
const Handle = (o) => {
	for (const [key, value] of Object.entries(o)) {
		const item = localStorage.getItem(key);
		if (item) value.set(JSON.parse(item));
		value.subscribe(item => { if (item) localStorage.setItem(key, JSON.stringify(item)) })
	}
}

Handle({File});