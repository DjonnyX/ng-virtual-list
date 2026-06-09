import { HEIGHT_PROP_NAME, WIDTH_PROP_NAME } from "../../const";
import { ItemTransform, SnapToItemAlign } from "../../types";
import { IItem } from "./item";

/**
 * IMetrics
 * @link https://github.com/DjonnyX/ng-virtual-list/blob/14.x/projects/ng-virtual-list/src/lib/core/interfaces/metrics.ts
 * @author Evgenii Alexandrovich Grebennikov
 * @email djonnyx@gmail.com
 */
export interface IMetrics<I extends IItem> {
    delta: number;
    normalizedItemWidth: number;
    normalizedItemHeight: number;
    width: number;
    height: number;
    dynamicSize: boolean;
    divides: number;
    itemSize: number;
    minItemSize: number;
    maxItemSize: number;
    items: Array<I>;
    itemsFromStartToScrollEnd: number;
    itemsFromStartToDisplayEnd: number;
    itemsOnDisplayWeight: number;
    itemsOnDisplayLength: number;
    isVertical: boolean;
    leftHiddenItemsWeight: number;
    leftItemLength: number;
    leftItemsWeight: number;
    leftLayoutOffset: number;
    leftLayoutIndexOffset: number;
    renderItems: number;
    rightItemLength: number;
    rightItemsWeight: number;
    scrollSize: number;
    leftSizeOfAddedItems: number;
    sizeProperty: typeof HEIGHT_PROP_NAME | typeof WIDTH_PROP_NAME;
    stickyEnabled: boolean;
    stickyPos: number;
    startIndex: number;
    startPosition: number;
    totalItemsToDisplayEndWeight: number;
    totalLength: number;
    totalSize: number;
    typicalItemSize: number;
    isFromItemIdFound: boolean;
    isUpdating: boolean;
    snapToItem: boolean;
    snapToItemAlign: SnapToItemAlign;
    itemTransform: ItemTransform | null;
}