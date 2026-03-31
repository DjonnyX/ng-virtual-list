export const calculateDirection = (buffer: Array<[number, number]>) => {
    for (let i = buffer.length - 1, l = 0; i >= l; i--) {
        const v = buffer[i];
        if (v[0] === 0) {
            continue;
        }
        return Math.sign(v[0]);
    }
    return 1;
};
