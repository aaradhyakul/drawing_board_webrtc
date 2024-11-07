interface Theme {
	bgColor: string;
	fgColor: string;
}
export const theme = $state<Theme>({ bgColor: 'hsl(50, 0%, 80%)', fgColor: 'hsl(0, 0%, 80%)' });
