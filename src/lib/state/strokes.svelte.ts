import { Window } from '$lib/state/window.svelte';
// import { KeyedSet } from '$lib/utils/keyedSet';
import { getSvgPathFromStroke } from '$lib/utils/getSvgPathFromStroke';
import { ShapeInfo, Intersection } from 'kld-intersections';
import { getStrokeOutlinePoints, getStroke } from 'perfect-freehand';
import { SvelteMap } from 'svelte/reactivity';

class QuadTreeRoot {
	quadTree: QuadTree;

	constructor() {
		this.quadTree = new QuadTree(
			{
				x: -Infinity,
				y: -Infinity,
				width: Infinity,
				height: Infinity
			},
			0
		);
	}
}
class QuadTree {
	bounds: Bounds;
	static maxStrokeSegments: number = 10;
	static maxLevels: number = 4;
	numStrokeSegments: number = 0;
	level: number;
	strokeSegmentsMap: Map<Symbol, StrokeSegment[]> = new Map();
	children: QuadTree[] = [];

	constructor(bounds: Bounds, level: number = 0) {
		this.bounds = bounds;
		this.level = level;
	}

	//returns the different candidate strokeSegments
	getCandidateStrokeSegments(bounds: Bounds) {
		let candidateStrokeSegments: StrokeSegment[] = [];
		if (this.children.length) {
			const boundsIndex = this.getIndex(bounds);
			if (boundsIndex !== -1) {
				candidateStrokeSegments = this.children[boundsIndex].getCandidateStrokeSegments(bounds);
			}
		} else {
			for (const strokeSegments of this.strokeSegmentsMap.values()) {
				candidateStrokeSegments.concat(strokeSegments);
			}
		}
		return candidateStrokeSegments;
	}

	eraseStrokes(eraserX: number, eraserY: number, eraserRadius: number) {
		const eraserBounds = {
			x: eraserX - eraserRadius,
			y: eraserY - eraserRadius,
			width: eraserRadius * 2,
			height: eraserRadius * 2
		};
		const candidateStrokeSegments = this.getCandidateStrokeSegments(eraserBounds);
		const strokesToErase = new Set<Symbol>();
		for (const strokeSegment of candidateStrokeSegments) {
			if (strokesToErase.has(strokeSegment.parentStrokeId)) {
				continue;
			}
			const eraserCircle = ShapeInfo.circle({ x: eraserX, y: eraserY }, eraserRadius);
			const candidateStrokePath = ShapeInfo.path(
				getSvgPathFromStroke(getStroke(strokeSegment.points))
			);
			const result = Intersection.intersect(eraserCircle, candidateStrokePath);
			if (result.points.length) {
				strokesToErase.add(strokeSegment.parentStrokeId);
			}
		}
		for (const strokeId of strokesToErase) {
			this.delete(strokeId);
		}
	}

	delete(strokeId: Symbol) {
		for (const node of this.children) {
			node.delete(strokeId);
		}
		this.strokeSegmentsMap.delete(strokeId);
	}

	split() {
		const nextLevel = this.level + 1;
		const subWidth = this.bounds.width / 2;
		const subHeight = this.bounds.height / 2;
		const x = this.bounds.x;
		const y = this.bounds.y;
		this.children[0] = new QuadTree(
			{ x: x, y: y + subHeight, width: subWidth, height: subHeight },
			nextLevel
		);
		this.children[1] = new QuadTree(
			{ x: x + subWidth, y: y + subHeight, width: subWidth, height: subHeight },
			nextLevel
		);
		this.children[2] = new QuadTree({ x: x, y: y, width: subWidth, height: subHeight }, nextLevel);
		this.children[3] = new QuadTree(
			{ x: x + subWidth, y: y, width: subWidth, height: subHeight },
			nextLevel
		);
	}

	insertStroke(stroke: Stroke) {
		for (const segment of stroke.segments) {
			this.insertStrokeSegment(segment);
		}
	}

	insertStrokeSegment(strokeSegment: StrokeSegment) {
		if (this.children.length) {
			const index = this.getIndex(strokeSegment.bounds);
			if (index !== -1) {
				this.children[index].insertStrokeSegment(strokeSegment);
				return;
			}
		}
		if (!this.strokeSegmentsMap.has(strokeSegment.parentStrokeId)) {
			this.strokeSegmentsMap.set(strokeSegment.parentStrokeId, []);
		}
		this.strokeSegmentsMap.get(strokeSegment.parentStrokeId)?.push(strokeSegment);
		this.numStrokeSegments++;
		if (this.numStrokeSegments > QuadTree.maxStrokeSegments && this.level < QuadTree.maxLevels) {
			if (!this.children.length) {
				this.split();
			}
			const remainingObjects: StrokeSegment[] = [];
			for (const segment of this.strokeSegmentsMap.get(strokeSegment.parentStrokeId)!) {
				const index = this.getIndex(segment.bounds);
				if (index !== -1) {
					this.children[index].insertStrokeSegment(segment);
				} else {
					remainingObjects.push(segment);
				}
			}
			this.strokeSegmentsMap.set(strokeSegment.parentStrokeId, remainingObjects);
		}
	}

	getIndex(bounds: Bounds) {
		const verticalMidpoint = this.bounds.x + this.bounds.width / 2;
		const horizontalMidpoint = this.bounds.y + this.bounds.height / 2;
		const inBottomHalf = bounds.y > verticalMidpoint;
		const inLeftHalf = bounds.x + bounds.width < horizontalMidpoint;
		const inRightHalf = bounds.x > horizontalMidpoint;
		const inTopHalf = bounds.y + bounds.height < verticalMidpoint;

		if (inTopHalf) {
			if (inLeftHalf) {
				return 2;
			}
			if (inRightHalf) {
				return 3;
			}
		}
		if (inBottomHalf) {
			if (inLeftHalf) {
				return 0;
			}
			if (inRightHalf) {
				return 1;
			}
		}
		return -1;
	}
}

export class Stroke {
	static idCounter = 0;
	static segmentSize = 50;
	id: Symbol;
	points: Point[];
	path?: string = $state('');
	segments: StrokeSegment[] = [];
	constructor(points: Point[]) {
		this.points = points;
		// this.segments = this.segmentizeStroke(Stroke.segmentSize);
		this.id = Symbol(`stroke-${Stroke.idCounter++}`);
	}

	generatePath() {
		this.path = getSvgPathFromStroke(getStroke(this.points));
	}

	segmentizeStroke() {
		const segments: StrokeSegment[] = [];
		let minX = Infinity;
		let minY = Infinity;
		let maxX = -Infinity;
		let maxY = -Infinity;
		let currentSegmentWidth = 0;
		let currentSegmentHeight = 0;

		for (let i = 0, removeCnt = 1; i < this.points.length; i++, removeCnt++) {
			const point = this.points[i];
			minX = Math.min(minX, point.x);
			minY = Math.min(minY, point.y);
			maxX = Math.max(maxX, point.x);
			maxY = Math.max(maxY, point.y);
			currentSegmentWidth = maxX - minX;
			currentSegmentHeight = maxY - minY;

			if (currentSegmentWidth > Stroke.segmentSize || currentSegmentHeight > Stroke.segmentSize) {
				segments.push(new StrokeSegment(this.points.splice(0, removeCnt), this.id));
				minX = Infinity;
				minY = Infinity;
				maxX = -Infinity;
				maxY = -Infinity;
				currentSegmentWidth = 0;
				currentSegmentHeight = 0;
				removeCnt = 1;
			}
		}
		if (segments.length === 0) {
			segments.push(new StrokeSegment(this.points, this.id));
		}
		this.segments = segments;
	}
}

export class StrokeSegment {
	points: Point[];
	parentStrokeId: Symbol;
	bounds: Bounds;

	constructor(points: Point[], parentStrokeId: Symbol) {
		this.points = points;
		this.parentStrokeId = parentStrokeId;
		this.bounds = this.calculateBounds();
	}

	calculateBounds() {
		let minX = Infinity;
		let minY = Infinity;
		let maxX = -Infinity;
		let maxY = -Infinity;
		this.points.map(({ x, y }) => {
			minX = Math.min(minX, x);
			minY = Math.min(minY, y);
			maxX = Math.max(maxX, x);
			maxY = Math.max(maxY, y);
		});
		return { x: minX, y: minY, width: maxX - minX, height: maxY - minY };
	}
}

export class KeyedSet<T> {
	#keyProp: keyof T;
	items: SvelteMap<T[keyof T], T> = new SvelteMap();

	constructor(keyProp: keyof T) {
		this.#keyProp = keyProp;
	}

	set(item: T) {
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

// export class Strokes {
// 	#quadTree = $derived.by(
// 		() => new QuadTree({ x: 0, y: 0, width: Window.width, height: Window.height })
// 	);
// }

// export strokes: KeyedSet<Stroke>('id') = $state(new KeyedSet('id'));
// export const strokes: KeyedSet<Stroke> = $state(new KeyedSet('id'));
export const strokes: KeyedSet<Stroke> = new KeyedSet('id');
export const qt = $state.raw(new QuadTreeRoot());
