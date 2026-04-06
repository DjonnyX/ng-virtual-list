export const circlePath = (cx: number, cy: number, r: number) => {
    return `M ${cx} ${cy} m -${r}, 0 a ${r},${r} 0 1,1 ${(r * 2)},0 a ${r},${r} 0 1,1 -${(r * 2)},0`;
};
