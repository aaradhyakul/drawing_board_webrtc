<script lang="ts">
	import { onMount } from 'svelte';
	import { toolManager, ToolName } from '$lib/tools/toolManager.svelte';
	import { Window } from '$lib/state/window.svelte';
	import { strokes, qt, Stroke, StrokeSegment, QuadTree } from '$lib/state/strokes.svelte';
	import { ShapeInfo, Intersection } from 'kld-intersections';
	import { getSvgPathFromStroke } from '$lib/utils/getSvgPathFromStroke';
	import { getStroke } from 'perfect-freehand';
	import Toolbar from './Toolbar.svelte';

	let svg: SVGSVGElement | null = null;
	let viewBox = $derived.by(() => {
		return `0 0 ${Window.width} ${Window.height}`;
	});
	let backgroundColor = $state('#fff');
	let selectedTool = $derived(toolManager.selectedTool);
	let currentStroke = $state<Stroke>();
	let eraserBounds = $state<Bounds>();
	let isDrawing = $state(false);
	let candidateStrokeSegments = $state<Set<StrokeSegment>>();
	let bounds = $state<Bounds[]>([]);

	const debug_onQtUpdate = () => {
		const dfs = (root: QuadTree, temp: Bounds[]) => {
			temp.push(root.bounds);
			if (root.children.length === 0) return;
			for (const child of root.children) {
				dfs(child, temp);
			}
		};
		const temp: Bounds[] = [];
		dfs(qt, temp);
		bounds = temp;
		// console.dir(qt, { depth: null });
	};

	onMount(() => {
		const handleResize = () => {
			if (!svg) return;
			Window.width = window.innerWidth;
			Window.height = window.innerHeight;
			svg.setAttribute('viewBox', viewBox);
		};
		window.addEventListener('resize', handleResize);
		handleResize();
		debug_onQtUpdate();

		return () => {
			window.removeEventListener('resize', handleResize);
			window.removeEventListener('load', handleResize);
		};
	});

	const onPointerDown = (event: MouseEvent) => {
		// console.log("onPointerDown")
		const { clientX: x, clientY: y, button } = event;
		if (button !== 0) {
			return;
		}
		isDrawing = true;
		eraserBounds = { x: x - 25, y: y - 25, width: 50, height: 50 };
		if (toolManager.selectedTool === ToolName.Pen) {
			currentStroke = new Stroke([{ x, y }]);
		} else {
			candidateStrokeSegments = new Set(qt.getCandidateStrokeSegments(eraserBounds));
		}
	};
	// $effect(() => {
	// 	$inspect(candidateStrokeSegments)
	// })

	const onPointerMove = (event: MouseEvent) => {
		// console.log("onPointerMove")
		if (!isDrawing) {
			return;
		}
		const { clientX: x, clientY: y, button } = event;
		if (toolManager.selectedTool === ToolName.Pen) {
			if (currentStroke) {
				currentStroke?.points.push({ x, y });
				currentStroke.generatePath();
			}
		} else {
			eraserBounds = { x: x - 25, y: y - 25, width: 50, height: 50 };
			// candidateStrokeSegments = candidateStrokeSegments?.concat(qt.getCandidateStrokeSegments(eraserBounds))
			const strokesToErase = new Set();
			for (const segment of qt.getCandidateStrokeSegments(eraserBounds)) {
				if (strokesToErase.has(segment.parentStrokeId)) {
					continue;
				}
				// candidateStrokeSegments?.add(segment);
				const eraserCircle = ShapeInfo.circle({ x, y }, 10);
				const candidateStrokePath = ShapeInfo.path(
					getSvgPathFromStroke(
						getStroke(strokes.get(segment.parentStrokeId)?.points || [], {
							size: 2,
							thinning: 0.5,
							smoothing: 0.5
						})
					)
				);

				const result = Intersection.intersect(eraserCircle, candidateStrokePath);
				if (result.status === 'Intersection') {
					strokesToErase.add(segment.parentStrokeId);
					strokes.delete(segment.parentStrokeId);
					qt.delete(segment.parentStrokeId);
					console.log(result);
				}
			}
		}
		// console.log(currentStroke?.path)
	};

	const onPointerUp = (event: MouseEvent) => {
		// console.log("onPointerUp")
		if (!isDrawing) {
			return;
		}
		isDrawing = false;
		if (toolManager.selectedTool === ToolName.Pen) {
			if (currentStroke) {
				currentStroke.segmentizeStroke();
				qt.insertStroke(currentStroke);
				debug_onQtUpdate();
				strokes.set(currentStroke);
				currentStroke = new Stroke([]);
				// console.log(currentStroke)
			}
		} else {
			// $inspect(candidateStrokeSegments)
			// console.log($state.snapshot(candidateStrokeSegments));
			console.log(candidateStrokeSegments);
			// candidateStrokeSegments?.forEach((stroke) => {
			// 	strokes.delete(stroke.parentStrokeId);
			// 	qt.delete(stroke.parentStrokeId);
			// });

			candidateStrokeSegments = new Set();
		}
		// console.log(strokes);
	};
</script>

<button onmousedown={onPointerDown} onmousemove={onPointerMove} onmouseup={onPointerUp}>
	<svg bind:this={svg} style="border: 1px solid #ccc;">
		{#each strokes.values() as stroke}
			<path d={stroke.path} fill="black" stroke="black" />
		{/each}
		{#if currentStroke}
			<path d={currentStroke.path} fill="black" stroke="black" />
		{/if}
	</svg>
	{#each bounds as bound}
		<div
			style:--x={bound.x}
			style:--y={bound.y}
			style:--w={bound.width}
			style:--h={bound.height}
		></div>
	{/each}
</button>

<style>
	svg {
		width: 100vw;
		height: 100vh;
		background-color: hsl(50, 100%, 92%);
	}
	div {
		position: absolute;
		top: calc(var(--y) * 1px);
		left: calc(var(--x) * 1px);
		width: calc(var(--w) * 1px);
		height: calc(var(--h) * 1px);
		border: 1px solid black;
		/* z-index: 100; */
	}
</style>
