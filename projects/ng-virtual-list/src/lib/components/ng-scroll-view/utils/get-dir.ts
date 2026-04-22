export const getDir = (p: number, c: number) => {
    return p < c ? 1 : p > c ? -1 : 0;
}