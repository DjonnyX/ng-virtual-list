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
    delta: number;
    normalizedItemWidth: number;
    normalizedItemHeight: number;
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
    renderItems: number;
    rightItemLength: number;
    rightItemsWeight: number;
    scrollSize: number;
    sizeProperty: typeof HEIGHT_PROP_NAME | typeof WIDTH_PROP_NAME;
    snap: boolean;
    snippedPos: number;
    startIndex: number;
    startPosition: number;
    totalItemsToDisplayEndWeight: number;
    totalLength: number;
    totalSize: number;
    typicalItemSize: number;
}

export interface IRecalculateMetricsOptions<I extends { id: Id }, C extends Array<I>> {
    bounds: ISize;
    collection: C;
    isVertical: boolean;
    itemSize: number;
    itemsOffset: number;
    dynamicSize: boolean;
    scrollSize: number;
    snap: boolean;
    fromItemId?: Id;
}

type CacheMapEvents = typeof TRACK_BOX_CHANGE_EVENT_NAME;

type OnChangeEventListener = (version: number) => void;

type CacheMapListeners = OnChangeEventListener;

/**
 * An object that performs tracking, calculations and caching.
 * @link https://github.com/DjonnyX/ng-virtual-list/blob/20.x/projects/ng-virtual-list/src/lib/utils/trackBox.ts
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

    getItemPosition<I extends { id: Id }, C extends Array<I>>(id: Id, stickyMap: IVirtualListStickyMap, options: IRecalculateMetricsOptions<I, C>): number {
        const opt = { fromItemId: id, stickyMap, ...options };
        const { scrollSize } = this.recalculateMetrics(opt);
        return scrollSize;
    }

    updateCollection<I extends { id: Id }, C extends Array<I>>(items: C, stickyMap: IVirtualListStickyMap,
        options: Omit<IRecalculateMetricsOptions<I, C>, 'collection'>): { displayItems: IRenderVirtualListCollection; totalSize: number; delta: number; } {
        const opt = { stickyMap, ...options };
        this.cacheElements();

        const metrics = this.recalculateMetrics({
            ...opt,
            collection: items,
        });

        const displayItems = this.generateDisplayCollection(items, stickyMap, metrics);
        return { displayItems, totalSize: metrics.totalSize, delta: metrics.delta };
    }

    private getElementNumToEnd<I extends { id: Id }, C extends Array<I>>(i: number, collection: C, map: Map<Id, IRect>, typicalItemSize: number,
        size: number, isVertical: boolean, indexOffset: number = 0): { num: number, offset: number } {
        const sizeProperty = isVertical ? HEIGHT_PROP_NAME : WIDTH_PROP_NAME;
        let offset = 0, num = 0;
        for (let j = collection.length - indexOffset - 1; j >= i; j--) {
            const item = collection[j];
            let itemSize = 0;
            if (map.has(item.id)) {
                const bounds = map.get(item.id);
                itemSize = bounds ? bounds[sizeProperty] : typicalItemSize;
            } else {
                itemSize = typicalItemSize;
            }
            offset += itemSize;
            num++;
            if (offset > size) {
                return { num: 0, offset };
            }
        }
        return { num, offset };
    }

    /**
     * Calculates list metrics
     */
    protected recalculateMetrics<I extends { id: Id }, C extends Array<I>>(options: IRecalculateMetricsOptions<I, C>): IMetrics {
        const { fromItemId, bounds, collection, dynamicSize, isVertical, itemSize,
            itemsOffset, scrollSize, snap, stickyMap } = options as IRecalculateMetricsOptions<I, C> & {
                stickyMap: IVirtualListStickyMap,
            };

        const { width, height } = bounds, sizeProperty = isVertical ? HEIGHT_PROP_NAME : WIDTH_PROP_NAME, size = isVertical ? height : width,
            totalLength = collection.length, typicalItemSize = itemSize,
            w = isVertical ? width : typicalItemSize, h = isVertical ? typicalItemSize : height,
            map = this._map,
            checkOverscrollItemsLimit = Math.ceil(size / typicalItemSize),
            snippedPos = Math.floor(scrollSize),
            leftItemsWeights: Array<number> = [],
            isFromId = fromItemId !== undefined && (typeof fromItemId === 'number' && fromItemId > -1)
                || (typeof fromItemId === 'string' && fromItemId > '-1');

        let itemsFromStartToScrollEnd: number = -1, itemsFromDisplayEndToOffsetEnd = 0, itemsFromStartToDisplayEnd = -1,
            leftItemLength = 0, rightItemLength = 0,
            leftItemsWeight = 0, rightItemsWeight = 0,
            leftHiddenItemsWeight = 0,
            totalItemsToDisplayEndWeight = 0,
            itemById: I | undefined = undefined,
            itemByIdPos: number = 0,
            targetDisplayItemIndex: number = -1,
            isTargetInOverscroll: boolean = false,
            actualScrollSize = itemByIdPos,
            totalSize = 0,
            startIndex;

        if (dynamicSize) {
            let y = 0, stickyCollectionItem: I | undefined = undefined, stickyComponentSize = 0;
            for (let i = 0, l = collection.length; i < l; i++) {
                const ii = i + 1, collectionItem = collection[i];

                let componentSize = 0;
                if (map.has(collectionItem.id)) {
                    const bounds = map.get(collectionItem.id);
                    componentSize = bounds ? bounds[sizeProperty] : typicalItemSize;
                } else {
                    componentSize = typicalItemSize;
                }

                totalSize += componentSize;

                if (isFromId) {
                    if (itemById === undefined) {
                        if (stickyMap && stickyMap[collectionItem.id] > 0) {
                            stickyComponentSize = componentSize;
                            stickyCollectionItem = collectionItem;
                        }

                        if (collectionItem.id === fromItemId) {
                            targetDisplayItemIndex = i;
                            if (stickyCollectionItem && stickyMap && stickyMap[stickyCollectionItem.id] > 0) {
                                const { num } = this.getElementNumToEnd(i, collection, map, typicalItemSize, size, isVertical);
                                if (num > 0) {
                                    isTargetInOverscroll = true;
                                    y -= size - componentSize;
                                } else {
                                    y -= stickyComponentSize;
                                    leftHiddenItemsWeight -= stickyComponentSize;
                                }
                            }
                            itemById = collectionItem;
                            itemByIdPos = y;
                        } else {
                            leftItemsWeights.push(componentSize);
                            leftHiddenItemsWeight += componentSize;
                            itemsFromStartToScrollEnd = ii;
                        }
                    }
                } else if (y < scrollSize - componentSize) {
                    leftItemsWeights.push(componentSize);
                    leftHiddenItemsWeight += componentSize;
                    itemsFromStartToScrollEnd = ii;
                }

                if (isFromId) {
                    if (itemById === undefined || y < itemByIdPos + size + componentSize) {
                        itemsFromStartToDisplayEnd = ii;
                        totalItemsToDisplayEndWeight += componentSize;
                        itemsFromDisplayEndToOffsetEnd = itemsFromStartToDisplayEnd + itemsOffset;
                    }
                } else if (y < scrollSize + size + componentSize) {
                    itemsFromStartToDisplayEnd = ii;
                    totalItemsToDisplayEndWeight += componentSize;
                    itemsFromDisplayEndToOffsetEnd = itemsFromStartToDisplayEnd + itemsOffset;
                } else if (i < itemsFromDisplayEndToOffsetEnd) {
                    rightItemsWeight += componentSize;
                }

                y += componentSize;
            }

            if (isTargetInOverscroll) {
                const { num } = this.getElementNumToEnd(
                    collection.length - (checkOverscrollItemsLimit < 0 ? 0 : collection.length - checkOverscrollItemsLimit),
                    collection, map, typicalItemSize, size, isVertical, collection.length - (collection.length - (targetDisplayItemIndex + 1)),
                );
                if (num > 0) {
                    itemsFromStartToScrollEnd -= num;
                }
            }

            if (itemsFromStartToScrollEnd <= -1) {
                itemsFromStartToScrollEnd = 0;
            }
            if (itemsFromStartToDisplayEnd <= -1) {
                itemsFromStartToDisplayEnd = 0;
            }
            actualScrollSize = isFromId ? itemByIdPos : scrollSize;

            leftItemsWeights.splice(0, leftItemsWeights.length - itemsOffset);
            leftItemsWeights.forEach(v => {
                leftItemsWeight += v;
            });

            leftItemLength = Math.min(itemsFromStartToScrollEnd, itemsOffset);
            rightItemLength = itemsFromStartToDisplayEnd + itemsOffset > totalLength
                ? totalLength - itemsFromStartToDisplayEnd : itemsOffset;
        } else {
            itemsFromStartToScrollEnd = Math.floor(scrollSize / typicalItemSize);
            itemsFromStartToDisplayEnd = Math.ceil((scrollSize + size) / typicalItemSize);
            leftItemLength = Math.min(itemsFromStartToScrollEnd, itemsOffset);
            rightItemLength = itemsFromStartToDisplayEnd + itemsOffset > totalLength
                ? totalLength - itemsFromStartToDisplayEnd : itemsOffset;
            leftItemsWeight = leftItemLength * typicalItemSize;
            rightItemsWeight = rightItemLength * typicalItemSize,
                leftHiddenItemsWeight = itemsFromStartToScrollEnd * typicalItemSize,
                totalItemsToDisplayEndWeight = itemsFromStartToDisplayEnd * typicalItemSize;
            actualScrollSize = scrollSize;
            totalSize = totalLength * typicalItemSize;
        }
        startIndex = Math.min(itemsFromStartToScrollEnd - leftItemLength, totalLength > 0 ? totalLength - 1 : 0);

        const itemsOnDisplay = totalItemsToDisplayEndWeight - leftHiddenItemsWeight,
            itemsOnDisplayLength = itemsFromStartToDisplayEnd - itemsFromStartToScrollEnd,
            startPosition = leftHiddenItemsWeight - leftItemsWeight,
            renderItems = itemsOnDisplayLength + leftItemLength + rightItemLength,
            delta = totalSize - this._previouseFullHeigh;

        if (this.scrollDirection === -1) {
            this._delta += delta;
        }
        const metrics: IMetrics = {
            delta: this._delta,
            normalizedItemWidth: w,
            normalizedItemHeight: h,
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
            renderItems,
            rightItemLength,
            rightItemsWeight,
            scrollSize: actualScrollSize,
            sizeProperty,
            snap,
            snippedPos,
            startIndex,
            startPosition,
            totalItemsToDisplayEndWeight,
            totalLength,
            totalSize,
            typicalItemSize,
        };

        this._previouseFullHeigh = totalSize;

        return metrics;
    }

    clearDeltaDirection() {
        this.clearScrollDirectionCache();
    }

    clearDelta(clearDirectionDetector = false): void {
        this._delta = 0;

        if (clearDirectionDetector) {
            this.clearScrollDirectionCache();
        }
    }

    protected generateDisplayCollection<I extends { id: Id }, C extends Array<I>>(items: C, stickyMap: IVirtualListStickyMap,
        metrics: IMetrics): IRenderVirtualListCollection {
        const {
            // delta,
            normalizedItemWidth,
            normalizedItemHeight,
            // width,
            // height,
            dynamicSize,
            // itemSize,
            itemsFromStartToScrollEnd,
            // itemsFromStartToDisplayEnd,
            // itemsOnDisplay,
            // itemsOnDisplayLength,
            isVertical,
            // leftHiddenItemsWeight,
            // leftItemLength,
            // leftItemsWeight,
            renderItems: renderItemsLength,
            // rightItemLength,
            // rightItemsWeight,
            scrollSize,
            sizeProperty,
            snap,
            snippedPos,
            startPosition,
            // totalItemsToDisplayEndWeight,
            totalLength,
            // totalSize,
            startIndex,
            typicalItemSize,
        } = metrics,
            displayItems: IRenderVirtualListCollection = [];
        if (items.length) {
            const actualSnippedPosition = snippedPos;
            let pos = startPosition,
                renderItems = renderItemsLength,
                stickyItem: IRenderVirtualListItem | undefined, nextSticky: IRenderVirtualListItem | undefined, stickyItemIndex = -1,
                stickyItemSize = 0;

            if (snap) {
                for (let i = Math.min(itemsFromStartToScrollEnd > 0 ? itemsFromStartToScrollEnd : 0, totalLength - 1); i >= 0; i--) {
                    const id = items[i].id, sticky = stickyMap[id], size = dynamicSize ? this.get(id)?.[sizeProperty] || typicalItemSize : typicalItemSize;
                    stickyItemSize = size;
                    if (sticky > 0) {
                        const measures = {
                            x: isVertical ? 0 : actualSnippedPosition,
                            y: isVertical ? actualSnippedPosition : 0,
                            width: normalizedItemWidth,
                            height: normalizedItemHeight,
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
                if (i >= totalLength) {
                    break;
                }

                const id = items[i].id, size = dynamicSize ? this.get(id)?.[sizeProperty] || typicalItemSize : typicalItemSize;

                if (id !== stickyItem?.id) {
                    const snapped = snap && stickyMap[id] > 0 && pos <= scrollSize,
                        measures = {
                            x: isVertical ? 0 : pos,
                            y: isVertical ? pos : 0,
                            width: normalizedItemWidth,
                            height: normalizedItemHeight,
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
                        item.measures.x = isVertical ? 0 : snapped ? actualSnippedPosition : pos;
                        item.measures.y = isVertical ? snapped ? actualSnippedPosition : pos : 0;
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
