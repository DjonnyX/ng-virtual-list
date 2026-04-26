import { Color } from "../types";

/**
 * IItemTransformation
 * @link https://github.com/DjonnyX/ng-virtual-list/blob/20.x/projects/ng-virtual-list/src/lib/prerender-container/interfaces/item-transformation.ts
 * @author Evgenii Alexandrovich Grebennikov
 * @email djonnyx@gmail.com
 */
export interface IItemTransformation {
    x: number;
    y: number;
    z: number;
    rotationX: number;
    rotationY: number;
    rotationZ: number;
    scaleX: number;
    scaleY: number;
    scaleZ: number;
    opacity: number;
    filter?: string;
    blendColor?: Color | null;
    zIndex: number | string;
}