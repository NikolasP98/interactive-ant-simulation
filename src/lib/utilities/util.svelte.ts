export const sleep = (ms) => {
	return new Promise((resolve) => setTimeout(resolve, ms));
};

export const getRandom = (min, max) => {
	return Math.random() * (max - min) + min; //The maximum is exclusive and the minimum is inclusive
};
