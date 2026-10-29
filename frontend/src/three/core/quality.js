

const small = innerWidth < 700 || (navigator.hardwareConcurrency || 8) <= 4;
const dpr = Math.min(devicePixelRatio || 1, small ? 1.5 : 1.75);

export { dpr, small };
