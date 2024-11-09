export const getSvgPathFromStroke = (points: number[][]) => {
	if (!points.length) return '';
	const d = points.reduce((acc, [x0, y0], i, arr) => {
		if ((i + 1) % arr.length === 0) return acc;
		const [x1, y1] = arr[i + 1];
		if (i === 0) {
			return `M ${x0} ${y0}`;
		} else {
			return `${acc} L ${x1} ${y1}`;
		}
	}, '');
	return d + 'Z';
};
