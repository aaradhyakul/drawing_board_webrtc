<script lang="ts">
	import { onMount } from 'svelte';
	import { toolManager, ToolName } from '$lib/tools/toolManager.svelte';
	import { Window } from '$lib/state/window.svelte';
	import { Stroke, StrokeSegment, QuadTree } from '$lib/state/strokes.svelte';
	import { ds } from '$lib/state/strokes.svelte';
	import Toolbar from './Toolbar.svelte';

	let svg: SVGSVGElement | null = null;
	let viewBox = $derived.by(() => {
		return `0 0 ${Window.width} ${Window.height}`;
	});
	let selectedTool = $derived(toolManager.selectedTool);
	let currentStroke = $state<Stroke>();
	let isDrawing = $state(false);
	let candidateStrokeSegments = $state<Set<StrokeSegment>>();
	let bounds = $state<Bounds[]>([]);
	let devMode = $state(true);

	const debug_onQtUpdate = () => {
		const dfs = (root: QuadTree, temp: Bounds[]) => {
			temp.push(root.bounds);
			if (root.children.length === 0) return;
			for (const child of root.children) {
				dfs(child, temp);
			}
		};
		const temp: Bounds[] = [];
		dfs(ds.qt, temp);
		bounds = temp;
	};

	onMount(() => {
		const handleResize = () => {
			if (!svg) return;
			Window.width = window.innerWidth;
			Window.height = window.innerHeight;
			// svg.setAttribute('viewBox', viewBox);
		};
		window.addEventListener('resize', handleResize);
		handleResize();
		debug_onQtUpdate();

		return () => {
			window.removeEventListener('resize', handleResize);
			window.removeEventListener('load', handleResize);
		};
	});

	const onMouseDown = (event: MouseEvent) => {
		const { clientX: x, clientY: y, button } = event;
		if (button !== 0) {
			return;
		}
		isDrawing = true;
		const eraserRadius = ds.toolSettings.eraser.radius;
		const eraserBounds = {
			x: x - eraserRadius,
			y: y - eraserRadius,
			width: 2 * eraserRadius,
			height: 2 * eraserRadius
		};
		if (toolManager.selectedTool === ToolName.Pen) {
			currentStroke = new Stroke([{ x, y }]);
		} else {
			ds.stashStrokes(eraserBounds);
		}
	};

	const onMouseMove = (event: MouseEvent) => {
		if (!isDrawing) {
			return;
		}
		const { clientX: x, clientY: y, button } = event;
		const eraserRadius = ds.toolSettings.eraser.radius;
		const eraserBounds = {
			x: x - eraserRadius,
			y: y - eraserRadius,
			width: 2 * eraserRadius,
			height: 2 * eraserRadius
		};

		if (toolManager.selectedTool === ToolName.Pen) {
			if (currentStroke) {
				currentStroke.addPoint({ x, y });
			}
		} else {
			ds.stashStrokes(eraserBounds);
		}
	};

	const onMouseUp = (event: MouseEvent) => {
		if (!isDrawing) {
			return;
		}
		isDrawing = false;
		if (toolManager.selectedTool === ToolName.Pen) {
			if (currentStroke) {
				ds.insertStroke(currentStroke);
				debug_onQtUpdate();
				currentStroke = new Stroke([]);
			}
		} else {
			candidateStrokeSegments = new Set();
		}
	};

	const onTouchStart = (event: TouchEvent) => {
		// event.preventDefault();
		// console.log(event);
		if (event.changedTouches.length > 1 || event.touches.length >= 2) {
			// console.log('more than 2 fingers');
			isDrawing = false;
			currentStroke = new Stroke([]);
			return;
		}
		const { pageX: x, pageY: y } = event.changedTouches[0];

		isDrawing = true;
		const eraserRadius = ds.toolSettings.eraser.radius;
		const eraserBounds = {
			x: x - eraserRadius,
			y: y - eraserRadius,
			width: 2 * eraserRadius,
			height: 2 * eraserRadius
		};
		if (toolManager.selectedTool === ToolName.Pen) {
			currentStroke = new Stroke([{ x, y }]);
		} else {
			ds.stashStrokes(eraserBounds);
		}
	};

	const onTouchMove = (event: TouchEvent) => {
		if (!isDrawing) {
			return;
		}
		// console.log(event);
		const { pageX: x, pageY: y } = event.changedTouches[0];
		const eraserRadius = ds.toolSettings.eraser.radius;
		const eraserBounds = {
			x: x - eraserRadius,
			y: y - eraserRadius,
			width: 2 * eraserRadius,
			height: 2 * eraserRadius
		};
		if (toolManager.selectedTool === ToolName.Pen) {
			if (currentStroke) {
				currentStroke.addPoint({ x, y });
			}
		} else {
			ds.stashStrokes(eraserBounds);
		}
	};

	const onTouchEnd = (event: TouchEvent) => {
		if (!isDrawing) {
			return;
		}
		isDrawing = false;
		if (toolManager.selectedTool === ToolName.Pen) {
			if (currentStroke) {
				ds.insertStroke(currentStroke);
				debug_onQtUpdate();
				currentStroke = new Stroke([]);
			}
		} else {
			candidateStrokeSegments = new Set();
		}
	};
</script>

<button
	onmousedown={onMouseDown}
	onmousemove={onMouseMove}
	onmouseup={onMouseUp}
	ontouchstart={onTouchStart}
	ontouchmove={onTouchMove}
	ontouchend={onTouchEnd}
	class="svg-container"
>
	<svg bind:this={svg} style="border: 1px solid #ccc;" role="img">
		{#each ds.strokes.values() as stroke}
			<path d={stroke.path} fill="black" stroke="black" />
		{/each}
		{#if currentStroke}
			<path d={currentStroke.path} fill="black" stroke="black" />
		{/if}
	</svg>
	<label class="devmode-label">
		<input type="checkbox" bind:checked={devMode} />
		<div>Developer Mode</div>
	</label>
	{#if devMode}
		{#each bounds as bound}
			<div
				class="bounds"
				style:--x={bound.x}
				style:--y={bound.y}
				style:--w={bound.width}
				style:--h={bound.height}
			></div>
		{/each}

		{#each ds.strokes.values() as stroke}
			{#each stroke.points as point}
				<div class="points" style:--x={point.x} style:--y={point.y}></div>
			{/each}
		{/each}
	{/if}
</button>

<style>
	svg {
		position: fixed;
		top: 0;
		left: 0;
		width: 100%;
		height: 100%;
		background-color: hsl(50, 100%, 92%);
	}

	.devmode-label {
		position: absolute;
		font-size: var(--text-xs);
		top: 5px;
		left: 5px;
		z-index: 5;
		display: flex;
		gap: 5px;
		padding: 5px;
		align-items: center;
	}

	button.svg-container {
		touch-action: none;
	}
	div.bounds {
		position: absolute;
		top: calc(var(--y) * 1px);
		left: calc(var(--x) * 1px);
		width: calc(var(--w) * 1px);
		height: calc(var(--h) * 1px);
		border: 1px solid black;
		/* z-index: 100; */
	}

	div.points {
		position: absolute;
		top: calc(var(--y) * 1px);
		left: calc(var(--x) * 1px);
		width: 5px;
		height: 5px;
		border-radius: 50%;
		background-color: red;
		border: 1px solid red;
		/* z-index: 100; */
	}
</style>
