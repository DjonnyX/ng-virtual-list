const isUndefinable = <T = any>(value: T) => {
    return value === undefined;
}

const isNullable = <T = any>(value: T) => {
    return value === null;
}

/**
 * Int validator
 * @param value Int
 */
export const validateInt = (value: number | undefined, undefinable = false) => {
    return (undefinable && isUndefinable(value)) || !Number.isNaN(Number.parseInt(`${value}`));
};

/**
 * Float validator
 * @param value Float
 */
export const validateFloat = (value: number | undefined, undefinable = false) => {
    return (undefinable && isUndefinable(value)) || !Number.isNaN(Number.parseFloat(`${value}`));
};

/**
 * String validator
 * @param value String
 */
export const validateString = (value: string | undefined | null, undefinable = false, nullable = false) => {
    return (undefinable && isUndefinable(value)) || (nullable && isNullable(value)) || typeof value === 'string';
};

/**
 * Boolean validator
 * @param value Boolean
 */
export const validateBoolean = (value: boolean | undefined, undefinable = false) => {
    return (undefinable && isUndefinable(value)) || typeof value === 'boolean';
};

/**
 * Array validator
 * @param value Array
 */
export const validateArray = <T = any>(value: Array<T> | undefined | null, undefinable = false, nullable = false) => {
    return (undefinable && isUndefinable(value)) || (nullable && isNullable(value)) || Array.isArray(value);
};

/**
 * Object validator
 * @param value Object
 */
export const validateObject = <T = any>(value: Object & T | undefined | null, undefinable = false, nullable = false) => {
    return (undefinable && isUndefinable(value)) || (nullable && isNullable(value)) || typeof value === 'object';
};

/**
 * Function validator
 * @param value Function
 */
export const validateFunction = <T = any>(value: Object & T | undefined | null, undefinable = false, nullable = false) => {
    return (undefinable && isUndefinable(value)) || (nullable && isNullable(value)) || typeof value === 'function';
};
