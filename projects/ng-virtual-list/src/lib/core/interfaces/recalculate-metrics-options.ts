import { ISize } from "../../interfaces";
import { Id, ItemTransform, SnapToItemAlign } from "../../types";
import { IItem } from "./item";

/**
 * IRecalculateMetricsOptions
 * @link https://github.com/DjonnyX/ng-virtual-list/blob/20.x/projects/ng-virtual-list/src/lib/core/interfaces/recalculate-metrics-options.ts
 * @author Evgenii Alexandrovich Grebennikov
 * @email djonnyx@gmail.com
 */
export interface IRecalculateMetricsOptions<I extends IItem, C extends Array<I>> {
    bounds: ISize;
    collection: C;
    isVertical: boolean;
    itemSize: number;
    minItemSize: number;
    maxItemSize: number;
    bufferSize: number;
    maxBufferSize: number;
    dynamicSize: boolean;
    scrollSize: number;
    stickyEnabled: boolean;
    enabledBufferOptimization: boolean;
    fromItemId?: Id;
    previousTotalSize: number;
    crudDetected: boolean;
    deletedItemsMap: { [index: number]: ISize; };
    snapToItem: boolean;
    snapToItemAlign: SnapToItemAlign;
    itemTransform: ItemTransform | null;
}