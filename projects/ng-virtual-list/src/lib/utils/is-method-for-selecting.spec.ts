import { MethodsForSelecting } from "../enums/methods-for-selecting";
import { isMethodForSelecting } from './is-method-for-selecting';

describe('isMethodForSelecting', () => {
    it('isNone value must be true', () => {
        const isNone = isMethodForSelecting(MethodsForSelecting.NONE, MethodsForSelecting.NONE) &&
            isMethodForSelecting('none', MethodsForSelecting.NONE) &&
            isMethodForSelecting(MethodsForSelecting.NONE, 'none');
        expect(isNone).toBeTruthy();
    });

    it('isNone value must be false', () => {
        const isNone = isMethodForSelecting(MethodsForSelecting.SELECT, MethodsForSelecting.NONE);
        expect(isNone).toBeFalsy();
    });

    it('isSelect value must be true', () => {
        const isSelect = isMethodForSelecting(MethodsForSelecting.SELECT, MethodsForSelecting.SELECT) &&
            isMethodForSelecting('select', MethodsForSelecting.SELECT) &&
            isMethodForSelecting(MethodsForSelecting.SELECT, 'select');
        expect(isSelect).toBeTruthy();
    });

    it('isSelect value must be false', () => {
        const isSelect = isMethodForSelecting(MethodsForSelecting.MULTI_SELECT, MethodsForSelecting.SELECT);
        expect(isSelect).toBeFalsy();
    });

    it('isMultiSelect value must be true', () => {
        const isMultiSelect = isMethodForSelecting(MethodsForSelecting.MULTI_SELECT, MethodsForSelecting.MULTI_SELECT) &&
            isMethodForSelecting('multi-select', MethodsForSelecting.MULTI_SELECT) &&
            isMethodForSelecting(MethodsForSelecting.MULTI_SELECT, 'multi-select');
        expect(isMultiSelect).toBeTruthy();
    });

    it('isMultiSelect value must be false', () => {
        const isMultiSelect = isMethodForSelecting(MethodsForSelecting.SELECT, MethodsForSelecting.MULTI_SELECT);
        expect(isMultiSelect).toBeFalsy();
    });
});