import { ComponentRef } from "@angular/core";
import { IRenderVirtualListCollection, } from "../models/render-collection.model";
import { IRenderVirtualListItem } from "../models/render-item.model";
import { Id } from "../types/id";
import { CacheMap, CMap } from "./cacheMap";
import { Tracker } from "./tracker";
import { ISize } from "../types";
import { HEIGHT_PROP_NAME, TRACK_BY_PROPERTY_NAME, WIDTH_PROP_NAME, X_PROP_NAME, Y_PROP_NAME } from "../const";
import { IVirtualListStickyMap } from "../models";
import { bufferInterpolation } from "./buffer-interpolation";
import { BaseVirtualListItemComponent } from "../models/base-virtual-list-item-component";

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
    itemsOnDisplayWeight: number;
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
    sizeProperty: typeof HEIGHT_PROP_NAME | typeof WIDTH_PROP_NAME;
    snap: boolean;
    snippedPos: number;
    startIndex: number;
    startPosition: number;
    totalItemsToDisplayEndWeight: number;
    totalLength: number;
    totalSize: number;
    typicalItemSize: number;
    isFromItemIdFound: boolean;
}

export interface IRecalculateMetricsOptions<I extends { id: Id }, C extends Array<I>> {
    bounds: ISize;
    collection: C;
    isVertical: boolean;
    itemSize: number;
    bufferSize: number;
    maxBufferSize: number;
    dynamicSize: boolean;
    scrollSize: number;
    snap: boolean;
    enabledBufferOptimization: boolean;
    fromItemId?: Id;
    previousTotalSize: number;
    crudDetected: boolean;
    deletedItemsMap: { [index: number]: ISize; };
}

export interface IGetItemPositionOptions<I extends { id: Id }, C extends Array<I>>
    extends Omit<IRecalculateMetricsOptions<I, C>, 'previousTotalSize' | 'crudDetected' | 'deletedItemsMap'> { }

export interface IUpdateCollectionOptions<I extends { id: Id }, C extends Array<I>>
    extends Omit<IRecalculateMetricsOptions<I, C>, 'collection' | 'previousTotalSize' | 'crudDetected' | 'deletedItemsMap'> { }

export type CacheMapEvents = typeof TRACK_BOX_CHANGE_EVENT_NAME;

export type OnChangeEventListener = (version: number) => void;

export type CacheMapListeners = OnChangeEventListener;

export enum ItemDisplayMethods {
    CREATE,
    UPDATE,
    DELETE,
    NOT_CHANGED,
}

export interface IUpdateCollectionReturns {
    displayItems: IRenderVirtualListCollection;
    totalSize: number;
    delta: number;
    crudDetected: boolean;
}

const DEFAULT_BUFFER_EXTREMUM_THRESHOLD = 15,
    DEFAULT_MAX_BUFFER_SEQUENCE_LENGTH = 30,
    DEFAULT_RESET_BUFFER_SIZE_TIMEOUT = 10000;

/**
 * An object that performs tracking, calculations and caching.
 * @link https://github.com/DjonnyX/ng-virtual-list/blob/18.x/projects/ng-virtual-list/src/lib/utils/trackBox.ts
 * @author Evgenii Grebennikov
 * @email djonnyx@gmail.com
 */
export class TrackBox<C extends BaseVirtualListItemComponent = any>
    extends CacheMap<Id, ISize & { method?: ItemDisplayMethods }, CacheMapEvents, CacheMapListeners> {

    protected _tracker!: Tracker<C>;

    protected _items: IRenderVirtualListCollection | null | undefined;

    set items(v: IRenderVirtualListCollection | null | undefined) {
        if (this._items === v) {
            return;
        }

        this._items = v;
    }

    protected _displayComponents: Array<ComponentRef<C>> | null | undefined;

    set displayComponents(v: Array<ComponentRef<C>> | null | undefined) {
        if (this._displayComponents === v) {
            return;
        }

        this._displayComponents = v;
    }

    protected _snapedDisplayComponent: ComponentRef<C> | null | undefined;

    set snapedDisplayComponent(v: ComponentRef<C> | null | undefined) {
        if (this._snapedDisplayComponent === v) {
            return;
        }

        this._snapedDisplayComponent = v;
    }

    protected _isSnappingMethodAdvanced: boolean = false;

    set isSnappingMethodAdvanced(v: boolean) {
        if (this._isSnappingMethodAdvanced === v) {
            return;
        }

        this._isSnappingMethodAdvanced = v;
    }

    /**
     * Set the trackBy property
     */
    set trackingPropertyName(v: string) {
        this._trackingPropertyName = this._tracker.trackingPropertyName = v;
    }

    protected _trackingPropertyName: string = TRACK_BY_PROPERTY_NAME;

    constructor(trackingPropertyName: string) {
        super();

        this._trackingPropertyName = trackingPropertyName;

        this.initialize();
    }

    protected initialize() {
        this._tracker = new Tracker(this._trackingPropertyName);
    }

    override set(id: Id, bounds: ISize): CMap<Id, ISize> {
        if (this._map.has(id)) {
            const b = this._map.get(id);
            if (b?.width === bounds.width && b.height === bounds.height) {
                return this._map;
            }
        }

        const v = this._map.set(id, bounds);

        this.bumpVersion();
        return v;
    }

    protected _previousCollection: Array<{ id: Id; }> | null | undefined;

    protected _deletedItemsMap: { [index: number]: ISize } = {};

    protected _crudDetected = false;
    get crudDetected() { return this._crudDetected; }

    protected override fireChangeIfNeed() {
        if (this.changesDetected()) {
            this.dispatch(TRACK_BOX_CHANGE_EVENT_NAME, this._version);
        }
    }

    protected _previousTotalSize = 0;

    protected _scrollDelta: number = 0;
    get scrollDelta() { return this._scrollDelta; }

    isAdaptiveBuffer = true;

    protected _bufferSequenceExtraThreshold = DEFAULT_BUFFER_EXTREMUM_THRESHOLD;

    protected _maxBufferSequenceLength = DEFAULT_MAX_BUFFER_SEQUENCE_LENGTH;

    protected _bufferSizeSequence: Array<number> = [];

    protected _bufferSize: number = 0;
    get bufferSize() { return this._bufferSize; }

    protected _defaultBufferSize: number = 0;

    protected _maxBufferSize: number = this._defaultBufferSize;

    protected _resetBufferSizeTimeout: number = DEFAULT_RESET_BUFFER_SIZE_TIMEOUT;

    protected _resetBufferSizeTimer: number | undefined;

    protected override lifeCircle() {
        this.fireChangeIfNeed();

        this.lifeCircleDo();
    }

    /**
     * Scans the collection for deleted items and flushes the deleted item cache.
     */
    resetCollection<I extends { id: Id; }, C extends Array<I>>(currentCollection: C | null | undefined, itemSize: number): void {
        if (currentCollection !== undefined && currentCollection !== null && currentCollection === this._previousCollection) {
            console.warn('Attention! The collection must be immutable.');
            return;
        }

        this.updateCache(this._previousCollection, currentCollection, itemSize);

        this._previousCollection = currentCollection;
    }

    /**
     * Update the cache of items from the list
     */
    protected updateCache<I extends { id: Id; }, C extends Array<I>>(previousCollection: C | null | undefined, currentCollection: C | null | undefined,
        itemSize: number): void {
        let crudDetected = false;

        if (!currentCollection || currentCollection.length === 0) {
            if (previousCollection) {
                // deleted
                for (let i = 0, l = previousCollection.length; i < l; i++) {
                    const item = previousCollection[i], id = item.id;
                    crudDetected = true;
                    if (this._map.has(id)) {
                        this._map.delete(id);
                    }
                }
            }
            return;
        }
        if (!previousCollection || previousCollection.length === 0) {
            if (currentCollection) {
                // added
                for (let i = 0, l = currentCollection.length; i < l; i++) {
                    crudDetected = true;
                    const item = currentCollection[i], id = item.id;
                    this._map.set(id, { width: itemSize, height: itemSize, method: ItemDisplayMethods.CREATE });
                }
            }
            return;
        }
        const collectionDict: { [id: Id]: I } = {};
        for (let i = 0, l = currentCollection.length; i < l; i++) {
            const item = currentCollection[i];
            if (item) {
                collectionDict[item.id] = item;
            }
        }
        const notChangedMap: { [id: Id]: I } = {}, deletedMap: { [id: Id]: I } = {}, deletedItemsMap: { [index: number]: ISize } = {}, updatedMap: { [id: Id]: I } = {};
        for (let i = 0, l = previousCollection.length; i < l; i++) {
            const item = previousCollection[i], id = item.id;
            if (item) {
                if (collectionDict.hasOwnProperty(id)) {
                    if (item === collectionDict[id]) {
                        // not changed
                        notChangedMap[item.id] = item;
                        this._map.set(id, { ...(this._map.get(id) || { width: itemSize, height: itemSize }), method: ItemDisplayMethods.NOT_CHANGED });
                        continue;
                    } else {
                        // updated
                        crudDetected = true;
                        updatedMap[item.id] = item;
                        this._map.set(id, { ...(this._map.get(id) || { width: itemSize, height: itemSize }), method: ItemDisplayMethods.UPDATE });
                        continue;
                    }
                }

                // deleted
                crudDetected = true;
                deletedMap[item.id] = item;
                deletedItemsMap[i] = this._map.get(item.id);
                this._map.delete(id);
            }
        }

        for (let i = 0, l = currentCollection.length; i < l; i++) {
            const item = currentCollection[i], id = item.id;
            if (item && !deletedMap.hasOwnProperty(id) && !updatedMap.hasOwnProperty(id) && !notChangedMap.hasOwnProperty(id)) {
                // added
                crudDetected = true;
                this._map.set(id, { width: itemSize, height: itemSize, method: ItemDisplayMethods.CREATE });
            }
        }
        this._crudDetected = crudDetected;
        this._deletedItemsMap = deletedItemsMap;
    }

    /**
     * Finds the position of a collection element by the given Id
     */
    getItemPosition<I extends { id: Id }, C extends Array<I>>(id: Id, stickyMap: IVirtualListStickyMap,
        options: IGetItemPositionOptions<I, C>): number {
        const opt = { fromItemId: id, stickyMap, ...options };
        this._defaultBufferSize = opt.bufferSize;
        this._maxBufferSize = opt.maxBufferSize;

        const { scrollSize, isFromItemIdFound } = this.recalculateMetrics({
            ...opt,
            dynamicSize: this._crudDetected || opt.dynamicSize,
            previousTotalSize: this._previousTotalSize,
            crudDetected: this._crudDetected,
            deletedItemsMap: this._deletedItemsMap,
        });
        return isFromItemIdFound ? scrollSize : -1;
    }

    /**
     * Updates the collection of display objects
     */
    updateCollection<I extends { id: Id }, C extends Array<I>>(items: C, stickyMap: IVirtualListStickyMap,
        options: IUpdateCollectionOptions<I, C>): IUpdateCollectionReturns {
        const opt = { stickyMap, ...options }, crudDetected = this._crudDetected, deletedItemsMap = this._deletedItemsMap;
        if (opt.dynamicSize) {
            this.cacheElements();
        }
        this._defaultBufferSize = opt.bufferSize;
        this._maxBufferSize = opt.maxBufferSize;

        const metrics = this.recalculateMetrics({
            ...opt,
            collection: items,
            previousTotalSize: this._previousTotalSize,
            crudDetected: this._crudDetected,
            deletedItemsMap,
        });

        this._delta += metrics.delta;

        this.updateAdaptiveBufferParams(metrics, items.length);

        this._previousTotalSize = metrics.totalSize;

        this._deletedItemsMap = {};

        this._crudDetected = false;

        if (opt.dynamicSize) {
            this.snapshot();
        }

        const displayItems = this.generateDisplayCollection(items, stickyMap, { ...metrics, });
        return { displayItems, totalSize: metrics.totalSize, delta: metrics.delta, crudDetected };
    }

    /**
     * Finds the closest element in the collection by scrollSize
     */
    getNearestItem<I extends { id: Id }, C extends Array<I>>(scrollSize: number, items: C, itemSize: number, isVertical: boolean): I | undefined {
        return this.getElementFromStart(scrollSize, items, this._map, itemSize, isVertical);
    }

    protected _previousScrollSize = 0;

    protected updateAdaptiveBufferParams(metrics: IMetrics, totalItemsLength: number) {
        this.disposeClearBufferSizeTimer();

        const scrollSize = metrics.scrollSize + this._delta, delta = Math.abs(this._previousScrollSize - scrollSize);
        this._previousScrollSize = scrollSize;
        const bufferRawSize = Math.min(Math.floor(delta / metrics.typicalItemSize) * 5, totalItemsLength),
            minBufferSize = bufferRawSize < this._defaultBufferSize ? this._defaultBufferSize : bufferRawSize,
            bufferValue = minBufferSize > this._maxBufferSize ? this._maxBufferSize : minBufferSize;

        this._bufferSize = bufferInterpolation(this._bufferSize, this._bufferSizeSequence, bufferValue, {
            extremumThreshold: this._bufferSequenceExtraThreshold,
            bufferSize: this._maxBufferSequenceLength,
        });

        this.startResetBufferSizeTimer();
    }

    protected startResetBufferSizeTimer() {
        this._resetBufferSizeTimer = setTimeout(() => {
            this._bufferSize = this._defaultBufferSize;
            this._bufferSizeSequence = [];
        }, this._resetBufferSizeTimeout) as unknown as number;
    }

    protected disposeClearBufferSizeTimer() {
        clearTimeout(this._resetBufferSizeTimer);
    }

    /**
     * Calculates the position of an element based on the given scrollSize
     */
    protected getElementFromStart<I extends { id: Id }, C extends Array<I>>(scrollSize: number, collection: C, map: CMap<Id, ISize>, typicalItemSize: number,
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
    protected getElementNumToEnd<I extends { id: Id }, C extends Array<I>>(i: number, collection: C, map: CMap<Id, ISize>, typicalItemSize: number,
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
            bufferSize: minBufferSize, scrollSize, snap, stickyMap, enabledBufferOptimization,
            previousTotalSize, crudDetected, deletedItemsMap } = options as IRecalculateMetricsOptions<I, C> & {
                stickyMap: IVirtualListStickyMap,
            };

        const bufferSize = Math.max(minBufferSize, this._bufferSize),
            { width, height } = bounds, sizeProperty = isVertical ? HEIGHT_PROP_NAME : WIDTH_PROP_NAME,
            size = isVertical ? height : width, totalLength = collection.length, typicalItemSize = itemSize,
            w = isVertical ? width : typicalItemSize, h = isVertical ? typicalItemSize : height,
            map = this._map, snapshot = this._snapshot, checkOverscrollItemsLimit = Math.ceil(size / typicalItemSize),
            snippedPos = Math.floor(scrollSize), leftItemsWeights: Array<number> = [],
            isFromId = fromItemId !== undefined && (typeof fromItemId === 'number' && fromItemId > -1)
                || (typeof fromItemId === 'string' && fromItemId > '-1');

        let leftItemsOffset = 0, rightItemsOffset = 0;
        if (enabledBufferOptimization) {
            switch (this.scrollDirection) {
                case 1: {
                    leftItemsOffset = 0;
                    rightItemsOffset = bufferSize;
                    break;
                }
                case -1: {
                    leftItemsOffset = bufferSize;
                    rightItemsOffset = 0;
                    break;
                }
                case 0:
                default: {
                    leftItemsOffset = rightItemsOffset = bufferSize;
                }
            }
        } else {
            leftItemsOffset = rightItemsOffset = bufferSize;
        }

        let itemsFromStartToScrollEnd: number = -1, itemsFromDisplayEndToOffsetEnd = 0, itemsFromStartToDisplayEnd = -1,
            leftItemLength = 0, rightItemLength = 0,
            leftItemsWeight = 0, rightItemsWeight = 0,
            leftHiddenItemsWeight = 0,
            totalItemsToDisplayEndWeight = 0,
            leftSizeOfAddedItems = 0,
            leftSizeOfUpdatedItems = 0,
            leftSizeOfDeletedItems = 0,
            itemById: I | undefined = undefined,
            itemByIdPos: number = 0,
            targetDisplayItemIndex: number = -1,
            isTargetInOverscroll: boolean = false,
            actualScrollSize = itemByIdPos,
            totalSize = 0,
            startIndex: number,
            isFromItemIdFound = false;

        // If the list is dynamic or there are new elements in the collection, then it switches to the long algorithm.
        if (dynamicSize) {
            let y = 0, stickyCollectionItem: I | undefined = undefined, stickyComponentSize = 0;
            for (let i = 0, l = collection.length; i < l; i++) {
                const ii = i + 1, collectionItem = collection[i], id = collectionItem.id;

                let componentSize = 0, componentSizeDelta = 0, itemDisplayMethod: ItemDisplayMethods = ItemDisplayMethods.NOT_CHANGED;
                if (map.has(id)) {
                    const bounds = map.get(id) || { width: typicalItemSize, height: typicalItemSize };
                    componentSize = bounds[sizeProperty];
                    itemDisplayMethod = bounds?.method ?? ItemDisplayMethods.UPDATE;
                    switch (itemDisplayMethod) {
                        case ItemDisplayMethods.UPDATE: {
                            const snapshotBounds = snapshot.get(id);
                            const componentSnapshotSize = componentSize - (snapshotBounds ? snapshotBounds[sizeProperty] : typicalItemSize);
                            componentSizeDelta = componentSnapshotSize;
                            map.set(id, { ...bounds, method: ItemDisplayMethods.NOT_CHANGED });
                            break;
                        }
                        case ItemDisplayMethods.CREATE: {
                            componentSizeDelta = typicalItemSize;
                            map.set(id, { ...bounds, method: ItemDisplayMethods.NOT_CHANGED });
                            break;
                        }
                    }
                }

                if (deletedItemsMap.hasOwnProperty(i)) {
                    const bounds = deletedItemsMap[i], size = bounds?.[sizeProperty] ?? typicalItemSize;
                    if (y < scrollSize - size) {
                        leftSizeOfDeletedItems += size;
                    }
                }

                totalSize += componentSize;

                if (isFromId) {
                    if (itemById === undefined) {
                        if (id !== fromItemId && stickyMap && stickyMap[id] === 1) {
                            stickyComponentSize = componentSize;
                            stickyCollectionItem = collectionItem;
                        }

                        if (id === fromItemId) {
                            isFromItemIdFound = true;
                            targetDisplayItemIndex = i;
                            if (stickyCollectionItem && stickyMap) {
                                const { num } = this.getElementNumToEnd(i, collection, map, typicalItemSize, size, isVertical);
                                if (num > 0) {
                                    isTargetInOverscroll = true;
                                    y -= size - componentSize;
                                } else {
                                    if (stickyMap && !stickyMap[collectionItem.id] && y >= scrollSize && y < scrollSize + stickyComponentSize) {
                                        const snappedY = scrollSize - stickyComponentSize;
                                        leftHiddenItemsWeight -= (snappedY - y);
                                        y = snappedY;
                                    } else {
                                        y -= stickyComponentSize;
                                        leftHiddenItemsWeight -= stickyComponentSize;
                                    }
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
                } else if (y <= scrollSize - componentSize) {
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
                } else if (y <= scrollSize + size + componentSize) {
                    itemsFromStartToDisplayEnd = ii;
                    totalItemsToDisplayEndWeight += componentSize;
                    itemsFromDisplayEndToOffsetEnd = itemsFromStartToDisplayEnd + rightItemsOffset;

                    if (y <= scrollSize - componentSize) {
                        switch (itemDisplayMethod) {
                            case ItemDisplayMethods.CREATE: {
                                leftSizeOfAddedItems += componentSizeDelta;
                                break;
                            }
                            case ItemDisplayMethods.UPDATE: {
                                leftSizeOfUpdatedItems += componentSizeDelta;
                                break;
                            }
                            case ItemDisplayMethods.DELETE: {
                                leftSizeOfDeletedItems += componentSizeDelta;
                                break;
                            }
                        }
                    }
                } else {
                    if (i < itemsFromDisplayEndToOffsetEnd) {
                        rightItemsWeight += componentSize;
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
            if (crudDetected) {
                let y = 0;
                for (let i = 0, l = collection.length; i < l; i++) {
                    const collectionItem = collection[i], id = collectionItem.id;
                    let componentSize = typicalItemSize, itemDisplayMethod: ItemDisplayMethods = ItemDisplayMethods.NOT_CHANGED;
                    if (map.has(id)) {
                        const bounds = map.get(id)!;
                        itemDisplayMethod = bounds?.method ?? ItemDisplayMethods.UPDATE;
                        if (itemDisplayMethod === ItemDisplayMethods.CREATE) {
                            map.set(id, { ...bounds, method: ItemDisplayMethods.NOT_CHANGED });
                        }
                    }

                    if (deletedItemsMap.hasOwnProperty(i)) {
                        const bounds = deletedItemsMap[i], size = bounds?.[sizeProperty] ?? typicalItemSize;
                        if (y < scrollSize - size) {
                            leftSizeOfDeletedItems += size;
                        }
                    }

                    if (y < scrollSize - componentSize) {
                        switch (itemDisplayMethod) {
                            case ItemDisplayMethods.CREATE: {
                                leftSizeOfUpdatedItems += componentSize;
                                break;
                            }
                            case ItemDisplayMethods.UPDATE: {
                                leftSizeOfUpdatedItems += componentSize;
                                break;
                            }
                            case ItemDisplayMethods.DELETE: {
                                leftSizeOfDeletedItems += componentSize;
                                break;
                            }
                        }
                    }
                    y += componentSize;
                }
            }
            itemsFromStartToScrollEnd = Math.floor(scrollSize / typicalItemSize);
            itemsFromStartToDisplayEnd = Math.ceil((scrollSize + size) / typicalItemSize);
            leftItemLength = Math.min(itemsFromStartToScrollEnd, bufferSize);
            rightItemLength = itemsFromStartToDisplayEnd + bufferSize > totalLength
                ? totalLength - itemsFromStartToDisplayEnd : bufferSize;
            leftItemsWeight = leftItemLength * typicalItemSize;
            rightItemsWeight = rightItemLength * typicalItemSize;
            leftHiddenItemsWeight = itemsFromStartToScrollEnd * typicalItemSize;
            totalItemsToDisplayEndWeight = itemsFromStartToDisplayEnd * typicalItemSize;
            totalSize = totalLength * typicalItemSize;

            const k = totalSize !== 0 ? previousTotalSize / totalSize : 0;
            actualScrollSize = scrollSize * k;
        }
        startIndex = Math.min(itemsFromStartToScrollEnd - leftItemLength, totalLength > 0 ? totalLength - 1 : 0);

        const itemsOnDisplayWeight = totalItemsToDisplayEndWeight - leftItemsWeight,
            itemsOnDisplayLength = itemsFromStartToDisplayEnd - itemsFromStartToScrollEnd,
            startPosition = leftHiddenItemsWeight - leftItemsWeight,
            renderItems = itemsOnDisplayLength + leftItemLength + rightItemLength,
            delta = leftSizeOfUpdatedItems + leftSizeOfAddedItems - leftSizeOfDeletedItems;

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
            itemsOnDisplayWeight,
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
            sizeProperty,
            snap,
            snippedPos,
            startIndex,
            startPosition,
            totalItemsToDisplayEndWeight,
            totalLength,
            totalSize,
            typicalItemSize,
            isFromItemIdFound,
        };

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

    changes(): void {
        this.bumpVersion();
    }

    protected generateDisplayCollection<I extends { id: Id }, C extends Array<I>>(items: C, stickyMap: IVirtualListStickyMap,
        metrics: IMetrics): IRenderVirtualListCollection {
        const {
            width,
            height,
            normalizedItemWidth,
            normalizedItemHeight,
            dynamicSize,
            itemsOnDisplayLength,
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
            const actualSnippedPosition = snippedPos, isSnappingMethodAdvanced = this.isSnappingMethodAdvanced,
                boundsSize = isVertical ? height : width, actualEndSnippedPosition = boundsSize;
            let pos = startPosition,
                renderItems = renderItemsLength,
                stickyItem: IRenderVirtualListItem | undefined, nextSticky: IRenderVirtualListItem | undefined, stickyItemIndex = -1,
                stickyItemSize = 0, endStickyItem: IRenderVirtualListItem | undefined, nextEndSticky: IRenderVirtualListItem | undefined,
                endStickyItemIndex = -1, endStickyItemSize = 0;

            if (snap) {
                for (let i = Math.min(itemsFromStartToScrollEnd > 0 ? itemsFromStartToScrollEnd : 0, totalLength - 1); i >= 0; i--) {
                    if (!items[i]) {
                        continue;
                    }
                    const id = items[i].id, sticky = stickyMap[id], size = dynamicSize ? this.get(id)?.[sizeProperty] || typicalItemSize : typicalItemSize;
                    if (sticky === 1) {
                        const isOdd = i % 2 != 0,
                            measures = {
                                x: isVertical ? 0 : actualSnippedPosition,
                                y: isVertical ? actualSnippedPosition : 0,
                                width: isVertical ? normalizedItemWidth : size,
                                height: isVertical ? size : normalizedItemHeight,
                                delta: 0,
                            }, config = {
                                odd: isOdd,
                                even: !isOdd,
                                isVertical,
                                sticky,
                                snap,
                                snapped: true,
                                snappedOut: false,
                                dynamic: dynamicSize,
                                isSnappingMethodAdvanced,
                                zIndex: '1',
                            };

                        const itemData: I = items[i];

                        stickyItem = { index: i, id, measures, data: itemData, config };
                        stickyItemIndex = i;
                        stickyItemSize = size;

                        displayItems.push(stickyItem);
                        break;
                    }
                }
            }

            if (snap) {
                const startIndex = itemsFromStartToScrollEnd + itemsOnDisplayLength - 1;
                for (let i = Math.min(startIndex, totalLength > 0 ? totalLength - 1 : 0), l = totalLength; i < l; i++) {
                    if (!items[i]) {
                        continue;
                    }
                    const id = items[i].id, sticky = stickyMap[id], size = dynamicSize
                        ? this.get(id)?.[sizeProperty] || typicalItemSize
                        : typicalItemSize;
                    if (sticky === 2) {
                        const isOdd = i % 2 != 0,
                            w = isVertical ? normalizedItemWidth : size, h = isVertical ? size : normalizedItemHeight, measures = {
                                x: isVertical ? 0 : actualEndSnippedPosition - w,
                                y: isVertical ? actualEndSnippedPosition - h : 0,
                                width: w,
                                height: h,
                                delta: 0,
                            }, config = {
                                odd: isOdd,
                                even: !isOdd,
                                isVertical,
                                sticky,
                                snap,
                                snapped: true,
                                snappedOut: false,
                                dynamic: dynamicSize,
                                isSnappingMethodAdvanced,
                                zIndex: '1',
                            };

                        const itemData: I = items[i];

                        endStickyItem = { index: i, id, measures, data: itemData, config };
                        endStickyItemIndex = i;
                        endStickyItemSize = size;

                        displayItems.push(endStickyItem);
                        break;
                    }
                }
            }

            let i = startIndex;

            while (renderItems > 0) {
                if (i >= totalLength) {
                    break;
                }
                if (!items[i]) {
                    continue;
                }

                const id = items[i].id, size = dynamicSize ? this.get(id)?.[sizeProperty] || typicalItemSize : typicalItemSize;

                if (id !== stickyItem?.id && id !== endStickyItem?.id) {
                    const isOdd = i % 2 != 0,
                        snapped = snap && (stickyMap[id] === 1 && pos <= scrollSize || stickyMap[id] === 2 && pos >= scrollSize + boundsSize - size),
                        measures = {
                            x: isVertical ? stickyMap[id] === 1 ? 0 : boundsSize - size : pos,
                            y: isVertical ? pos : stickyMap[id] === 2 ? boundsSize - size : 0,
                            width: isVertical ? normalizedItemWidth : size,
                            height: isVertical ? size : normalizedItemHeight,
                            delta: 0,
                        }, config = {
                            odd: isOdd,
                            even: !isOdd,
                            isVertical,
                            sticky: stickyMap[id],
                            snap,
                            snapped: false,
                            snappedOut: false,
                            dynamic: dynamicSize,
                            isSnappingMethodAdvanced,
                            zIndex: '0',
                        };

                    if (snapped) {
                        config.zIndex = '2';
                    }

                    const itemData: I = items[i];

                    const item: IRenderVirtualListItem = { index: i, id, measures, data: itemData, config };
                    if (!nextSticky && stickyItemIndex < i && stickyMap[id] === 1 && (pos <= scrollSize + size + stickyItemSize)) {
                        item.measures.x = isVertical ? 0 : snapped ? actualSnippedPosition : pos;
                        item.measures.y = isVertical ? snapped ? actualSnippedPosition : pos : 0;
                        nextSticky = item;
                        nextSticky.config.snapped = snapped;
                        nextSticky.measures.delta = isVertical ? (item.measures.y - scrollSize) : (item.measures.x - scrollSize);
                        nextSticky.config.zIndex = '3';
                    } else if (!nextEndSticky && endStickyItemIndex > i && stickyMap[id] === 2 && (pos >= scrollSize + boundsSize - size - endStickyItemSize)) {
                        item.measures.x = isVertical ? 0 : snapped ? actualEndSnippedPosition - size : pos;
                        item.measures.y = isVertical ? snapped ? actualEndSnippedPosition - size : pos : 0;
                        nextEndSticky = item;
                        nextEndSticky.config.zIndex = '3';
                        nextEndSticky.config.snapped = snapped;
                        nextEndSticky.measures.delta = isVertical ? (item.measures.y - scrollSize) : (item.measures.x - scrollSize);
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
                    stickyItem.measures.delta = isVertical ? stickyItem.measures.y - scrollSize : stickyItem.measures.x - scrollSize;
                } else {
                    nextSticky.config.snapped = true;
                    nextSticky.measures.delta = isVertical ? nextSticky.measures.y - scrollSize : nextSticky.measures.x - scrollSize;
                }
            }

            if (nextEndSticky && endStickyItem && nextEndSticky.measures[axis] >= scrollSize + boundsSize - endStickyItemSize - nextEndSticky.measures[sizeProperty]) {
                if (nextEndSticky.measures[axis] < scrollSize + boundsSize - endStickyItemSize) {
                    endStickyItem.measures[axis] = nextEndSticky.measures[axis] + nextEndSticky.measures[sizeProperty];
                    endStickyItem.config.snapped = nextEndSticky.config.snapped = false;
                    endStickyItem.config.snappedOut = true;
                    endStickyItem.config.sticky = 2;
                    endStickyItem.measures.delta = isVertical ? endStickyItem.measures.y - scrollSize : endStickyItem.measures.x - scrollSize;
                } else {
                    nextEndSticky.config.snapped = true;
                    nextEndSticky.measures.delta = isVertical ? nextEndSticky.measures.y - scrollSize : nextEndSticky.measures.x - scrollSize;
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

        this._tracker.track(this._items, this._displayComponents, this._snapedDisplayComponent, this.scrollDirection);
    }

    setDisplayObjectIndexMapById(v: { [id: number]: number }): void {
        this._tracker.displayObjectIndexMapById = v;
    }

    untrackComponentByIdProperty(component?: C | undefined) {
        this._tracker.untrackComponentByIdProperty(component);
    }

    getItemBounds(id: Id): ISize | undefined {
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

        this.disposeClearBufferSizeTimer();

        if (this._tracker) {
            this._tracker.dispose();
        }
    }
}
