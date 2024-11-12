import { SvelteMap } from 'svelte/reactivity';

export class KeyedSet<T> {
	#keyProp: keyof T;
	items: SvelteMap<T[keyof T], T> = new SvelteMap();

	constructor(keyProp: keyof T) {
		this.#keyProp = keyProp;
	}

	set(item: T | undefined) {
		if (!item) return;
		this.items.set(item[this.#keyProp], item);
	}

	get(key: T[keyof T]): T | undefined {
		if (this.items.has(key)) {
			return this.items.get(key);
		}
	}

	has(key: T[keyof T]): boolean {
		return this.items.has(key);
	}

	delete(key: T[keyof T]): boolean {
		return this.items.delete(key);
	}

	values(): IterableIterator<T> {
		return this.items.values();
	}
}
