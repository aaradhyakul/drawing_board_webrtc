import { ds, QuadTree } from './strokes.svelte';
class WindowState {
	#width: number = $state(0);
	#height: number = $state(0);

	set height(height: number) {
		this.#height = height;
		ds.qt.bounds.height = height;
	}
	set width(width: number) {
		this.#width = width;
		ds.qt.bounds.width = width;
	}
}

export const Window = $state(new WindowState());
