import { SelectingModes } from "../enums/selecting-modes";
import { isSelectMode } from './is-select-mode';

describe('isSelectMode', () => {
    it('isNone value must be true', () => {
        const isNone = isSelectMode(SelectingModes.NONE, SelectingModes.NONE) &&
            isSelectMode('none', SelectingModes.NONE) &&
            isSelectMode(SelectingModes.NONE, 'none');
        expect(isNone).toBeTruthy();
    });

    it('isNone value must be false', () => {
        const isNone = isSelectMode(SelectingModes.SELECT, SelectingModes.NONE);
        expect(isNone).toBeFalsy();
    });

    it('isSelect value must be true', () => {
        const isSelect = isSelectMode(SelectingModes.SELECT, SelectingModes.SELECT) &&
            isSelectMode('select', SelectingModes.SELECT) &&
            isSelectMode(SelectingModes.SELECT, 'select');
        expect(isSelect).toBeTruthy();
    });

    it('isSelect value must be false', () => {
        const isSelect = isSelectMode(SelectingModes.MULTI_SELECT, SelectingModes.SELECT);
        expect(isSelect).toBeFalsy();
    });

    it('isMultiSelect value must be true', () => {
        const isMultiSelect = isSelectMode(SelectingModes.MULTI_SELECT, SelectingModes.MULTI_SELECT) &&
            isSelectMode('multi-select', SelectingModes.MULTI_SELECT) &&
            isSelectMode(SelectingModes.MULTI_SELECT, 'multi-select');
        expect(isMultiSelect).toBeTruthy();
    });

    it('isMultiSelect value must be false', () => {
        const isMultiSelect = isSelectMode(SelectingModes.SELECT, SelectingModes.MULTI_SELECT);
        expect(isMultiSelect).toBeFalsy();
    });
});