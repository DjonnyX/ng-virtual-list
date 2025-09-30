import { validateInt, validateFloat, validateBoolean, validateString, validateObject, validateArray, validateFunction } from './validation';

describe('validateInt', () => {
    it('should wor correctly', () => {
        const isValid = validateInt(2),
            isInvalidTenString = validateInt('10' as unknown as number),
            isInvalidString = validateInt('text' as unknown as number),
            isValidUndefined = validateInt(undefined, true),
            isValidNull = validateObject(undefined, true);
        expect(isValid).toBeTruthy();
        expect(isValidUndefined).toBeTruthy();
        expect(isValidNull).toBeTruthy();
        expect(isInvalidTenString).toBeTruthy();
        expect(isInvalidString).toBeFalsy();
    });
});

describe('validateFloat', () => {
    it('should wor correctly', () => {
        const isValid = validateFloat(2.666),
            isInvalidTenString = validateFloat('10.576' as unknown as number),
            isInvalidString = validateFloat('text' as unknown as number),
            isValidUndefined = validateFloat(undefined, true),
            isValidNull = validateObject(undefined, true);
        expect(isValid).toBeTruthy();
        expect(isValidUndefined).toBeTruthy();
        expect(isValidNull).toBeTruthy();
        expect(isInvalidTenString).toBeTruthy();
        expect(isInvalidString).toBeFalsy();
    });
});

describe('validateBoolean', () => {
    it('should wor correctly', () => {
        const isValid = validateBoolean(false),
            isInvalidString = validateFloat('true' as unknown as number),
            isValidUndefined = validateFloat(undefined, true),
            isValidNull = validateObject(undefined, true);
        expect(isValid).toBeTruthy();
        expect(isValidUndefined).toBeTruthy();
        expect(isValidNull).toBeTruthy();
        expect(isInvalidString).toBeFalsy();
    });
});

describe('validateString', () => {
    it('should wor correctly', () => {
        const isValid = validateString('text'),
            isInvalidNumber = validateString(56 as unknown as string),
            isValidUndefined = validateString(undefined, true),
            isValidNull = validateObject(undefined, true);
        expect(isValid).toBeTruthy();
        expect(isValidUndefined).toBeTruthy();
        expect(isValidNull).toBeTruthy();
        expect(isInvalidNumber).toBeFalsy();
    });
});

describe('validateObject', () => {
    it('should wor correctly', () => {
        const isValid = validateObject({ 1: true }),
            isInvalidString = validateObject('text' as unknown as any),
            isValidUndefined = validateObject(undefined, true),
            isValidNull = validateObject(undefined, true);
        expect(isValid).toBeTruthy();
        expect(isValidUndefined).toBeTruthy();
        expect(isValidNull).toBeTruthy();
        expect(isInvalidString).toBeFalsy();
    });
});

describe('validateArray', () => {
    it('should wor correctly', () => {
        const isValid = validateArray([1, 2, 3]),
            isInvalidObject = validateArray({ 1: true } as unknown as any),
            isValidUndefined = validateArray(undefined, true),
            isValidNull = validateObject(undefined, true);
        expect(isValid).toBeTruthy();
        expect(isValidUndefined).toBeTruthy();
        expect(isValidNull).toBeTruthy();
        expect(isInvalidObject).toBeFalsy();
    });
});

describe('validateFunction', () => {
    it('should wor correctly', () => {
        const isValid = validateFunction(() => { }),
            isInvalidObject = validateFunction({ 1: true } as unknown as any),
            isValidUndefined = validateFunction(undefined, true),
            isValidNull = validateFunction(undefined, true);
        expect(isValid).toBeTruthy();
        expect(isValidUndefined).toBeTruthy();
        expect(isValidNull).toBeTruthy();
        expect(isInvalidObject).toBeFalsy();
    });
});
