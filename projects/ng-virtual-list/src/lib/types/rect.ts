import { ISize } from "./size";

/**
 * Rectangular area interface
 * @link https://github.com/DjonnyX/ng-virtual-list/blob/14.x/projects/ng-virtual-list/src/lib/types/rect.ts
 * @author Evgenii Grebennikov
 * @email djonnyx@gmail.com
 */
export interface IRect extends ISize {
    /**
     * X coordinate.
     */
    x: number;
    /**
     * Y coordinate.
     */
    y: number;
}