import { getSvgPathFromStroke } from '$lib/utils/getSvgPathFromStroke';
import { ShapeInfo, Intersection } from 'kld-intersections';
import { getStrokeOutlinePoints, getStroke } from 'perfect-freehand';

type Bounds = {
	x: number;
	y: number;
	width: number;
	height: number;
};

type Point = {
	x: number;
	y: number;
	pressure?: number;
};

class Stroke {
	static #idCounter = 0;
	#id: Symbol;
	points: Point[];
	segments: StrokeSegment[];
	constructor(points: Point[], segmentSize: number = 50) {
		this.points = points;
		this.segments = this.segmentizeStroke(segmentSize);
		this.#id = Symbol.for(`stroke-${Stroke.#idCounter++}`);
	}

	segmentizeStroke(segmentSize: number) {
		const segments: StrokeSegment[] = [];
		let minX = Infinity;
		let minY = Infinity;
		let maxX = -Infinity;
		let maxY = -Infinity;
		let currentSegmentWidth = 0;
		let currentSegmentHeight = 0;

		for (let i = 0; i < this.points.length; i++) {
			const point = this.points[i];
			minX = Math.min(minX, point.x);
			minY = Math.min(minY, point.y);
			maxX = Math.max(maxX, point.x);
			maxY = Math.max(maxY, point.y);
			currentSegmentWidth = maxX - minX;
			currentSegmentHeight = maxY - minY;

			if (currentSegmentWidth > segmentSize || currentSegmentHeight > segmentSize) {
				segments.push(new StrokeSegment(this.points.splice(0, i), this.#id));
				minX = point.x;
				minY = point.y;
				maxX = point.x;
				maxY = point.y;
				currentSegmentWidth = 0;
				currentSegmentHeight = 0;
			}
		}
		return segments;
	}
}

class StrokeSegment {
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

class QuadTree {
	bounds: Bounds;
	maxStrokeSegments: number;
	numStrokeSegments: number;
	maxLevels: number;
	level: number;
	strokes: Map<Symbol, StrokeSegment[]>;
	nodes: QuadTree[];

	constructor(
		bounds: Bounds,
		maxStrokeSegments: number = 10,
		maxLevels: number = 4,
		level: number = 0
	) {
		this.bounds = bounds;
		this.maxStrokeSegments = maxStrokeSegments;
		this.maxLevels = maxLevels;
		this.strokes = new Map();
		this.numStrokeSegments = 0;
		this.level = level;
		this.nodes = [];
	}

	//returns the different candidate strokeSegments
	retrieve(bounds: Bounds) {
		let candidateStrokeSegments: StrokeSegment[] = [];
		if (this.nodes.length) {
			const boundsIndex = this.getIndex(bounds);
			if (boundsIndex !== -1) {
				candidateStrokeSegments = this.nodes[boundsIndex].retrieve(bounds);
			}
		} else {
			for (const strokeSegments of this.strokes.values()) {
				if (strokeSegments.length) {
					candidateStrokeSegments.concat(strokeSegments);
				}
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
		const candidateStrokeSegments = this.retrieve(eraserBounds);
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
		for (const node of this.nodes) {
			node.delete(strokeId);
		}
		this.strokes.delete(strokeId);
	}

	split() {
		const nextLevel = this.level + 1;
		const subWidth = this.bounds.width / 2;
		const subHeight = this.bounds.height / 2;
		const x = this.bounds.x;
		const y = this.bounds.y;
		this.nodes[0] = new QuadTree(
			{ x: x, y: y + subHeight, width: subWidth, height: subHeight },
			this.maxStrokeSegments,
			this.maxLevels,
			nextLevel
		);
		this.nodes[1] = new QuadTree(
			{ x: x + subWidth, y: y + subHeight, width: subWidth, height: subHeight },
			this.maxStrokeSegments,
			this.maxLevels,
			nextLevel
		);
		this.nodes[2] = new QuadTree(
			{ x: x, y: y, width: subWidth, height: subHeight },
			this.maxStrokeSegments,
			this.maxLevels,
			nextLevel
		);
		this.nodes[3] = new QuadTree(
			{ x: x + subWidth, y: y, width: subWidth, height: subHeight },
			this.maxStrokeSegments,
			this.maxLevels,
			nextLevel
		);
	}

	insertStroke(stroke: Stroke) {
		for (const segment of stroke.segments) {
			this.insertStrokeSegment(segment);
		}
	}

	insertStrokeSegment(strokeSegment: StrokeSegment) {
		if (this.nodes.length) {
			const index = this.getIndex(strokeSegment.bounds);
			if (index !== -1) {
				this.nodes[index].insertStrokeSegment(strokeSegment);
				return;
			}
		}
		if (!this.strokes.has(strokeSegment.parentStrokeId)) {
			this.strokes.set(strokeSegment.parentStrokeId, []);
		}
		this.strokes.get(strokeSegment.parentStrokeId)?.push(strokeSegment);
		this.numStrokeSegments++;
		if (this.numStrokeSegments > this.maxStrokeSegments && this.level < this.maxLevels) {
			if (!this.nodes.length) {
				this.split();
			}
			const remainingObjects: StrokeSegment[] = [];
			for (const segment of this.strokes.get(strokeSegment.parentStrokeId)!) {
				const index = this.getIndex(segment.bounds);
				if (index !== -1) {
					this.nodes[index].insertStrokeSegment(segment);
				} else {
					remainingObjects.push(segment);
				}
			}
			this.strokes.set(strokeSegment.parentStrokeId, remainingObjects);
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

export { QuadTree, Stroke, StrokeSegment };
