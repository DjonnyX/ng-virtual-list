import { Directions } from "../enums/directions";
import { isDirection } from './is-direction';

describe('isDirection', () => {
    it('isHorizontal value must be true', () => {
        const isHorizontal = isDirection(Directions.HORIZONTAL, Directions.HORIZONTAL) && 
        isDirection('horizontal', Directions.HORIZONTAL) && 
        isDirection(Directions.HORIZONTAL, 'horizontal');
        expect(isHorizontal).toBeTruthy();
    });

    it('isHorizontal value must be false', () => {
        const isHorizontal = isDirection(Directions.VERTICAL, Directions.HORIZONTAL);
        expect(isHorizontal).toBeFalsy();
    });

    it('isVertical value must be true', () => {
        const isVertical = isDirection(Directions.VERTICAL, Directions.VERTICAL) && 
        isDirection('vertical', Directions.VERTICAL) && 
        isDirection(Directions.VERTICAL, 'vertical');
        expect(isVertical).toBeTruthy();
    });

    it('isVertical value must be false', () => {
        const isVertical = isDirection(Directions.HORIZONTAL, Directions.VERTICAL);
        expect(isVertical).toBeFalsy();
    });
});