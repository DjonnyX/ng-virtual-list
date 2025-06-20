import { ComponentRef } from "@angular/core";
import { NgVirtualListItemComponent } from "../components/ng-virtual-list-item.component";
import { IVirtualListCollection } from "../models/collection.model";
import { IRenderVirtualListCollection } from "../models/render-collection.model";
import { IRenderVirtualListItem } from "../models/render-item.model";
import { Id } from "../types/id";
import { IRect } from "../types/rect";
import { CacheMap } from "./cacheMap";
import { Tracker } from "./tracker";
import { ISize } from "../types";
import { debounce } from "./debounce";
import { HEIGHT_PROP_NAME, WIDTH_PROP_NAME, X_PROP_NAME, Y_PROP_NAME } from "../const";
import { IVirtualListStickyMap } from "../models";

export const TRACK_BOX_CHANGE_EVENT_NAME = 'change';

export interface IMetrics {
    width: number;
    height: number;
    dynamicSize: boolean;
    itemSize: number;
    itemsFromStartToScrollEnd: number;
    itemsFromStartToDisplayEnd: number;
    itemsOnDisplay: number;
    itemsOnDisplayLength: number;
    isVertical: boolean;
    leftHiddenItemsWeight: number;
    leftItemLength: number;
    leftItemsWeight: number;
    rightItemLength: number;
    rightItemsWeight: number;
    scrollSize: number;
    snap: boolean;
    snippedPos: number;
    totalItemsToDisplayEndWeight: number;
    totalSize: number;
    typicalItemSize: number;
}

interface IRecalculateMetricsOptions {
    bounds: ISize;
    collection: IVirtualListCollection;
    isVertical: boolean;
    itemSize: number;
    itemsOffset: number;
    dynamicSize: boolean;
    scrollSize: number;
    snap: boolean;
}

type CacheMapEvents = typeof TRACK_BOX_CHANGE_EVENT_NAME;

type OnChangeEventListener = (version: number) => void;

type CacheMapListeners = OnChangeEventListener;

/**
 * An object that performs tracking, calculations and caching.
 * @link https://github.com/DjonnyX/ng-virtual-list/blob/main/projects/ng-virtual-list/src/lib/utils/trackBox.ts
 * @author Evgenii Grebennikov
 * @email djonnyx@gmail.com
 */
export class TrackBox extends CacheMap<Id, IRect, CacheMapEvents, CacheMapListeners> {
    protected _tracker!: Tracker<IRenderVirtualListItem, NgVirtualListItemComponent>;

    protected _items: IRenderVirtualListCollection | null | undefined;

    set items(v: IRenderVirtualListCollection | null | undefined) {
        if (this._items === v) {
            return;
        }

        this._items = v;
    }

    protected _displayComponents: Array<ComponentRef<NgVirtualListItemComponent>> | null | undefined;

    set displayComponents(v: Array<ComponentRef<NgVirtualListItemComponent>> | null | undefined) {
        if (this._displayComponents === v) {
            return;
        }

        this._displayComponents = v;
    }

    constructor(trackingPropertyName: string) {
        super();

        this._tracker = new Tracker(trackingPropertyName);
    }

    override set(id: Id, bounds: IRect): Map<Id, IRect> {
        if (this._map.has(id) && JSON.stringify(this._map.get(id)) === JSON.stringify(bounds)) {
            return this._map;
        }

        const v = this._map.set(id, bounds);

        this.bumpVersion();

        this.fireChange();

        return v;
    }

    private _fireChanges = (version: number) => {
        this.dispatch(TRACK_BOX_CHANGE_EVENT_NAME, version);
    };

    private _debounceChanges = debounce(this._fireChanges, 0);

    protected override fireChange() {
        this._debounceChanges.execute(this._version);
    }

    updateCollection<I extends { id: Id }, C extends Array<I>>(items: C, stickyMap: IVirtualListStickyMap,
        options: Omit<IRecalculateMetricsOptions, 'collection'>): { displayItems: IRenderVirtualListCollection; totalSize: number; } {
        this.cacheElements();

        const metrics = this.recalculateMetrics({
            ...options,
            collection: items,
        });

        const displayItems = this.generateDisplayCollection(items, stickyMap, metrics);
        return { displayItems, totalSize: metrics.totalSize };
    }

    protected recalculateMetrics(options: IRecalculateMetricsOptions): IMetrics {
        // Необходима кореляция startDisplayObjectY с помощью дельты от высоты предыдущей и текущей размеченной области по версии кэша.
        // TrackBox может расчитать дельту!

        const { bounds, collection, dynamicSize, isVertical, itemSize, itemsOffset, scrollSize, snap, } = options;

        const { width, height } = bounds, sizeProperty = isVertical ? HEIGHT_PROP_NAME : WIDTH_PROP_NAME, size = isVertical ? height : width,
            weightToDisplayEnd = scrollSize + height,
            totalLength = collection.length, typicalItemSize = itemSize,
            totalSize = dynamicSize ? this.getBoundsFromCache(collection, typicalItemSize, isVertical) : totalLength * typicalItemSize,
            snippedPos = Math.floor(scrollSize),
            leftItemsWeights: Array<number> = [];

        let itemsFromStartToScrollEnd: number = -1, itemsFromDisplayEndToOffsetEnd = 0, itemsFromStartToDisplayEnd = -1,
            leftItemLength = 0, rightItemLength = 0,
            leftItemsWeight = 0, rightItemsWeight = 0,
            leftHiddenItemsWeight = 0,
            totalItemsToDisplayEndWeight = 0,
            startIndex;

        if (dynamicSize) {
            let y = 0;
            for (let i = 0, l = collection.length; i < l; i++) {
                const ii = i + 1, collectionItem = collection[i], map = this._map;

                let componentSize = 0;
                if (map.has(collectionItem.id)) {
                    const bounds = map.get(collectionItem.id);
                    componentSize = bounds ? bounds[sizeProperty] : typicalItemSize;
                } else {
                    componentSize = typicalItemSize;
                }

                if (y < scrollSize - componentSize) {
                    leftItemsWeights.push(componentSize);
                    leftHiddenItemsWeight += componentSize;
                    itemsFromStartToScrollEnd = ii;
                }

                if (y < scrollSize + size + componentSize) {
                    itemsFromStartToDisplayEnd = ii;
                    totalItemsToDisplayEndWeight += componentSize;
                    itemsFromDisplayEndToOffsetEnd = itemsFromStartToDisplayEnd + itemsOffset;
                } else if (i < itemsFromDisplayEndToOffsetEnd) {
                    rightItemsWeight += componentSize;
                }

                y += componentSize;
            }

            if (itemsFromStartToScrollEnd === -1) {
                itemsFromStartToScrollEnd = 0;
            }
            if (itemsFromStartToDisplayEnd === -1) {
                itemsFromStartToDisplayEnd = 0;
            }

            leftItemsWeights.splice(0, leftItemsWeights.length - itemsOffset);
            leftItemsWeights.forEach(v => {
                leftItemsWeight += v;
            });

            leftItemLength = Math.min(itemsFromStartToScrollEnd, itemsOffset);
            rightItemLength = itemsFromStartToDisplayEnd + itemsOffset > totalLength
                ? totalLength - itemsFromStartToDisplayEnd : itemsOffset;
            startIndex = itemsFromStartToScrollEnd - leftItemLength;
        } else {
            itemsFromStartToScrollEnd = Math.ceil(scrollSize / typicalItemSize);
            itemsFromStartToDisplayEnd = Math.ceil((scrollSize + size) / typicalItemSize);
            leftItemLength = Math.min(itemsFromStartToScrollEnd, itemsOffset);
            rightItemLength = itemsFromStartToDisplayEnd + itemsOffset > totalLength
                ? totalLength - itemsFromStartToDisplayEnd : itemsOffset;
            startIndex = itemsFromStartToScrollEnd - leftItemLength;
            leftItemsWeight = leftItemLength * typicalItemSize;
            rightItemsWeight = rightItemLength * typicalItemSize,
                leftHiddenItemsWeight = itemsFromStartToScrollEnd * typicalItemSize,
                totalItemsToDisplayEndWeight = itemsFromStartToDisplayEnd * typicalItemSize;
        }

        const itemsOnDisplay = totalItemsToDisplayEndWeight - leftHiddenItemsWeight,
            itemsOnDisplayLength = itemsFromStartToDisplayEnd - itemsFromStartToScrollEnd;

        const metrics: IMetrics = {
            width,
            height,
            dynamicSize,
            itemSize,
            itemsFromStartToScrollEnd,
            itemsFromStartToDisplayEnd,
            itemsOnDisplay,
            itemsOnDisplayLength,
            isVertical,
            leftHiddenItemsWeight,
            leftItemLength,
            leftItemsWeight,
            rightItemLength,
            rightItemsWeight,
            scrollSize,
            snap,
            snippedPos,
            totalItemsToDisplayEndWeight,
            totalSize,
            typicalItemSize,
        };

        return metrics;
    }

    protected generateDisplayCollection<I extends { id: Id }, C extends Array<I>>(items: C, stickyMap: IVirtualListStickyMap,
        metrics: IMetrics): IRenderVirtualListCollection {
        const {
            width,
            height,
            dynamicSize,
            itemSize,
            itemsFromStartToScrollEnd,
            itemsFromStartToDisplayEnd,
            itemsOnDisplay,
            itemsOnDisplayLength,
            isVertical,
            leftHiddenItemsWeight,
            leftItemLength,
            leftItemsWeight,
            rightItemLength,
            rightItemsWeight,
            scrollSize,
            snap,
            snippedPos,
            totalItemsToDisplayEndWeight,
            totalSize,
            typicalItemSize,
        } = metrics;
        const displayItems: IRenderVirtualListCollection = [];
        if (items.length) {
            const sizeProperty = isVertical ? HEIGHT_PROP_NAME : WIDTH_PROP_NAME,
                w = isVertical ? width : typicalItemSize, h = isVertical ? typicalItemSize : height, totalItems = items.length,
                startIndex = Math.min(itemsFromStartToScrollEnd - leftItemLength, totalItems > 0 ? totalItems - 1 : 0);

            let pos = leftHiddenItemsWeight - leftItemsWeight,
                renderItems = itemsOnDisplayLength + leftItemLength + rightItemLength,
                stickyItem: IRenderVirtualListItem | undefined, nextSticky: IRenderVirtualListItem | undefined, stickyItemIndex = -1,
                stickyItemSize = 0;

            if (snap) {
                for (let i = Math.min(itemsFromStartToScrollEnd > 0 ? itemsFromStartToScrollEnd - 1 : 0, totalItems - 1); i >= 0; i--) {
                    const id = items[i].id, sticky = stickyMap[id], size = dynamicSize ? this.get(id)?.[sizeProperty] || typicalItemSize : typicalItemSize;
                    stickyItemSize = size;
                    if (sticky > 0) {
                        const measures = {
                            x: isVertical ? 0 : snippedPos,
                            y: isVertical ? snippedPos : 0,
                            width: w,
                            height: h,
                        }, config = {
                            isVertical,
                            sticky,
                            snap,
                            snapped: true,
                            snappedOut: false,
                            dynamic: dynamicSize,
                        };

                        const itemData: I = items[i];

                        stickyItem = { id, measures, data: itemData, config };
                        stickyItemIndex = i;

                        displayItems.push(stickyItem);
                        break;
                    }
                }
            }

            let i = startIndex;

            while (renderItems > 0) {
                if (i > totalItems) {
                    break;
                }

                const id = items[i].id, size = dynamicSize ? this.get(id)?.[sizeProperty] || typicalItemSize : typicalItemSize;

                if (id !== stickyItem?.id) {
                    const snapped = snap && stickyMap[id] > 0 && pos <= scrollSize,
                        measures = {
                            x: isVertical ? 0 : pos,
                            y: isVertical ? pos : 0,
                            width: w,
                            height: h,
                        }, config = {
                            isVertical,
                            sticky: stickyMap[id],
                            snap,
                            snapped: false,
                            snappedOut: false,
                            dynamic: dynamicSize,
                        };

                    const itemData: I = items[i];

                    const item: IRenderVirtualListItem = { id, measures, data: itemData, config };
                    if (!nextSticky && stickyItemIndex < i && snap && stickyMap[id] > 0 && pos <= scrollSize + size) {
                        item.measures.x = isVertical ? 0 : snapped ? snippedPos : pos;
                        item.measures.y = isVertical ? snapped ? snippedPos : pos : 0;
                        nextSticky = item;
                        nextSticky.config.snapped = snapped;
                    }
                    displayItems.push(item);
                }

                renderItems -= 1;
                pos += size;
                i++;
            }

            const axis = isVertical ? Y_PROP_NAME : X_PROP_NAME;

            if (nextSticky && stickyItem && nextSticky.measures[axis] <= scrollSize + stickyItemSize) {
                if (nextSticky.measures[axis] > scrollSize) {
                    stickyItem.measures[axis] = nextSticky.measures[axis] - stickyItemSize;
                    stickyItem.config.snapped = nextSticky.config.snapped = false;
                    stickyItem.config.snappedOut = true;
                    stickyItem.config.sticky = 1;
                } else {
                    nextSticky.config.snapped = true;
                }
            }
        }
        return displayItems;
    }

    /**
     * tracking by propName
     */
    track(): void {
        if (!this._items || !this._displayComponents) {
            return;
        }

        this._tracker.track(this._items, this._displayComponents);
    }

    setDisplayObjectIndexMapById(v: { [id: number]: number }): void {
        this._tracker.displayObjectIndexMapById = v;
    }

    untrackComponentByIdProperty(component?: NgVirtualListItemComponent | undefined) {
        this._tracker.untrackComponentByIdProperty(component);
    }

    protected cacheElements(): void {
        if (!this._displayComponents) {
            return;
        }

        for (let i = 0, l = this._displayComponents.length; i < l; i++) {
            const component = this._displayComponents[i], itemId = component.instance.itemId;
            if (itemId === undefined) {
                continue;
            }
            const bounds = component.instance.getBounds();
            this.set(itemId, bounds);
        }
    }

    /**
     * Returns calculated bounds from cache
     */
    private getBoundsFromCache(items: IVirtualListCollection, typicalItemSize: number, isVertical: boolean) {
        const sizeProperty = isVertical ? HEIGHT_PROP_NAME : WIDTH_PROP_NAME, map = this._map;
        let size: number = 0;
        for (let i = 0, l = items.length; i < l; i++) {
            const item = items[i];
            if (map.has(item.id)) {
                const bounds = map.get(item.id);
                size += bounds ? bounds[sizeProperty] : typicalItemSize;
            } else {
                size += typicalItemSize;
            }
        }
        return size;
    }

    override dispose() {
        super.dispose();

        if (this._debounceChanges) {
            this._debounceChanges.dispose();
        }

        if (this._tracker) {
            this._tracker.dispose();
        }
    }
}
