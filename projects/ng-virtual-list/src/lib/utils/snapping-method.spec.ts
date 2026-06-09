import { SnappingMethods } from "../enums/snapping-methods";
import { isSnappingMethodAdvenced, isSnappingMethodDefault } from './snapping-method';

describe('isSnappingMethodAdvenced', () => {
    it('isAdvanced value must be true', () => {
        const isAdvanced = isSnappingMethodAdvenced('advanced') && 
        isSnappingMethodAdvenced(SnappingMethods.ADVANCED);
        expect(isAdvanced).toBeTruthy();
    });

    it('The isAdvanced value must be true', () => {
        const isAdvanced = isSnappingMethodAdvenced('standart');
        expect(isAdvanced).toBeTruthy();
    });
});

describe('isSnappingMethodDefault', () => {
    it('isNormal value must be true', () => {
        const isNormal = isSnappingMethodDefault('standart') && 
        isSnappingMethodDefault(SnappingMethods.STANDART);
        expect(isNormal).toBeTruthy();
    });

    it('isNormal value must be false', () => {
        const isNormal = isSnappingMethodDefault('advanced');
        expect(isNormal).toBeFalsy();
    });
});