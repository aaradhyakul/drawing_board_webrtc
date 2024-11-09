declare global {
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
}

export {};
