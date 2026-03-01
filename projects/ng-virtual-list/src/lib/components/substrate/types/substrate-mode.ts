import { SubstarateModes } from "../enums/substrate-modes";

/**
 * SubstarateMode
 * Maximum performance for extremely large lists.
 * It is based on algorithms for virtualization of screen objects.
 * @link https://github.com/DjonnyX/ng-virtual-list/blob/14.x/projects/ng-virtual-list/src/lib/components/substrate/types/substrate-mode.ts
 * @author Evgenii Alexandrovich Grebennikov
 * @email djonnyx@gmail.com
 */
export type SubstarateMode = SubstarateModes.RECTANGLE | SubstarateModes.ROUNDED_RECTANGLE | SubstarateModes.CIRCLE
    | 'rectangle' | 'circle' | 'rounded-rectangle';
