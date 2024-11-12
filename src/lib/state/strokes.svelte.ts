import { getSvgPathFromStroke } from '$lib/utils/getSvgPathFromStroke';
import { ShapeInfo, Intersection } from 'kld-intersections';
import { KeyedSet } from '$lib/utils/keyedSet.svelte';
import { getStroke } from 'perfect-freehand';
import { Window } from './window.svelte';

export class QuadTree {
	static MAX: number = 1e3;
	static MIN: number = -1e3;
	bounds: Bounds = $state({ x: 0, y: 0, width: QuadTree.MAX, height: QuadTree.MAX / 2 });
	static maxStrokeSegments: number = 2;
	static maxLevels: number = 6;
	numStrokeSegments: number = 0;
	level: number;
	strokeSegmentsMap: Map<Symbol, StrokeSegment[]> = new Map();
	children: QuadTree[] = [];

	constructor(bounds: Bounds, level: number = 0) {
		this.bounds = bounds;
		this.level = level;
	}

	debug() {
		console.dir(this, { depth: null });
	}

	//returns the different candidate strokeSegments
	getCandidateStrokeSegments(bounds: Bounds) {
		let candidateStrokeSegments: StrokeSegment[] = [];
		this.strokeSegmentsMap.forEach((segments) => {
			candidateStrokeSegments = candidateStrokeSegments.concat(segments);
		});
		if (this.children.length) {
			const boundsIndex = this.getIndex(bounds);
			if (boundsIndex !== -1) {
				candidateStrokeSegments = candidateStrokeSegments.concat(
					this.children[boundsIndex].getCandidateStrokeSegments(bounds)
				);
			} else {
				this.children.forEach((child) => {
					candidateStrokeSegments = candidateStrokeSegments.concat(
						child.getCandidateStrokeSegments(bounds)
					);
				});
			}
		}
		// candidateStrokeSegments = candidateStrokeSegments.filter((segment) => {
		// 	return !(
		// 		segment.bounds.x + segment.bounds.width < bounds.x || // segment is left of bounds
		// 		segment.bounds.x > bounds.x + bounds.width || // segment is right of bounds
		// 		segment.bounds.y + segment.bounds.height < bounds.y || // segment is above bounds
		// 		segment.bounds.y > bounds.y + bounds.height
		// 	); // segment is below bounds
		// });
		return candidateStrokeSegments;
	}

	delete(strokeId: Symbol) {
		for (const node of this.children) {
			node.delete(strokeId);
		}
		this.numStrokeSegments -= this.strokeSegmentsMap.get(strokeId)?.length || 0;
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
		stroke.segmentizeStroke();
		for (const segment of stroke.segments) {
			this.insertStrokeSegment(segment);
		}
	}

	insertStrokeSegment(strokeSegment: StrokeSegment) {
		// debugger;
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
			this.strokeSegmentsMap.forEach((segments, id) => {
				this.numStrokeSegments = 0;
				const remainingObjects: StrokeSegment[] = [];
				segments.forEach((segment) => {
					const index = this.getIndex(segment.bounds);
					if (index !== -1) {
						this.children[index].insertStrokeSegment(segment);
					} else {
						remainingObjects.push(segment);
					}
				});
				this.strokeSegmentsMap.set(id, remainingObjects);
				this.numStrokeSegments += remainingObjects.length;
			});
		}
	}

	getIndex(bounds: Bounds) {
		const { x, y, width, height } = this.bounds;
		const hmid = x + width / 2;
		const vmid = y + height / 2;
		if (bounds.x > hmid) {
			if (bounds.y > vmid) {
				return 1;
			} else if (bounds.y + bounds.height < vmid) {
				return 3;
			}
		} else if (bounds.x + bounds.width < hmid) {
			if (bounds.y > vmid) {
				return 0;
			} else if (bounds.y + bounds.height < vmid) {
				return 2;
			}
		}
		return -1;
	}
}

export class Stroke {
	static idCounter = 0;
	static segmentSize = 50;
	id: Symbol;
	#points: Point[];
	path?: string = $state('');
	segments: StrokeSegment[] = [];
	constructor(points: Point[]) {
		this.#points = points;
		this.id = Symbol(`stroke-${Stroke.idCounter++}`);
	}

	addPoint(point: Point) {
		this.#points.push(point);
		this.generatePath();
	}

	get points() {
		return this.#points;
	}

	generatePath() {
		this.path = getSvgPathFromStroke(
			getStroke(this.#points, {
				size: 2,
				thinning: 0.5,
				smoothing: 0.5
			})
		);
	}

	segmentizeStroke() {
		const segments: StrokeSegment[] = [];
		let minX = Infinity;
		let minY = Infinity;
		let maxX = -Infinity;
		let maxY = -Infinity;
		let currentSegmentWidth = 0;
		let currentSegmentHeight = 0;

		let j = 0;
		for (let i = 0, removeCnt = 0; i < this.#points.length; i++, removeCnt++) {
			const point = this.#points[i];
			minX = Math.min(minX, point.x);
			minY = Math.min(minY, point.y);
			maxX = Math.max(maxX, point.x);
			maxY = Math.max(maxY, point.y);
			currentSegmentWidth = maxX - minX;
			currentSegmentHeight = maxY - minY;

			if (currentSegmentWidth > Stroke.segmentSize || currentSegmentHeight > Stroke.segmentSize) {
				segments.push(new StrokeSegment(this.#points.slice(j, j + removeCnt), this.id));
				minX = Infinity;
				minY = Infinity;
				maxX = -Infinity;
				maxY = -Infinity;
				currentSegmentWidth = 0;
				currentSegmentHeight = 0;
				removeCnt = 0;
				j = i;
			}
		}

		if (segments.length === 0) {
			segments.push(new StrokeSegment(this.#points, this.id));
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

type eraserSettings = {
	radius: number;
	color?: string;
};

type penSettings = {
	size: number;
	thinning: number;
	smoothing: number;
};

class ToolSettings {
	eraser: eraserSettings = {
		radius: 2
	};
	pen: penSettings = {
		size: 2,
		thinning: 0.5,
		smoothing: 0.5
	};
}
class State {
	strokes: KeyedSet<Stroke> = new KeyedSet('id');
	stashedStrokes: KeyedSet<Stroke> = new KeyedSet('id');
	qt = $state.raw(
		new QuadTree(
			{
				x: 0,
				y: 0,
				width: QuadTree.MAX,
				height: QuadTree.MAX / 2
			},
			0
		)
	);
	stashsedStrokes: Stroke[] = [];
	toolSettings = new ToolSettings();

	stashStrokes(bounds: Bounds): boolean {
		debugger;
		const { radius: eraserRadius } = this.toolSettings.eraser;
		const eraserX = bounds.x + eraserRadius;
		const eraserY = bounds.y + eraserRadius;
		const strokesToStash = new Set();
		const candidateStrokeSegments = this.qt.getCandidateStrokeSegments(bounds);
		for (const segment of candidateStrokeSegments) {
			if (strokesToStash.has(segment.parentStrokeId)) {
				continue;
			}
			const eraserCircle = ShapeInfo.circle(eraserX, eraserY, eraserRadius);
			const candidateStrokePath = ShapeInfo.path(
				this.strokes.get(segment.parentStrokeId)?.path || ''
			);
			// const candidateStrokePath = ShapeInfo.path(
			// 	getSvgPathFromStroke(
			// 		getStroke(this.strokes.get(segment.parentStrokeId)?.points || [], this.toolSettings.pen)
			// 	)
			// );

			const result = Intersection.intersect(eraserCircle, candidateStrokePath);
			if (result.status === 'Intersection') {
				strokesToStash.add(segment.parentStrokeId);
				this.stashedStrokes.set(this.strokes.get(segment.parentStrokeId));
				this.strokes.delete(segment.parentStrokeId);
				this.qt.delete(segment.parentStrokeId);
			}
		}
		return strokesToStash.size > 0;
	}

	insertStroke(stroke: Stroke) {
		this.qt.insertStroke(stroke);
		this.strokes.set(stroke);
	}
}

export const ds = $state(new State());
