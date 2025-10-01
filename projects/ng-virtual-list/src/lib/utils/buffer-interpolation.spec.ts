import { bufferInterpolation } from './buffer-interpolation';

describe('bufferInterpolation', () => {
    it('should work correctly', () => {
        const arr = [1, 5, 2, 2, 3, 8], expected = [2, 3, 8, 5, 5, 5, 5];
        bufferInterpolation(1, arr, 5, { extremumThreshold: 4, bufferSize: 7 });
        expect(JSON.stringify(arr)).toEqual(JSON.stringify(expected));
    });
});