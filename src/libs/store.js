// @ts-nocheck
import { writable } from 'svelte/store';
import { GraphDb } from './graphdb';

export const db = writable(new GraphDb());
export const zoom = writable(1);
export const File = writable("C:/tmp/Bob.db");

const Handle = (o) => {
	for (const [key, value] of Object.entries(o)) {
		const item = localStorage.getItem(key);
		if (item) value.set(JSON.parse(item));
		value.subscribe(item => { if (item) localStorage.setItem(key, JSON.stringify(item)) })
	}
}

Handle({File});