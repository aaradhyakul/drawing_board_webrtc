import { QuadTree } from '$lib/quadtree/quadTree';
import { Window } from '$lib/state/window.svelte';

export class Strokes {
	#quadTree = $derived.by(
		() => new QuadTree({ x: 0, y: 0, width: Window.width, height: Window.height })
	);
}
