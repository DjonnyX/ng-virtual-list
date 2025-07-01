import { ComponentRef } from "@angular/core";
import { NgVirtualListItemComponent } from "../components/ng-virtual-list-item.component";
import { IRenderVirtualListCollection } from "../models/render-collection.model";
import { IRenderVirtualListItem } from "../models/render-item.model";
import { Id } from "../types/id";
import { IRect } from "../types/rect";
import { CacheMap } from "./cacheMap";
import { Tracker } from "./tracker";
import { ISize } from "../types";
import { debounce } from "./debounce";
import { DEFAULT_ITEMS_OFFSET, HEIGHT_PROP_NAME, WIDTH_PROP_NAME, X_PROP_NAME, Y_PROP_NAME } from "../const";
import { IVirtualListStickyMap } from "../models";
import { getCollectionRemovedOrUpdatedItems } from "./collection";

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
    leftSizeOfAddedItems: number;
    rightSizeOfAddedItems: number;
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
    enabledBufferOptimization: boolean;
    fromItemId?: Id;
}

type CacheMapEvents = typeof TRACK_BOX_CHANGE_EVENT_NAME;

type OnChangeEventListener = (version: number) => void;

type CacheMapListeners = OnChangeEventListener;

enum ItemDisplayMethods {
    CREATE,
    UPDATE,
    DELETE,
    NOT_CHANGED,
}

/**
 * An object that performs tracking, calculations and caching.
 * @link https://github.com/DjonnyX/ng-virtual-list/blob/15.x/projects/ng-virtual-list/src/lib/utils/trackBox.ts
 * @author Evgenii Grebennikov
 * @email djonnyx@gmail.com
 */
export class TrackBox extends CacheMap<Id, IRect & { method?: ItemDisplayMethods }, CacheMapEvents, CacheMapListeners> {
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

    private _previousCollection: Array<{ id: Id }> | null | undefined;

    private _debounceChanges = debounce(this._fireChanges, 0);

    protected override fireChange() {
        this._debounceChanges.execute(this._version);
    }

    /**
     * Scans the collection for deleted items and flushes the deleted item cache.
     */
    resetCollection<I extends { id: Id }, C extends Array<I>>(currentCollection: C | null | undefined, itemSize: number): void {
        if (currentCollection !== undefined && currentCollection !== null && currentCollection === this._previousCollection) {
            console.warn('Attention! The collection must be immutable.');
            return;
        }
        const { deleted, updated, added } = getCollectionRemovedOrUpdatedItems(this._previousCollection, currentCollection);

        this.clearCache(deleted, updated, added, itemSize);

        this._previousCollection = currentCollection;
    }

    /**
     * Clears the cache of items from the list
     */
    protected clearCache<I extends { id: Id }, C extends Array<I>>(deleted: C | null | undefined, updated: C | null | undefined,
        added: C | null | undefined, itemSize: number): void {
        if (deleted) {
            for (let i = 0, l = deleted.length; i < l; i++) {
                const item = deleted[i], id = item.id;
                if (this._map.has(id)) {
                    this._map.delete(id);
                }
            }
        }
        if (updated) {
            for (let i = 0, l = updated.length; i < l; i++) {
                const item = updated[i], id = item.id;
                this._map.set(id, { ...(this._map.get(id) || { x: 0, y: 0, width: itemSize, height: itemSize }), method: ItemDisplayMethods.UPDATE });
            }
        }
        if (added) {
            for (let i = 0, l = added.length; i < l; i++) {
                const item = added[i], id = item.id;
                this._map.set(id, { x: 0, y: 0, width: itemSize, height: itemSize, method: ItemDisplayMethods.CREATE });
            }
        }
    }

    /**
     * Finds the position of a collection element by the given Id
     */
    getItemPosition<I extends { id: Id }, C extends Array<I>>(id: Id, stickyMap: IVirtualListStickyMap, options: IRecalculateMetricsOptions<I, C>): number {
        const opt = { fromItemId: id, stickyMap, ...options };
        const { scrollSize } = this.recalculateMetrics(opt);
        return scrollSize;
    }

    /**
     * Updates the collection of display objects
     */
    updateCollection<I extends { id: Id }, C extends Array<I>>(items: C, stickyMap: IVirtualListStickyMap,
        options: Omit<IRecalculateMetricsOptions<I, C>, 'collection'>): { displayItems: IRenderVirtualListCollection; totalSize: number; delta: number; } {
        const opt = { stickyMap, ...options };

        this.cacheElements();

        const metrics = this.recalculateMetrics({
            ...opt,
            collection: items,
        });

        this._delta += metrics.delta;

        this.snapshot();

        const displayItems = this.generateDisplayCollection(items, stickyMap, metrics);
        return { displayItems, totalSize: metrics.totalSize, delta: metrics.delta };
    }

    /**
     * Finds the closest element in the collection by scrollSize
     */
    getNearestItem<I extends { id: Id }, C extends Array<I>>(scrollSize: number, items: C, itemSize: number, isVertical: boolean): I | undefined {
        return this.getElementFromStart(scrollSize, items, this._map, itemSize, isVertical);
    }

    /**
     * Calculates the position of an element based on the given scrollSize
     */
    private getElementFromStart<I extends { id: Id }, C extends Array<I>>(scrollSize: number, collection: C, map: Map<Id, IRect>, typicalItemSize: number,
        isVertical: boolean): I | undefined {
        const sizeProperty = isVertical ? HEIGHT_PROP_NAME : WIDTH_PROP_NAME;
        let offset = 0;
        for (let i = 0, l = collection.length; i < l; i++) {
            const item = collection[i];
            let itemSize = 0;
            if (map.has(item.id)) {
                const bounds = map.get(item.id);
                itemSize = bounds ? bounds[sizeProperty] : typicalItemSize;
            } else {
                itemSize = typicalItemSize;
            }
            if (offset > scrollSize) {
                return item;
            }
            offset += itemSize;
        }
        return undefined;
    }

    /**
     * Calculates the entry into the overscroll area and returns the number of overscroll elements
     */
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
            itemsOffset, scrollSize, snap, stickyMap, enabledBufferOptimization } = options as IRecalculateMetricsOptions<I, C> & {
                stickyMap: IVirtualListStickyMap,
            };

        const { width, height } = bounds, sizeProperty = isVertical ? HEIGHT_PROP_NAME : WIDTH_PROP_NAME, size = isVertical ? height : width,
            totalLength = collection.length, typicalItemSize = itemSize,
            w = isVertical ? width : typicalItemSize, h = isVertical ? typicalItemSize : height,
            map = this._map, snapshot = this._snapshot,
            leftItemsOffset = enabledBufferOptimization ? this.deltaDirection === 1 ? DEFAULT_ITEMS_OFFSET : itemsOffset : itemsOffset,
            rightItemsOffset = enabledBufferOptimization ? this.deltaDirection === -1 ? DEFAULT_ITEMS_OFFSET : itemsOffset : itemsOffset,
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
            rightSizeOfAddedItems = 0,
            leftSizeOfAddedItems = 0,
            rightSizeOfUpdatedItems = 0,
            leftSizeOfUpdatedItems = 0,
            itemById: I | undefined = undefined,
            itemByIdPos: number = 0,
            targetDisplayItemIndex: number = -1,
            isTargetInOverscroll: boolean = false,
            actualScrollSize = itemByIdPos,
            totalSize = 0,
            startIndex;

        // If the list is dynamic or there are new elements in the collection, then it switches to the long algorithm.
        if (dynamicSize) {
            let y = 0, stickyCollectionItem: I | undefined = undefined, stickyComponentSize = 0;
            for (let i = 0, l = collection.length; i < l; i++) {
                const ii = i + 1, collectionItem = collection[i], id = collectionItem.id;

                let componentSize = 0, componentSizeDelta = 0, itemDisplayMethod: ItemDisplayMethods = ItemDisplayMethods.NOT_CHANGED;
                if (map.has(id)) {
                    const bounds = map.get(id) || { x: 0, y: 0, width: typicalItemSize, height: typicalItemSize };
                    componentSize = bounds[sizeProperty];

                    itemDisplayMethod = bounds?.method ?? ItemDisplayMethods.UPDATE;
                    if (itemDisplayMethod === ItemDisplayMethods.UPDATE) {
                        const snapshotBounds = snapshot.get(id);
                        const componentSnapshotSize = componentSize - (snapshotBounds ? snapshotBounds[sizeProperty] : typicalItemSize);
                        componentSizeDelta = componentSnapshotSize;
                        map.set(id, { ...bounds, method: ItemDisplayMethods.NOT_CHANGED });
                    }
                    if (itemDisplayMethod === ItemDisplayMethods.CREATE) {
                        componentSizeDelta = typicalItemSize;
                        map.set(id, { ...bounds, method: ItemDisplayMethods.NOT_CHANGED });
                    }
                } else {
                    componentSize = typicalItemSize;
                    if (snapshot.has(id)) {
                        itemDisplayMethod = ItemDisplayMethods.DELETE;
                    }
                }

                totalSize += componentSize;

                if (isFromId) {
                    if (itemById === undefined) {
                        if (id !== fromItemId && stickyMap && stickyMap[id] > 0) {
                            stickyComponentSize = componentSize;
                            stickyCollectionItem = collectionItem;
                        }

                        if (id === fromItemId) {
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
                        itemsFromDisplayEndToOffsetEnd = itemsFromStartToDisplayEnd + rightItemsOffset;
                    }
                    if (y > itemByIdPos + size + componentSize) {
                        if (itemDisplayMethod === ItemDisplayMethods.UPDATE) {
                            rightSizeOfAddedItems += componentSizeDelta;
                        }
                    }
                } else if (y < scrollSize + size + componentSize) {
                    itemsFromStartToDisplayEnd = ii;
                    totalItemsToDisplayEndWeight += componentSize;
                    itemsFromDisplayEndToOffsetEnd = itemsFromStartToDisplayEnd + rightItemsOffset;

                    if (y < scrollSize - componentSize) {
                        if (itemDisplayMethod === ItemDisplayMethods.UPDATE) {
                            leftSizeOfUpdatedItems += componentSizeDelta;
                        }
                        if (itemDisplayMethod === ItemDisplayMethods.CREATE) {
                            leftSizeOfAddedItems += componentSizeDelta;
                        }
                    }
                } else {
                    if (i < itemsFromDisplayEndToOffsetEnd) {
                        rightItemsWeight += componentSize;
                    }
                    if (itemDisplayMethod === ItemDisplayMethods.UPDATE) {
                        rightSizeOfUpdatedItems += componentSizeDelta;
                    }
                    if (itemDisplayMethod === ItemDisplayMethods.CREATE) {
                        rightSizeOfAddedItems += componentSizeDelta;
                    }
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

            leftItemsWeights.splice(0, leftItemsWeights.length - leftItemsOffset);
            leftItemsWeights.forEach(v => {
                leftItemsWeight += v;
            });

            leftItemLength = Math.min(itemsFromStartToScrollEnd, leftItemsOffset);
            rightItemLength = itemsFromStartToDisplayEnd + rightItemsOffset > totalLength
                ? totalLength - itemsFromStartToDisplayEnd : rightItemsOffset;
        } else
        // Buffer optimization does not work on fast linear algorithm
        {
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
            delta = leftSizeOfUpdatedItems + leftSizeOfAddedItems;

        const metrics: IMetrics = {
            delta,
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
            leftSizeOfAddedItems,
            rightSizeOfAddedItems,
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

        return metrics;
    }

    protected _scrollDelta: number = 0;
    get scrollDelta() { return this._scrollDelta; }

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
            normalizedItemWidth,
            normalizedItemHeight,
            dynamicSize,
            itemsFromStartToScrollEnd,
            isVertical,
            renderItems: renderItemsLength,
            scrollSize,
            sizeProperty,
            snap,
            snippedPos,
            startPosition,
            totalLength,
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
                        stickyItemSize = size;

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
                    if (!nextSticky && stickyItemIndex < i && stickyMap[id] > 0 && pos <= scrollSize + size + stickyItemSize) {
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

    getItemBounds(id: Id): IRect | undefined {
        if (this.has(id)) {
            return this.get(id);
        }
        return undefined;
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
