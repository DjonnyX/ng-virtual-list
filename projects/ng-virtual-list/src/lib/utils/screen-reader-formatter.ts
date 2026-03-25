import { RANGE_DISPLAY_ITEMS_END_OFFSET } from "../const";
import { IRenderVirtualListItem } from "../models";
import { IRenderVirtualListCollection } from "../models/render-collection.model";
import { ISize } from "../types";

export const formatScreenReaderMessage = (items: IRenderVirtualListCollection, messagePattern: string | undefined, scrollSize: number,
    isVertical: boolean, bounds: ISize) => {
    if (!messagePattern) {
        return '';
    }
    const list = items ?? [], size = isVertical ? bounds.height : bounds.width;
    let start = Number.NaN, end = Number.NaN, prevItem: IRenderVirtualListItem | undefined;
    for (let i = 0, l = list.length; i < l; i++) {
        const item = list[i], position = isVertical ? item.measures.y : item.measures.x,
            itemSize = isVertical ? item.measures.height : item.measures.width;
        if (((position + itemSize) >= scrollSize) && Number.isNaN(start)) {
            start = item.index + 1;
        }
        if ((position >= (scrollSize + size)) && Number.isNaN(end) && prevItem) {
            end = prevItem.index + 1;
        }
        prevItem = item;
    }
    if (Number.isNaN(start) || Number.isNaN(end)) {
        return '';
    }
    let formatted = messagePattern ?? '';
    formatted = formatted.replace('$1', `${start}`);
    formatted = formatted.replace('$2', `${end}`);
    return formatted;
};

export const formatActualDisplayItems = (items: IRenderVirtualListCollection, startOffset: number, endOffset: number, scrollSize: number,
    isVertical: boolean, bounds: ISize): [number, number] | undefined => {
    const list = items ?? [], size = isVertical ? bounds.height : bounds.width;
    let start = Number.NaN, end = Number.NaN;
    for (let i = 0, l = list.length; i < l; i++) {
        const item = list[i], position = isVertical ? item.measures.y : item.measures.x,
            itemSize = isVertical ? item.measures.height : item.measures.width;
        if ((position + itemSize <= scrollSize + startOffset)) {
            start = item.index;
        }
        if (((position) <= (scrollSize + size - endOffset + RANGE_DISPLAY_ITEMS_END_OFFSET))) {
            end = item.index;
        }
    }
    if (Number.isNaN(start) || Number.isNaN(end)) {
        return undefined;
    }
    return [start, end];
};
