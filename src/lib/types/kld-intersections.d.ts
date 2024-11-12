declare module 'kld-intersections' {
	export class Point2D {
		constructor(x: number, y: number);
		x: number;
		y: number;
	}

	export class Intersection {
		static intersect(shape1: any, shape2: any): IntersectionResult;
		static intersectShapes(shape1: any, shape2: any): IntersectionResult;
		static intersectLineLine(
			a1: Point2D,
			a2: Point2D,
			b1: Point2D,
			b2: Point2D
		): IntersectionResult;
		static intersectLineCircle(a1: Point2D, a2: Point2D, c: Point2D, r: number): IntersectionResult;
		static intersectCircleCircle(
			c1: Point2D,
			r1: number,
			c2: Point2D,
			r2: number
		): IntersectionResult;
	}

	export class IntersectionResult {
		status: string;
		points: Point2D[];
	}

	export class ShapeInfo {
		static line(p1: Point2D, p2: Point2D): any;
		static circle(center: Point2D, radius: number): any;
		static circle(x: number, y: number, radius: number): any;
		static rectangle(x: number, y: number, width: number, height: number): any;
		static polygon(points: Point2D[]): any;
		static path(path: string): any;
	}
}
