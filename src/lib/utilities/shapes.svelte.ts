export const ellipse = ({ ctx, x, y, radius }) => {
	ctx.beginPath();
	ctx.arc(x, y, radius, 0, 2 * Math.PI);
	ctx.closePath();
	ctx.stroke();
	ctx.fill();
};

export const rect = ({ ctx, x, y, w, h }) => {
	ctx.beginPath();
	ctx.rect(x, y, w, h);
	ctx.closePath();
	ctx.stroke();
	ctx.fill();
};
