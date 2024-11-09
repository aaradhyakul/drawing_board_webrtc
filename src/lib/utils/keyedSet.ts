export class KeyedSet<T> {
	#keyProp: keyof T;
	#items: Map<T[keyof T], T> = new Map();

	constructor(keyProp: keyof T) {
		this.#keyProp = keyProp;
	}

	set(item: T) {
		this.#items.set(item[this.#keyProp], item);
	}

	get(key: T[keyof T]): T | undefined {
		if (this.#items.has(key)) {
			return this.#items.get(key);
		}
	}

	has(key: T[keyof T]): boolean {
		return this.#items.has(key);
	}

	delete(key: T[keyof T]): boolean {
		return this.#items.delete(key);
	}

	values(): IterableIterator<T> {
		return this.#items.values();
	}
}
