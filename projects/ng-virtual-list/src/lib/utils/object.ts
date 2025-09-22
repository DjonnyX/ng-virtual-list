export const objectAsReadonly = <T = { [x: string]: any }>(source: T) => {
    if (!source) {
        return source;
    }

    const result = {} as T;
    for (const prop in source) {
        const value = source[prop];
        Object.defineProperty(result, prop, {
            value,
            writable: false,
            enumerable: true,
        });
    }

    return result;
};

export const copyValueAsReadonly = <T = any>(source: T) => {
    if (!source) {
        return source;
    }

    if (Array.isArray(source)) {
        return Object.freeze([...source]) as unknown as T;
    }

    if (typeof source === 'object') {
        return objectAsReadonly(source);
    }

    return source;
}