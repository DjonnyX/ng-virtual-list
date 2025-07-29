const DEFAULT_EXTRA = {
    extremumThreshold: 2,
    bufferSize: 10,
};

export interface IExtraOptions {
    extremumThreshold?: number;
    bufferSize?: number;
}

export const bufferInterpolation = (currentBufferValue: number, array: Array<number>, value: number, extra?: IExtraOptions) => {
    const {
        extremumThreshold = DEFAULT_EXTRA.extremumThreshold,
        bufferSize = DEFAULT_EXTRA.bufferSize,
    } = extra ?? DEFAULT_EXTRA;

    if (currentBufferValue < value) {
        let i = 0;
        while (i < extremumThreshold) {
            array.push(value);
            i++;
        }
    } else {
        array.push(value);
    }

    while (array.length >= bufferSize) {
        array.shift();
    }

    const l = array.length;
    let buffer = 0;

    for (let i = 0; i < l; i++) {
        buffer += array[i];
    }

    return Math.ceil(buffer / l);
};
