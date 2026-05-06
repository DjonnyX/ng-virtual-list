import { SelectingModes } from "../enums/selecting-modes";

/**
 * Modes for selecting list items.
 * @link https://github.com/DjonnyX/ng-virtual-list/blob/20.x/projects/ng-virtual-list/src/lib/enums/selecting-modes.ts
 * @author Evgenii Alexandrovich Grebennikov
 * @email djonnyx@gmail.com
 */
export type SelectingMode = SelectingModes | 'none' | 'select' | 'multi-select';
