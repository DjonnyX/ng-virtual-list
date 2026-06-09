import { ComponentRef } from "@angular/core";
import { IRenderVirtualListCollection, } from "../models/render-collection.model";
import { IRenderVirtualListItem } from "../models/render-item.model";
import { Id } from "../types/id";
import { CACHE_BOX_CHANGE_EVENT_NAME, CacheMap } from "./cache-map";
import { Tracker } from "./tracker";
import { IRect, ISize } from "../interfaces";
import {
    DEFAULT_DIVIDES, HEIGHT_PROP_NAME, SERVICE_PROP_DUMMY, SERVICE_PROP_DUMMY_ENABLED, TRACK_BY_PROPERTY_NAME, WIDTH_PROP_NAME,
    X_PROP_NAME, Y_PROP_NAME,
} from "../const";
import { IRenderVirtualListItemConfig, IRenderVirtualListItemMeasures, IVirtualListItemConfigMap } from "../models";
import { debounce } from "../utils";
import { CMap } from '../utils/cmap';
import { bufferInterpolation } from "../utils/buffer-interpolation";
import { BaseVirtualListItemComponent } from "../components/ng-list-item/base";
import { PrerenderCache } from "../components/ng-prerender-container/types/cache";
import { ScrollDirection } from "../types";
import { objectAsReadonly } from "../utils/object";
import { getServiceIdProp } from "./utils";
import {
    DEFAULT_BUFFER_EXTREMUM_THRESHOLD, DEFAULT_MAX_BUFFER_SEQUENCE_LENGTH, DEFAULT_RESET_BUFFER_SIZE_TIMEOUT, END_COLLECTION_PREFIX_ID,
    IS_NEW, START_COLLECTION_PREFIX_ID,
} from "./const";
import { Z_INDEX_0, Z_INDEX_1, Z_INDEX_2, Z_INDEX_3, } from '../const';
import {
    IGetItemPositionOptions, IGetMetricsReturns, IItem, IMetrics, IRecalculateMetricsOptions, IUpdateCollectionOptions,
    IUpdateCollectionReturns,
} from "./interfaces";
import { TrackBoxEvents } from "./events";
import { Cache, CacheMapEvents, CacheMapListeners } from "./types";
import { ItemDisplayMethods } from "./enums";

/**
 * An object that performs tracking, calculations and caching.
 * @link https://github.com/DjonnyX/ng-virtual-list/blob/16.x/projects/ng-virtual-list/src/lib/core/track-box.ts
 * @author Evgenii Alexandrovich Grebennikov
 * @email djonnyx@gmail.com
 */
export class TrackBox<C extends BaseVirtualListItemComponent = any>
    extends CacheMap<Id, Cache, CacheMapEvents, CacheMapListeners> {

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

    protected _snappedDisplayComponents: Array<ComponentRef<C>> | null | undefined;

    set snappedDisplayComponents(v: Array<ComponentRef<C>> | null | undefined) {
        if (this._snappedDisplayComponents === v) {
            return;
        }

        this._snappedDisplayComponents = v;
    }

    protected _scrollDirection: ScrollDirection = 0;
    set scrollDirection(v: ScrollDirection) {
        if (this._scrollDirection === v) {
            return;
        }

        this._scrollDirection = v;
    }
    get scrollDirection() { return this._scrollDirection; }

    protected _trackBy: string = TRACK_BY_PROPERTY_NAME;
    set trackBy(v: string) {
        if (this._trackBy === v) {
            return;
        }

        this._trackBy = v;
    }
    get trackBy() { return this._trackBy; }

    protected _divides: number = DEFAULT_DIVIDES;

    set divides(v: number) {
        if (this._divides === v) {
            return;
        }

        this._divides = v;
    }

    protected _isInfinity: boolean = false;

    set isInfinity(v: boolean) {
        if (this._isInfinity === v) {
            return;
        }

        this._isInfinity = v;
    }

    protected _isSnappingMethodAdvanced: boolean = false;

    set isSnappingMethodAdvanced(v: boolean) {
        if (this._isSnappingMethodAdvanced === v) {
            return;
        }

        this._isSnappingMethodAdvanced = v;
    }

    protected _isLazy: boolean = false;

    set isLazy(v: boolean) {
        if (this._isLazy === v) {
            return;
        }

        this._isLazy = v;
    }

    /**
     * Set the trackBy property
     */
    set trackingPropertyName(v: string) {
        this._trackingPropertyName = this._tracker.trackingPropertyName = v;
    }

    protected _trackingPropertyName: string = TRACK_BY_PROPERTY_NAME;

    protected _isScrollStart: boolean = false;

    set isScrollStart(v: boolean) {
        this._isScrollStart = v;
        if (v) {
            this._isScrollSnapToStart = true;
        }
    }

    protected _isScrollEnd: boolean = false;

    set isScrollEnd(v: boolean) {
        this._isScrollEnd = v;
        if (v) {
            this._isScrollSnapToEnd = true;
        }
    }

    protected _isScrollSnapToStart: boolean = false;

    get isSnappedToStart() {
        return this._isScrollStart || this._isScrollSnapToStart;
    }

    protected _isScrollSnapToEnd: boolean = false;

    get isSnappedToEnd() {
        return this._isScrollEnd || this._isScrollSnapToEnd;
    }

    protected _scrollStartOffset: number = 0;
    set scrollStartOffset(v: number) {
        this._scrollStartOffset = v;
    }
    get scrollStartOffset() {
        return this._scrollStartOffset;
    }

    protected _scrollEndOffset: number = 0;
    set scrollEndOffset(v: number) {
        this._scrollEndOffset = v;
    }
    get scrollEndOffset() {
        return this._scrollEndOffset;
    }

    constructor(trackingPropertyName: string) {
        super();

        this._trackingPropertyName = trackingPropertyName;

        this.initialize();
    }

    protected initialize() {
        this._tracker = new Tracker(this._trackingPropertyName);
    }

    override set(id: Id, cache: Cache): CMap<Id, ISize> {
        if (this._map.has(id)) {
            const b = this._map.get(id);
            if (b?.width === cache.width && b?.height === cache.height) {
                return this._map;
            }
        }

        const v = this._map.set(id, cache);

        this.bumpVersion();
        return v;
    }

    protected _previousCollection: Array<IItem> | null | undefined;

    protected _deletedItemsMap: { [index: number]: ISize } = {};

    protected _crudDetected = false;
    get crudDetected() { return this._crudDetected; }

    protected override fireChangeIfNeed() {
        if (this.changesDetected()) {
            this.dispatch(TrackBoxEvents.CHANGE, this._version);
        }
    }

    protected fireTick() {
        this.dispatch(TrackBoxEvents.TICK);
    }

    protected _previousTotalSize = 0;

    protected _deltaOfNewItems: number = 0;
    get deltaOfNewItems() { return this._deltaOfNewItems; }

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

    protected _isReseted: boolean = true;

    private _prerenderedCache: PrerenderCache | null = null;

    private _newItems: Array<Id> = [];

    protected override lifeCircle() {
        this.fireChangeIfNeed();

        this.fireTick();

        this.lifeCircleDo();
    }

    /**
     * Scans the collection for deleted items and flushes the deleted item cache.
     */
    resetCollection<I extends IItem, C extends Array<I>>(currentCollection: C | null | undefined,
        itemSize: number): void {
        if (currentCollection !== undefined && currentCollection !== null &&
            currentCollection === this._previousCollection) {
            console.warn('Attention! The collection must be immutable.');
            return;
        }

        const reseted = ((!this._previousCollection || this._previousCollection.length === 0) &&
            (!!currentCollection && currentCollection.length > 0));

        this._isReseted = reseted;

        this.updateCache(this._previousCollection, currentCollection, itemSize);

        this._previousCollection = [...(currentCollection || [])];
    }

    /**
     * Update the cache of items from the list
     */
    protected updateCache<I extends IItem, C extends Array<I>>(previousCollection: C | null | undefined,
        currentCollection: C | null | undefined,
        itemSize: number): void {
        const trackBy = this._trackingPropertyName;
        let crudDetected = false;
        this._newItems = [];

        if (!currentCollection || currentCollection.length === 0) {
            if (previousCollection) {
                // deleted
                for (let i = 0, l = previousCollection.length; i < l; i++) {
                    const item = previousCollection[i], id = item?.[trackBy];
                    crudDetected = true;
                    if (!!item && this._map.has(id)) {
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
                    const item = currentCollection[i], id = item?.[trackBy];
                    if (!!item) {
                        this._map.set(id, { width: itemSize, height: itemSize, method: ItemDisplayMethods.CREATE });
                    }
                }
            }
            return;
        }
        const collectionDict: IItem<I> = {};
        for (let i = 0, l = currentCollection.length; i < l; i++) {
            const item = currentCollection[i];
            if (!!item) {
                collectionDict[item[trackBy]] = item;
            }
        }
        const notChangedMap: IItem<I> = {}, deletedMap: IItem<I> = {}, deletedItemsMap: { [index: number]: ISize } = {},
            updatedMap: IItem<I> = {};
        for (let i = 0, l = previousCollection.length; i < l; i++) {
            const item = previousCollection[i], id = item?.[trackBy];
            if (!!item) {
                if (collectionDict.hasOwnProperty(id)) {
                    if (item === collectionDict[id]) {
                        // not changed
                        notChangedMap[item[trackBy]] = item;
                        this._map.set(id, {
                            ...(this._map.get(id) || { width: itemSize, height: itemSize }),
                            method: ItemDisplayMethods.NOT_CHANGED
                        });
                        continue;
                    } else {
                        // updated
                        crudDetected = true;
                        updatedMap[item[trackBy]] = item;
                        this._map.set(id, {
                            ...(this._map.get(id) || { width: itemSize, height: itemSize }),
                            method: ItemDisplayMethods.UPDATE
                        });
                        continue;
                    }
                }

                // deleted
                crudDetected = true;
                deletedMap[id] = item;
                deletedItemsMap[i] = this._map.get(id);
                this._map.delete(id);
            }
        }

        for (let i = 0, l = currentCollection.length; i < l; i++) {
            const item = currentCollection[i], id = item?.[trackBy];
            if (!!item && !deletedMap.hasOwnProperty(id) && !updatedMap.hasOwnProperty(id) &&
                !notChangedMap.hasOwnProperty(id)) {
                this._newItems.push(id);
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
    getItemPosition<I extends IItem, C extends Array<I>>(id: Id, itemConfigMap: IVirtualListItemConfigMap,
        options: IGetItemPositionOptions<I, C>): number {
        const opt = { fromItemId: id ?? options.fromItemId, itemConfigMap, ...options };
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

    preventScrollSnapping(clearBuffer: boolean = false) {
        this._isScrollStart = this._isScrollEnd = false;

        if (clearBuffer) {
            this._isScrollSnapToStart = this._isScrollSnapToEnd = false;
        }
    }

    /**
     * Updates the collection of display objects
     */
    getMetrics<I extends IItem, C extends Array<I>>(items: C, itemConfigMap: IVirtualListItemConfigMap,
        options: IUpdateCollectionOptions<I, C>): IGetMetricsReturns {
        const opt = { itemConfigMap, ...options }, crudDetected = this._crudDetected,
            deletedItemsMap = this._deletedItemsMap;
        this._defaultBufferSize = opt.bufferSize;
        this._maxBufferSize = opt.maxBufferSize;

        const metrics = this.recalculateMetrics({
            ...opt,
            collection: items,
            previousTotalSize: this._previousTotalSize,
            crudDetected: this._crudDetected,
            deletedItemsMap,
        });

        return { totalSize: metrics.totalSize, delta: metrics.delta, crudDetected };
    }

    /**
     * Updates the collection of display objects
     */
    updateCollection<I extends IItem, C extends Array<I>>(items: C, itemConfigMap: IVirtualListItemConfigMap,
        options: IUpdateCollectionOptions<I, C>): IUpdateCollectionReturns {
        const opt = { itemConfigMap, ...options }, dynamicSize = opt.dynamicSize, crudDetected = this._crudDetected,
            deletedItemsMap = this._deletedItemsMap;
        if (dynamicSize) {
            this.cacheElements(opt.isVertical, opt.itemSize);
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

        const displayItems = this.generateDisplayCollection(metrics.items, items, itemConfigMap, { ...metrics, });
        return { displayItems, totalSize: metrics.totalSize, delta: metrics.delta, crudDetected, leftLayoutOffset: metrics.leftLayoutOffset };
    }

    protected _previousScrollSize = 0;

    protected updateAdaptiveBufferParams<I extends IItem>(metrics: IMetrics<I>, totalItemsLength: number) {
        this.disposeClearBufferSizeTimer();

        const scrollSize = metrics.scrollSize + this._delta, delta = Math.abs(this._previousScrollSize - scrollSize);
        this._previousScrollSize = scrollSize;
        const bufferRawSize = Math.min(Math.floor(metrics.typicalItemSize !== 0 ? delta / metrics.typicalItemSize : 0) * 5, totalItemsLength),
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
     * Calculates the entry into the overscroll area and returns the number of overscroll elements
     */
    protected getElementNumToEnd<I extends IItem, C extends Array<I>>(i: number, collection: C, map: CMap<Id, ISize>, typicalItemSize: number,
        size: number, isVertical: boolean, indexOffset: number = 0, reverse: boolean = false): { num: number, offset: number } {
        const trackBy = this._trackingPropertyName, sizeProperty = isVertical ? HEIGHT_PROP_NAME : WIDTH_PROP_NAME;
        let offset = 0, num = 0;
        for (let j = collection.length - indexOffset - 1; reverse ? j >= 0 : j >= i; j--) {
            const item = collection[j], id = item[trackBy];
            let itemSize = 0;
            if (map.has(id)) {
                const cache = map.get(id);
                itemSize = cache && cache[sizeProperty] > 0 ? cache[sizeProperty] : typicalItemSize;
            } else {
                itemSize = typicalItemSize;
            }
            if (offset + itemSize > size) {
                return { num, offset };
            }
            offset += itemSize;
            num++;
        }
        return { num, offset };
    }

    /**
     * Calculates list metrics
     */
    protected recalculateMetrics<I extends IItem, C extends Array<I>>(options: IRecalculateMetricsOptions<I, C>): IMetrics<I> {
        const { fromItemId, bounds, collection, dynamicSize, isVertical, itemSize, minItemSize, maxItemSize, bufferSize: minBufferSize,
            scrollSize, stickyEnabled, itemConfigMap, enabledBufferOptimization, previousTotalSize, snapToItem, snapToItemAlign,
            deletedItemsMap, itemTransform } = options as IRecalculateMetricsOptions<I, C> & {
                itemConfigMap: IVirtualListItemConfigMap,
            }, roundedScrollSize = Math.round(scrollSize);

        const trackBy = this._trackingPropertyName, bufferSize = Math.max(minBufferSize, this._bufferSize),
            { width, height } = bounds, sizeProperty = isVertical ? HEIGHT_PROP_NAME : WIDTH_PROP_NAME,
            size = isVertical ? height : width, totalLength = collection.length, typicalItemSize = itemSize,
            w = isVertical ? width : typicalItemSize, h = isVertical ? typicalItemSize : height,
            map = this._map, snapshot = this._snapshot, divides = this._divides,
            stickyPos = Math.floor(scrollSize) + this._scrollStartOffset, leftItemsOrRowsWeights: Array<number> = [],
            isFromId = fromItemId !== undefined && (typeof fromItemId === 'number' && fromItemId > -1)
                || (typeof fromItemId === 'string' && fromItemId > '-1');

        let leftItemsOffset = 0, rightItemsOffset = 0;
        if (enabledBufferOptimization) {
            switch (this._scrollDirection) {
                case 1: {
                    leftItemsOffset = 0;
                    rightItemsOffset = bufferSize * divides;
                    break;
                }
                case -1: {
                    leftItemsOffset = bufferSize * divides;
                    rightItemsOffset = 0;
                    break;
                }
                case 0:
                default: {
                    leftItemsOffset = rightItemsOffset = bufferSize * divides;
                }
            }
        } else {
            leftItemsOffset = rightItemsOffset = bufferSize * divides;
        }

        let itemsFromStartToScrollEnd: number = -1,
            itemsFromDisplayEndToOffsetEnd = 0,
            itemsFromStartToDisplayEnd = -1,
            leftItemLength = 0, rightItemLength = 0,
            leftItemsWeight = 0, rightItemsWeight = 0,
            leftHiddenItemsWeight = 0,
            totalItemsToDisplayEndWeight = 0,
            deltaOfNewItems = 0,
            leftSizeOfAddedItems = 0,
            leftSizeOfUpdatedItems = 0,
            leftSizeOfDeletedItems = 0,
            itemById: I | null = null,
            itemByIdPos: number = this._scrollStartOffset,
            isTargetInOverscroll: boolean = false,
            actualScrollSize = itemByIdPos,
            totalSize = this._scrollStartOffset + this._scrollEndOffset,
            startIndex: number,
            isFromItemIdFound = false,
            deltaFromStartCreation = 0,
            isUpdating = false,
            leftYOffset = 0,
            leftLayoutOffset = 0,
            leftLayoutIndexOffset = 0,
            rightLayoutIndexOffset = 0;

        const isStart = ((roundedScrollSize === 0) || this.isSnappedToStart);
        let stickyItemId: Id | undefined, isNew = false;

        let items: Array<I>;

        // If the list is dynamic or there are new elements in the collection, then it switches to the long algorithm.
        if (dynamicSize) {
            items = [];
            const serviceIdProp = getServiceIdProp(trackBy);
            if (isFromId) {
                for (let stickyId: Id | undefined = undefined, i = 0, l = collection.length; i < l; i++) {
                    const item = collection[i], id = item?.[trackBy];
                    if (itemConfigMap[id]?.sticky === 1) {
                        stickyId = id;
                    }
                    if (!itemConfigMap[id]?.sticky) {
                        stickyItemId = stickyId;
                    }
                    if (id == fromItemId) {
                        break;
                    }
                }
            }

            let y = this._scrollStartOffset,
                stickyComponentSize = 0,
                row: {
                    startItemIndex: number;
                    endItemIndex: number;
                    size: number;
                    snapshotSize: number;
                    deltaFromStartCreation: number;
                    leftSizeOfAddedItems: number;
                    leftSizeOfUpdatedItems: number;
                    leftSizeOfDeletedItems: number;
                    deltaOfNewItems: number;
                    leftItemsOrRowsWeights: number | null;
                    rightItemsWeight: number;
                    leftHiddenItemsWeight: number;
                    totalItemsToDisplayEndWeight: number;
                } = {
                    startItemIndex: 0,
                    endItemIndex: 0,
                    size: 0,
                    snapshotSize: 0,
                    deltaFromStartCreation: 0,
                    leftSizeOfAddedItems: 0,
                    leftSizeOfUpdatedItems: 0,
                    leftSizeOfDeletedItems: 0,
                    deltaOfNewItems: 0,
                    leftItemsOrRowsWeights: null,
                    rightItemsWeight: 0,
                    leftHiddenItemsWeight: 0,
                    totalItemsToDisplayEndWeight: 0,
                };
            const calculate = (i: number, l: number, li: number, isPrecollection: boolean = false, idPrefix: string | null = null) => {
                const ii = i + 1;
                if (ii > l) {
                    return false;
                }
                const collectionItem = collection[i],
                    id = collectionItem[trackBy],
                    sticky = itemConfigMap?.[id]?.sticky ?? 0,
                    isNewRow = i % divides === 0,
                    isLastItemInRow = ii % divides === 0,
                    isLastItem = i === li,
                    isRowEnd = (isLastItemInRow || (!isLastItemInRow && isLastItem));
                items.push(isPrecollection ? { ...collectionItem, [serviceIdProp]: `_${idPrefix}-${id}_` } : collectionItem);
                if (isNewRow || row === null) {
                    row = {
                        startItemIndex: i + 1,
                        endItemIndex: i + divides,
                        size: 0,
                        snapshotSize: 0,
                        deltaFromStartCreation: 0,
                        leftSizeOfAddedItems: 0,
                        leftSizeOfUpdatedItems: 0,
                        leftSizeOfDeletedItems: 0,
                        deltaOfNewItems: 0,
                        leftItemsOrRowsWeights: null,
                        rightItemsWeight: 0,
                        leftHiddenItemsWeight: 0,
                        totalItemsToDisplayEndWeight: 0,
                    };
                }
                let componentSize = 0, rowSizeDelta = 0, itemDisplayMethod: ItemDisplayMethods = ItemDisplayMethods.NOT_CHANGED;
                if (map.has(id)) {
                    const cache = map.get(id);
                    componentSize = cache[sizeProperty] > 0 ? cache[sizeProperty] : typicalItemSize;
                    itemDisplayMethod = cache?.method ?? ItemDisplayMethods.UPDATE;
                    const isItemNew = this._newItems.indexOf(id) > -1 || (this._isLazy && isStart && !this._isReseted);
                    isNew = isItemNew;
                    if (isNew) {
                        isUpdating = true;
                    }
                    const snapshotBounds = snapshot.get(id),
                        snapshotSize = snapshotBounds ? snapshotBounds[sizeProperty] : typicalItemSize;

                    row.size = Math.max(row.size, componentSize);
                    row.snapshotSize = Math.max(row.snapshotSize, snapshotSize);

                    rowSizeDelta = row.size - row.snapshotSize;

                    switch (itemDisplayMethod) {
                        case ItemDisplayMethods.UPDATE: {
                            map.set(id, { ...cache, method: isNew ? ItemDisplayMethods.UPDATE : ItemDisplayMethods.NOT_CHANGED, [IS_NEW]: isNew });
                            if (isRowEnd && isNew && y <= (scrollSize + size + deltaFromStartCreation + componentSize)) {
                                row.deltaFromStartCreation = rowSizeDelta;
                                rowSizeDelta = 0;
                            }
                            break;
                        }
                        case ItemDisplayMethods.CREATE: {
                            rowSizeDelta = typicalItemSize;
                            map.set(id, { ...cache, method: ItemDisplayMethods.UPDATE, [IS_NEW]: isNew });
                            if (isRowEnd && isNew && y <= (scrollSize + size + deltaFromStartCreation + componentSize)) {
                                row.deltaFromStartCreation = rowSizeDelta;
                                rowSizeDelta = 0;
                            }
                            break;
                        }
                    }
                } else {
                    componentSize = typicalItemSize;
                    row.size = Math.max(row.size, componentSize);
                    row.snapshotSize = row.size;
                    rowSizeDelta = row.size - row.snapshotSize;
                }

                if (deletedItemsMap.hasOwnProperty(i)) {
                    const cache = deletedItemsMap[i], size = cache?.[sizeProperty] ?? typicalItemSize;
                    if (y < scrollSize + this._scrollStartOffset - size) {
                        row.leftSizeOfDeletedItems = Math.max(row.leftSizeOfDeletedItems, size);
                    }
                }

                if (isFromId) {
                    if (itemById === null) {
                        if (id != fromItemId && id === stickyItemId && sticky === 1) {
                            stickyComponentSize = componentSize;
                            y -= stickyComponentSize;
                        }

                        if (id == fromItemId) {
                            isFromItemIdFound = true;

                            const { num, offset } = this.getElementNumToEnd(i, collection, map, typicalItemSize, size, isVertical),
                                leftViewportSize = size - offset;
                            if (leftViewportSize > 0) {
                                const { num: num1, offset: offset1 } = this.getElementNumToEnd(i + num, collection, map, typicalItemSize, size, isVertical, 0, true),
                                    deltaNum = (num1 - num), deltaOffset = (offset1 - offset);
                                totalItemsToDisplayEndWeight += offset;
                                itemsFromStartToScrollEnd -= deltaNum;
                                rightItemsWeight = rightItemLength = 0;
                                leftHiddenItemsWeight -= deltaOffset;
                                leftItemsOrRowsWeights.splice(leftItemsOrRowsWeights.length - deltaNum, deltaNum);
                                y -= deltaOffset;
                            }

                            itemById = collectionItem;
                            itemByIdPos = y;
                        } else {
                            leftItemsOrRowsWeights.push(componentSize);
                            leftHiddenItemsWeight += componentSize;
                            itemsFromStartToScrollEnd = row.startItemIndex;
                        }
                    }
                } else if (y <= scrollSize - componentSize) {
                    if (row.leftItemsOrRowsWeights === null) {
                        row.leftItemsOrRowsWeights = 0;
                    }
                    row.leftItemsOrRowsWeights = Math.max(row.leftItemsOrRowsWeights, componentSize);
                    row.leftHiddenItemsWeight = Math.max(row.leftHiddenItemsWeight, componentSize);
                    if (!isPrecollection) {
                        itemsFromStartToScrollEnd = row.startItemIndex;
                    }
                }

                if (isFromId) {
                    if (itemById === null || y < itemByIdPos + size + componentSize) {
                        itemsFromStartToDisplayEnd = row.endItemIndex;
                        totalItemsToDisplayEndWeight += componentSize;
                        itemsFromDisplayEndToOffsetEnd = itemsFromStartToDisplayEnd + rightItemsOffset;
                    }
                } else if (y <= scrollSize + size + componentSize) {
                    if (!isPrecollection) {
                        itemsFromStartToDisplayEnd = row.endItemIndex;
                        itemsFromDisplayEndToOffsetEnd = itemsFromStartToDisplayEnd + rightItemsOffset;
                    }
                    row.totalItemsToDisplayEndWeight = Math.max(row.totalItemsToDisplayEndWeight, componentSize);

                    if (isRowEnd && y <= scrollSize + componentSize) {
                        switch (itemDisplayMethod) {
                            case ItemDisplayMethods.CREATE: {
                                row.leftSizeOfAddedItems = rowSizeDelta;
                                break;
                            }
                            case ItemDisplayMethods.UPDATE:
                            case ItemDisplayMethods.NOT_CHANGED: {
                                row.leftSizeOfUpdatedItems = rowSizeDelta;
                                break;
                            }
                            case ItemDisplayMethods.DELETE: {
                                row.leftSizeOfDeletedItems = rowSizeDelta;
                                break;
                            }
                        }
                    }

                    if (isRowEnd && itemDisplayMethod === ItemDisplayMethods.CREATE) {
                        row.deltaOfNewItems = rowSizeDelta;
                    }
                } else {
                    if (isRowEnd && i < itemsFromDisplayEndToOffsetEnd) {
                        row.rightItemsWeight = Math.max(row.rightItemsWeight, componentSize);
                    }
                }

                if (isRowEnd) {
                    if (!isPrecollection) {
                        deltaFromStartCreation += row.deltaFromStartCreation;
                        leftSizeOfAddedItems += row.leftSizeOfAddedItems;
                        leftSizeOfUpdatedItems += row.leftSizeOfUpdatedItems;
                        leftSizeOfDeletedItems += row.leftSizeOfDeletedItems;
                        deltaOfNewItems += row.deltaOfNewItems;
                        rightItemsWeight += row.rightItemsWeight;
                        totalItemsToDisplayEndWeight += row.totalItemsToDisplayEndWeight;
                        leftHiddenItemsWeight += row.leftHiddenItemsWeight;
                        if (row.leftItemsOrRowsWeights !== null) {
                            leftItemsOrRowsWeights.push(row.leftItemsOrRowsWeights);
                        }
                    }
                    totalSize += row.size;
                    y += row.size;
                }
                return true;
            }

            if (this._isInfinity) {
                const viewportSize = isVertical ? height : width;
                let buffSize = -1;
                if (scrollSize <= viewportSize) {
                    let i = 0, l = collection.length, li = l > 0 ? (l - 1) : 0;
                    if (l > 0) {
                        const limit = viewportSize;
                        while (y <= limit || buffSize > -1) {
                            const ii = i + 1;
                            if (buffSize === -1) {
                                buffSize = leftItemsOffset;
                            }
                            if (y >= limit) {
                                buffSize--;
                            }
                            if (!calculate(li - i, l, li, true, START_COLLECTION_PREFIX_ID)) {
                                break;
                            }
                            if (ii === l) {
                                i = 0;
                            } else {
                                i++;
                            }
                        }

                        items.reverse();
                        leftYOffset = y;
                        leftLayoutOffset = viewportSize * .5;
                        leftLayoutIndexOffset = i;
                        y = this._scrollStartOffset;
                        totalSize = this._scrollStartOffset + this._scrollEndOffset;
                        itemsFromStartToDisplayEnd = itemsFromDisplayEndToOffsetEnd = 0;

                        (row as any) = null;
                    }
                }
            }

            for (let i = 0, l = collection.length, li = l - 1; i < l; i++) {
                if (!calculate(i, l, li)) {
                    break;
                }
            }

            if (this._isInfinity) {
                (row as any) = null;

                const yy = y, currentTotalSize = totalSize, viewportSize = isVertical ? height : width,
                    normalizedTotalSize = totalSize + viewportSize;
                row = {
                    startItemIndex: 0,
                    endItemIndex: 0,
                    size: 0,
                    snapshotSize: 0,
                    deltaFromStartCreation: 0,
                    leftSizeOfAddedItems: 0,
                    leftSizeOfUpdatedItems: 0,
                    leftSizeOfDeletedItems: 0,
                    deltaOfNewItems: 0,
                    leftItemsOrRowsWeights: null,
                    rightItemsWeight: 0,
                    leftHiddenItemsWeight: 0,
                    totalItemsToDisplayEndWeight: 0,
                };
                const l = collection.length, li = l - 1;
                let i = 0, count = 0;
                while (y < normalizedTotalSize) {
                    const ii = i + 1;
                    if (!calculate(i, l, li, true, END_COLLECTION_PREFIX_ID)) {
                        break;
                    }
                    if (ii === l) {
                        i = 0;
                    } else {
                        i++;
                    }
                    count++;
                }
                y = yy;
                totalSize = currentTotalSize;
                rightLayoutIndexOffset = count;
            }

            actualScrollSize = (isFromId ? itemByIdPos : scrollSize);

            if (itemsFromStartToScrollEnd <= -1) {
                itemsFromStartToScrollEnd = 0;
            }
            if (itemsFromStartToDisplayEnd <= -1) {
                itemsFromStartToDisplayEnd = 0;
            }

            leftItemsOrRowsWeights.splice(0, leftItemsOrRowsWeights.length - bufferSize);
            leftItemsOrRowsWeights.forEach(v => {
                leftItemsWeight += v;
            });

            leftItemLength = Math.min(itemsFromStartToScrollEnd, leftItemsOffset);
            rightItemLength = itemsFromStartToDisplayEnd + rightItemsOffset > totalLength
                ? totalLength - itemsFromStartToDisplayEnd : rightItemsOffset;

            startIndex = (Math.ceil(Math.min(itemsFromStartToScrollEnd - leftItemLength, totalLength > 0 ? totalLength - 1 : 0) / divides) * divides);
        } else
        // Buffer optimization does not work on fast linear algorithm
        {
            const dividedTypicalItemSize = typicalItemSize / divides, bufferItemNumbers = bufferSize * divides;
            itemsFromStartToScrollEnd = Math.floor(dividedTypicalItemSize !== 0 ? (scrollSize / dividedTypicalItemSize) : 0);
            itemsFromStartToDisplayEnd = Math.ceil(dividedTypicalItemSize !== 0 ? ((scrollSize + size) / dividedTypicalItemSize) : 0);
            leftItemLength = Math.min(itemsFromStartToScrollEnd, bufferSize * divides);
            rightItemLength = (itemsFromStartToDisplayEnd + bufferItemNumbers) > totalLength
                ? totalLength - itemsFromStartToDisplayEnd : bufferItemNumbers;
            leftItemsWeight = Math.floor(leftItemLength * dividedTypicalItemSize / typicalItemSize) * typicalItemSize;
            rightItemsWeight = Math.floor(rightItemLength * dividedTypicalItemSize / typicalItemSize) * typicalItemSize;
            leftHiddenItemsWeight = Math.floor(itemsFromStartToScrollEnd * dividedTypicalItemSize / typicalItemSize) * typicalItemSize;
            totalItemsToDisplayEndWeight = Math.floor(itemsFromStartToDisplayEnd * dividedTypicalItemSize / typicalItemSize) * typicalItemSize;
            totalSize = (totalLength * dividedTypicalItemSize) + this._scrollStartOffset + this._scrollEndOffset;
            const k = totalSize !== 0 ? previousTotalSize / totalSize : 0;

            if (isFromId) {
                const index = collection.findIndex(item => item[trackBy] == fromItemId);
                if (index > -1) {
                    itemByIdPos = this._scrollStartOffset + Math.floor(index * dividedTypicalItemSize / divides);
                    isFromItemIdFound = true;
                }
            }

            actualScrollSize = (isFromId ? itemByIdPos : scrollSize * k);

            items = [];

            if (this._isInfinity) {
                const viewportSize = isVertical ? height : width;
                let buffSize = -1, y = this._scrollStartOffset;
                if (scrollSize <= viewportSize) {
                    let i = 0, l = collection.length, li = l > 0 ? (l - 1) : 0;
                    if (l > 0) {
                        const limit = viewportSize;
                        while (y <= limit || buffSize > -1) {
                            const ii = i + 1;
                            if (buffSize === -1) {
                                buffSize = leftItemsOffset;
                            }
                            if (y >= limit) {
                                buffSize--;
                            }
                            const itemIndex = li - i;
                            if (collection.length > itemIndex) {
                                items.push(collection[itemIndex] as I);
                            } else {
                                break;
                            }
                            const isLastItemInRow = ii % divides === 0,
                                isLastItem = i === li;
                            if (isLastItemInRow || (!isLastItemInRow && isLastItem)) {
                                y += dividedTypicalItemSize;
                            }
                            if (ii === l) {
                                i = 0;
                            } else {
                                i++;
                            }
                        }

                        items.reverse();
                        leftYOffset = y;
                        leftLayoutOffset = viewportSize * .5;
                        leftLayoutIndexOffset = i;
                    }
                }
            }

            items.push(...collection);

            if (this._isInfinity) {
                let y = Math.floor(totalSize / dividedTypicalItemSize) * dividedTypicalItemSize;
                const viewportSize = isVertical ? height : width,
                    normalizedTotalSize = totalSize + viewportSize;
                const l = collection.length, li = l - 1;
                let i = 0, count = 0;
                while (y < normalizedTotalSize) {
                    const ii = i + 1;
                    if (collection.length <= i) {
                        break;
                    }
                    items.push(collection[i]);
                    const isLastItemInRow = ii % divides === 0,
                        isLastItem = i === li;
                    if (isLastItemInRow || (!isLastItemInRow && isLastItem)) {
                        y += dividedTypicalItemSize;
                    }
                    if (ii === l) {
                        i = 0;
                    } else {
                        i++;
                    }
                    count++;
                }
                rightLayoutIndexOffset = count;
                leftItemLength = Math.min(itemsFromStartToScrollEnd, leftItemsOffset);
                rightItemLength = itemsFromStartToDisplayEnd + rightItemsOffset > totalLength
                    ? totalLength - itemsFromStartToDisplayEnd : rightItemsOffset;

                startIndex = (Math.ceil(Math.min(itemsFromStartToScrollEnd - leftItemLength, totalLength > 0 ? totalLength - 1 : 0) / divides) * divides);
            } else {
                startIndex = Math.min(itemsFromStartToScrollEnd - leftItemLength, totalLength > 0 ? totalLength - 1 : 0);
            }
        }

        const itemsOnDisplayWeight = totalItemsToDisplayEndWeight - leftItemsWeight,
            itemsOnDisplayLength = itemsFromStartToDisplayEnd - itemsFromStartToScrollEnd,
            startPosition = this._scrollStartOffset + leftHiddenItemsWeight - leftItemsWeight - leftYOffset,
            renderItems = (Math.ceil((itemsOnDisplayLength + leftItemLength + rightItemLength) / divides) * divides) + rightLayoutIndexOffset,
            startCreationDelta = deltaFromStartCreation > 0 ? deltaFromStartCreation : 0,
            delta = leftSizeOfUpdatedItems + leftSizeOfAddedItems - leftSizeOfDeletedItems + startCreationDelta;
        this._deltaOfNewItems = deltaOfNewItems;

        if (isFromId && !isTargetInOverscroll) {
            actualScrollSize -= this._scrollStartOffset;
        }

        const metrics: IMetrics<I> = {
            delta,
            normalizedItemWidth: w,
            normalizedItemHeight: h,
            width,
            height,
            dynamicSize,
            divides,
            itemSize,
            minItemSize,
            maxItemSize,
            items,
            itemsFromStartToScrollEnd,
            itemsFromStartToDisplayEnd,
            itemsOnDisplayWeight,
            itemsOnDisplayLength,
            isVertical,
            leftHiddenItemsWeight,
            leftItemLength,
            leftItemsWeight,
            leftLayoutOffset,
            leftLayoutIndexOffset,
            renderItems,
            rightItemLength,
            rightItemsWeight,
            scrollSize: actualScrollSize,
            leftSizeOfAddedItems,
            sizeProperty,
            stickyEnabled,
            stickyPos,
            startIndex,
            startPosition,
            totalItemsToDisplayEndWeight,
            totalLength,
            totalSize,
            typicalItemSize,
            isFromItemIdFound,
            isUpdating,
            snapToItem,
            snapToItemAlign,
            itemTransform,
        };

        return metrics;
    }

    refreshCache(cache: PrerenderCache) {
        this._prerenderedCache = cache;
    }

    clearDelta(): void {
        this._delta = this._deltaOfNewItems = 0;
    }

    changes(immediately: boolean = false, force: boolean = false): void {
        if (immediately) {
            if (force) {
                this.bumpVersion();
            }
            this._previousVersion = this._version;
            this.dispatch(CACHE_BOX_CHANGE_EVENT_NAME as CacheMapEvents, this.version);
        } else {
            if (force) {
                this.bumpVersion();
                return;
            }
            if (this.changesDetected()) {
                return;
            }
            this.bumpVersion();
        }
    }

    /**
     * Returns true if the bounds of at least one screen object have changed.
     */
    checkBoundsOfElements(): boolean {
        if (!this._displayComponents) {
            return false;
        }

        for (let i = 0, l = this._displayComponents.length; i < l; i++) {
            const component = this._displayComponents[i], itemId = component.instance.itemId;
            if (itemId === undefined) {
                continue;
            }
            const bounds = component.instance.getBounds(), cache = this.get(itemId);
            if (!!bounds && !!cache) {
                if (bounds.width !== cache.width || bounds.height !== cache.height) {
                    return true;
                }
            }
        }
        return false;
    }

    protected generateDisplayCollection<I extends IItem, C extends Array<I>>(items: C, actualItems: C, itemConfigMap: IVirtualListItemConfigMap,
        metrics: IMetrics<I>): IRenderVirtualListCollection {
        const {
            width,
            height,
            normalizedItemWidth,
            normalizedItemHeight,
            dynamicSize,
            divides,
            itemsOnDisplayLength,
            itemsFromStartToScrollEnd,
            isVertical,
            leftLayoutOffset: layoutOffset,
            leftLayoutIndexOffset: layoutIndexOffset,
            renderItems: renderItemsLength,
            scrollSize,
            sizeProperty,
            stickyEnabled,
            stickyPos,
            startPosition,
            totalLength,
            startIndex,
            typicalItemSize,
            minItemSize,
            maxItemSize,
            snapToItem,
            snapToItemAlign,
            itemTransform,
        } = metrics,
            displayItems: IRenderVirtualListCollection = [];

        if (items.length) {
            const trackBy = this._trackingPropertyName, actualSnippedPosition = stickyPos,
                isSnappingMethodAdvanced = this._isSnappingMethodAdvanced,
                deltaOffet = (isSnappingMethodAdvanced ? scrollSize : 0),
                scrollDirection = this._scrollDirection,
                boundsSize = isVertical ? height : width, actualEndSnippedPosition = scrollSize + boundsSize - this._scrollEndOffset;
            let pos = startPosition,
                renderItems = renderItemsLength,
                stickyItem: IRenderVirtualListItem | undefined, nextSticky: IRenderVirtualListItem | undefined, stickyItemIndex = -1,
                stickyItemSize = 0, endStickyItem: IRenderVirtualListItem | undefined, nextEndSticky: IRenderVirtualListItem | undefined,
                endStickyItemIndex = -1, endStickyItemSize = 0;

            const li = layoutIndexOffset + actualItems.length - 1;
            if (stickyEnabled) {
                for (let i = Math.min(itemsFromStartToScrollEnd > 0 ? (divides > 1 ? (itemsFromStartToScrollEnd - 1) : itemsFromStartToScrollEnd) : 0, totalLength - 1); i >= 0; i--) {
                    const collectionItem = items[i],
                        isDummy = collectionItem?.[SERVICE_PROP_DUMMY] && (collectionItem?.[SERVICE_PROP_DUMMY] === SERVICE_PROP_DUMMY_ENABLED);
                    if (!collectionItem || isDummy) {
                        continue;
                    }
                    const rowIndex = Math.floor(((items.length - layoutIndexOffset + i) + 1) / divides), id = collectionItem[trackBy], cache = this.get(id)!, sticky = itemConfigMap[id]?.sticky ?? 0,
                        selectable = itemConfigMap[id]?.selectable ?? true,
                        collapsable = itemConfigMap[id]?.collapsable ?? false,
                        size = dynamicSize ? cache?.[sizeProperty] > 0 ? cache?.[sizeProperty] : typicalItemSize : typicalItemSize,
                        absoluteStartPosition = pos - (scrollSize - size) - size,
                        ratio = size !== 0 ? boundsSize / size : 0, absoluteStartPositionPercent = -(boundsSize !== 0 ? absoluteStartPosition / boundsSize : 0) * ratio,
                        absoluteEndPosition = boundsSize - (absoluteStartPositionPercent + size),
                        absoluteEndPositionPercent = (absoluteStartPositionPercent + (boundsSize !== 0 ? (absoluteEndPosition + size) / boundsSize : 0) * ratio),
                        x = isVertical ? 0 : actualSnippedPosition,
                        y = isVertical ? actualSnippedPosition : 0;
                    if (sticky === 1) {
                        const isOdd = (items.length - layoutIndexOffset + i) % 2 != 0,
                            measures: IRenderVirtualListItemMeasures = {
                                x,
                                y,
                                transformedX: x,
                                transformedY: y,
                                z: 0,
                                rotationX: 0,
                                rotationY: 0,
                                rotationZ: 0,
                                scaleX: 1,
                                scaleY: 1,
                                scaleZ: 1,
                                width: isVertical ? normalizedItemWidth : size,
                                height: isVertical ? size : normalizedItemHeight,
                                minWidth: minItemSize,
                                minHeight: minItemSize,
                                maxWidth: maxItemSize,
                                maxHeight: maxItemSize,
                                size,
                                row: {
                                    size,
                                    odd: rowIndex % 2 != 0,
                                    even: rowIndex % 2 == 0,
                                },
                                position: pos,
                                boundsSize,
                                scrollSize,
                                absoluteStartPosition,
                                absoluteStartPositionPercent,
                                absoluteEndPosition,
                                absoluteEndPositionPercent,
                                scrollDirection,
                                delta: sticky === 1 ? this._scrollStartOffset : sticky === 2 ? actualEndSnippedPosition - deltaOffet - size : 0,
                            }, config: IRenderVirtualListItemConfig = {
                                fullSize: true,
                                isFirst: i === layoutIndexOffset,
                                isLast: i === li,
                                new: (cache as Cache)?.[IS_NEW] === true,
                                odd: isOdd,
                                even: !isOdd,
                                isVertical,
                                collapsable,
                                selectable,
                                sticky,
                                snap: stickyEnabled,
                                snapped: true,
                                snappedOut: false,
                                dynamic: dynamicSize,
                                isSnappingMethodAdvanced,
                                layoutOffset,
                                layoutIndexOffset,
                                totalItems: items.length,
                                snapToItem,
                                snapToItemAlign,
                                tabIndex: i - layoutIndexOffset,
                                divides,
                                opacity: 1,
                                zIndex: Z_INDEX_1,
                            };

                        const itemData: I = collectionItem;

                        stickyItem = {
                            index: i, id, measures, data: itemData, previouseData: i > 0 ? items[i - 1] : null,
                            nextData: i < totalLength ? items[i + 1] : null, config,
                        };
                        stickyItemIndex = i;
                        stickyItemSize = size;

                        displayItems.push(stickyItem);
                        break;
                    }
                }
            }

            if (stickyEnabled) {
                const si = itemsFromStartToScrollEnd + itemsOnDisplayLength - 1, startIndex = si < 0 ? si : si;
                for (let i = Math.min(startIndex, totalLength > 0 ? totalLength - 1 : 0),
                    rowIndex = Math.floor(((items.length - layoutIndexOffset + i) + 1) / divides),
                    l = totalLength; i < l; i++) {
                    const collectionItem = items[i],
                        isDummy = collectionItem?.[SERVICE_PROP_DUMMY] && (collectionItem?.[SERVICE_PROP_DUMMY] === SERVICE_PROP_DUMMY_ENABLED);
                    if (!collectionItem || isDummy) {
                        continue;
                    }
                    const id = collectionItem[trackBy], cache = this.get(id)!, sticky = itemConfigMap[id]?.sticky ?? 0,
                        selectable = itemConfigMap[id]?.selectable ?? true,
                        collapsable = itemConfigMap[id]?.collapsable ?? false,
                        size = dynamicSize
                            ? cache?.[sizeProperty] || typicalItemSize
                            : typicalItemSize;
                    if (sticky === 2) {
                        const isOdd = (items.length - layoutIndexOffset + i) % 2 != 0,
                            w = isVertical ? normalizedItemWidth : size, h = isVertical ? size : normalizedItemHeight,
                            absoluteStartPosition = pos - (scrollSize - size) - size, ratio = size !== 0 ? boundsSize / size : 0, absoluteStartPositionPercent = -(boundsSize !== 0 ? absoluteStartPosition / boundsSize : 0) * ratio,
                            absoluteEndPosition = boundsSize - (absoluteStartPositionPercent + size),
                            absoluteEndPositionPercent = (absoluteStartPositionPercent + (boundsSize !== 0 ? (absoluteEndPosition + size) / boundsSize : 0) * ratio),
                            x = isVertical ? 0 : actualEndSnippedPosition - w,
                            y = isVertical ? actualEndSnippedPosition - h : 0,
                            measures: IRenderVirtualListItemMeasures = {
                                x,
                                y,
                                transformedX: x,
                                transformedY: y,
                                z: 0,
                                rotationX: 0,
                                rotationY: 0,
                                rotationZ: 0,
                                scaleX: 1,
                                scaleY: 1,
                                scaleZ: 1,
                                size,
                                row: {
                                    size,
                                    odd: rowIndex % 2 != 0,
                                    even: rowIndex % 2 == 0,
                                },
                                position: pos,
                                boundsSize,
                                scrollSize,
                                absoluteStartPosition,
                                absoluteStartPositionPercent,
                                absoluteEndPosition,
                                absoluteEndPositionPercent,
                                width: w,
                                height: h,
                                minWidth: minItemSize,
                                minHeight: minItemSize,
                                maxWidth: maxItemSize,
                                maxHeight: maxItemSize,
                                scrollDirection,
                                delta: actualEndSnippedPosition - deltaOffet - size,
                            }, config: IRenderVirtualListItemConfig = {
                                fullSize: true,
                                isFirst: i === layoutIndexOffset,
                                isLast: i === li,
                                new: (cache as Cache)?.[IS_NEW] === true,
                                odd: isOdd,
                                even: !isOdd,
                                isVertical,
                                collapsable,
                                selectable,
                                sticky,
                                snap: stickyEnabled,
                                snapped: true,
                                snappedOut: false,
                                dynamic: dynamicSize,
                                isSnappingMethodAdvanced,
                                layoutOffset,
                                layoutIndexOffset,
                                totalItems: items.length,
                                snapToItem,
                                snapToItemAlign,
                                tabIndex: i - layoutIndexOffset,
                                divides,
                                opacity: 1,
                                zIndex: Z_INDEX_1,
                            };

                        const itemData: I = collectionItem;

                        endStickyItem = {
                            index: i, id, measures, data: itemData, previouseData: i > 0 ? items[i - 1] : null,
                            nextData: i < totalLength ? items[i + 1] : null, config,
                        };
                        endStickyItemIndex = i;
                        endStickyItemSize = size;

                        displayItems.push(endStickyItem);
                        break;
                    }
                }
            }

            const collectionLength = items.length;
            let i = startIndex,
                ci = 0,
                row: {
                    size: number;
                    odd: boolean;
                    even: boolean;
                } = {
                    size: 0,
                    odd: false,
                    even: false,
                };
            while (renderItems > 0) {
                if (i >= collectionLength) {
                    break;
                }
                const collectionItem = items[i];
                if (!collectionItem) {
                    break;
                }

                const isDummy = collectionItem?.[SERVICE_PROP_DUMMY] && (collectionItem?.[SERVICE_PROP_DUMMY] === SERVICE_PROP_DUMMY_ENABLED),
                    ii = i + 1,
                    rowIndex = Math.floor(((items.length - layoutIndexOffset + i) + 1) / divides),
                    id = collectionItem[trackBy],
                    cache = this.get(id)!,
                    size = isDummy ? typicalItemSize : (dynamicSize ? cache?.[sizeProperty] || typicalItemSize : typicalItemSize),
                    divSize = (isVertical ? normalizedItemWidth : normalizedItemHeight) / divides;

                if (i % divides === 0) {
                    ci = 0;
                    row = {
                        size,
                        odd: rowIndex % 2 !== 0,
                        even: rowIndex % 2 === 0,
                    };
                } else {
                    row.size = Math.max(row.size, size);
                    ci++;
                }

                if (!isDummy) {
                    if ((isSnappingMethodAdvanced || id !== stickyItem?.id) && id !== endStickyItem?.id) {
                        const isOdd = (items.length - layoutIndexOffset + i) % 2 != 0,
                            sticky = itemConfigMap[id]?.sticky ?? 0,
                            fullSize = itemConfigMap[id]?.fullSize ?? false,
                            selectable = itemConfigMap[id]?.selectable ?? true,
                            collapsable = itemConfigMap[id]?.collapsable ?? false,
                            snapped = stickyEnabled && (sticky === 1 && (pos <= scrollSize + this._scrollStartOffset) || sticky === 2 && (pos >= scrollSize + boundsSize - size)),
                            absoluteStartPosition = pos - scrollSize, ratio = size !== 0 ? boundsSize / size : 0, absoluteStartPositionPercent = -(boundsSize !== 0 ? absoluteStartPosition / boundsSize : 0) * ratio,
                            absoluteEndPosition = boundsSize - (absoluteStartPositionPercent + size),
                            absoluteEndPositionPercent = (absoluteStartPositionPercent + (boundsSize !== 0 ? (absoluteEndPosition + size) / boundsSize : 0) * ratio),
                            x = isVertical ? divSize * ((sticky || fullSize) ? 0 : ci) : pos,
                            y = isVertical ? pos : divSize * ((sticky || fullSize) ? 0 : ci),
                            measures: IRenderVirtualListItemMeasures = {
                                x,
                                y,
                                transformedX: x,
                                transformedY: y,
                                z: 0,
                                rotationX: 0,
                                rotationY: 0,
                                rotationZ: 0,
                                scaleX: 1,
                                scaleY: 1,
                                scaleZ: 1,
                                size,
                                row,
                                position: pos,
                                boundsSize,
                                scrollSize,
                                absoluteStartPosition,
                                absoluteStartPositionPercent,
                                absoluteEndPosition,
                                absoluteEndPositionPercent,
                                width: isVertical ? ((sticky || fullSize) ? normalizedItemWidth : (normalizedItemWidth / divides)) : size,
                                height: isVertical ? size : ((sticky || fullSize) ? normalizedItemHeight : (normalizedItemHeight / divides)),
                                minWidth: minItemSize,
                                minHeight: minItemSize,
                                maxWidth: maxItemSize,
                                maxHeight: maxItemSize,
                                scrollDirection,
                                delta: sticky === 1 ? actualSnippedPosition : sticky === 2 ? actualEndSnippedPosition - deltaOffet - size : 0,
                            }, config: IRenderVirtualListItemConfig = {
                                isFirst: i === layoutIndexOffset,
                                isLast: i === li,
                                new: (cache as Cache)?.[IS_NEW] === true,
                                odd: isOdd,
                                even: !isOdd,
                                isVertical,
                                collapsable,
                                selectable,
                                sticky: sticky,
                                snap: stickyEnabled,
                                snapped: false,
                                snappedOut: false,
                                dynamic: dynamicSize,
                                isSnappingMethodAdvanced,
                                layoutOffset,
                                layoutIndexOffset,
                                totalItems: items.length,
                                snapToItem,
                                snapToItemAlign,
                                tabIndex: i - layoutIndexOffset,
                                isStub: (isSnappingMethodAdvanced && id === stickyItem?.id),
                                divides,
                                opacity: 1,
                                zIndex: Z_INDEX_0,
                                fullSize,
                            };

                        if (snapped) {
                            config.zIndex = Z_INDEX_2;
                        }

                        const itemData: I = collectionItem;

                        const item: IRenderVirtualListItem = {
                            index: i, id, measures, data: itemData, previouseData: i > 0 ? items[i - 1] : null,
                            nextData: i < totalLength ? items[i + 1] : null, config,
                        };
                        if (!nextSticky && stickyItemIndex < i && sticky === 1 && (pos <= scrollSize + this._scrollStartOffset + size + stickyItemSize)) {
                            item.measures.x = isVertical ? 0 : snapped ? actualSnippedPosition : pos;
                            item.measures.y = isVertical ? snapped ? actualSnippedPosition : pos : 0;
                            nextSticky = item;
                            nextSticky.config.snapped = snapped;
                            nextSticky.measures.delta = (isVertical ? item.measures.y : item.measures.x) - scrollSize;
                            nextSticky.config.zIndex = Z_INDEX_3;
                        }
                        if (!nextEndSticky && endStickyItemIndex > i && sticky === 2 &&
                            (pos >= actualEndSnippedPosition - size - endStickyItemSize)) {
                            item.measures.x = isVertical ? 0 : snapped ? actualEndSnippedPosition - size : pos;
                            item.measures.y = isVertical ? snapped ? actualEndSnippedPosition - size : pos : 0;
                            nextEndSticky = item;
                            nextEndSticky.config.zIndex = Z_INDEX_3;
                            nextEndSticky.config.snapped = snapped;
                            nextEndSticky.measures.delta = (isVertical ? item.measures.y : item.measures.x) - scrollSize;
                        }

                        displayItems.push(item);
                    }
                }

                renderItems--;
                if (ii % divides === 0 || renderItems <= 0) {
                    pos += row.size;
                }
                i++;
            }

            const axis = isVertical ? Y_PROP_NAME : X_PROP_NAME;

            if (!!nextSticky && !!stickyItem && nextSticky.measures[axis] <= actualSnippedPosition + stickyItemSize) {
                if (nextSticky.measures[axis] > scrollSize - stickyItemSize) {
                    stickyItem.measures[axis] = nextSticky.measures[axis] - stickyItemSize;
                    stickyItem.config.snapped = nextSticky.config.snapped = false;
                    stickyItem.config.snappedOut = true;
                    stickyItem.config.sticky = 1;
                    stickyItem.measures.delta = (isVertical ? stickyItem.measures.y : stickyItem.measures.x) - scrollSize;
                } else {
                    nextSticky.config.snapped = true;
                    nextSticky.measures.delta = (isVertical ? nextSticky.measures.y : nextSticky.measures.x) - scrollSize;
                    stickyItem.measures[axis] = stickyItem.measures[axis] + stickyItem.measures[sizeProperty];
                }
            }

            if (!!nextEndSticky && !!endStickyItem &&
                (nextEndSticky.measures[axis] >= actualEndSnippedPosition - endStickyItemSize - nextEndSticky.measures[sizeProperty])) {
                if (nextEndSticky.measures[axis] < actualEndSnippedPosition - nextEndSticky.measures[sizeProperty]) {
                    endStickyItem.measures[axis] = nextEndSticky.measures[axis] + nextEndSticky.measures[sizeProperty];
                    endStickyItem.config.snapped = nextEndSticky.config.snapped = false;
                    endStickyItem.config.snappedOut = true;
                    endStickyItem.config.sticky = 2;
                    endStickyItem.measures.delta = (isVertical ? endStickyItem.measures.y : endStickyItem.measures.x) - scrollSize;
                } else {
                    nextEndSticky.config.snapped = true;
                    nextEndSticky.measures[axis] = actualEndSnippedPosition - nextEndSticky.measures[sizeProperty];
                    nextEndSticky.measures.delta = (isVertical ? nextEndSticky.measures.y : nextEndSticky.measures.x) - scrollSize;
                    endStickyItem.measures[axis] = nextEndSticky.measures[axis] + nextEndSticky.measures[sizeProperty];
                }
            }

            if (itemTransform !== null) {
                for (let i = 0, l = displayItems.length; i < l; i++) {
                    const item = displayItems[i];
                    if (!!item) {
                        const transformation = itemTransform(item.index, objectAsReadonly(item.measures), objectAsReadonly(item.config));
                        item.measures.transformedX = transformation.x;
                        item.measures.transformedY = transformation.y;
                        item.measures.z = transformation.z;
                        item.measures.rotationX = transformation.rotationX;
                        item.measures.rotationY = transformation.rotationY;
                        item.measures.rotationZ = transformation.rotationZ;
                        item.measures.scaleX = transformation.scaleX;
                        item.measures.scaleY = transformation.scaleY;
                        item.measures.scaleZ = transformation.scaleZ;
                        item.config.opacity = transformation.opacity;
                        item.config.filter = transformation.filter;
                        item.config.blendColor = transformation.blendColor;
                        item.config.zIndex = String(transformation.zIndex);
                    }
                }
            }
        }
        return displayItems;
    }

    resetPositions() {
        this._tracker.clearTrackMap();

        this.track();
    }

    /**
     * tracking by propName
     */
    track(): void {
        if (!this._items || !this._displayComponents) {
            return;
        }

        this._tracker.track(this._items, this._displayComponents, this._snappedDisplayComponents, this._scrollDirection, this._trackBy);
    }

    setDisplayObjectIndexMapById(v: { [id: number]: number }): void {
        this._tracker.displayObjectIndexMapById = v;
    }

    untrackComponentByIdProperty(component?: C | undefined) {
        this._tracker.untrackComponentByIdProperty(component);
    }

    getItemBounds(id: Id): ISize | null {
        if (this.has(id)) {
            return this.get(id) ?? null;
        }
        return null;
    }

    getComponentBoundsByIntersectionPosition(position: number, maxPosition: number | null = null): (IRect & { id: Id | null; isFirst: boolean; isLast: boolean; }) | null {
        const components = this._displayComponents;
        let first: (IRect & { id: Id | null; isFirst: boolean; isLast: boolean; }) | null = null,
            last: (IRect & { id: Id | null; isFirst: boolean; isLast: boolean; }) | null = null;
        if (!!components) {
            for (const comp of components) {
                const id = comp.instance.itemId ?? null, isVertical = comp.instance.item?.config?.isVertical,
                    x = comp.instance.item?.measures?.x ?? 0,
                    y = comp.instance.item?.measures?.y ?? 0,
                    isFirst = comp.instance.item?.config?.isFirst ?? false,
                    isLast = comp.instance.item?.config?.isLast ?? false,
                    { width, height } = comp.instance.getBounds(),
                    pos = position;
                if (isVertical && (pos >= y && pos < y + height)) {
                    return { id, x, y, width, height, isFirst, isLast };
                } else if (!isVertical && (pos >= x && pos < x + width)) {
                    return { id, x, y, width, height, isFirst, isLast };
                }
                if (isFirst) {
                    first = { id, x, y, width, height, isFirst, isLast };
                } else if (isLast) {
                    last = { id, x, y, width, height, isFirst, isLast };
                }
            }
        }
        if (position < 0) {
            return first;
        }
        if (maxPosition !== null && position > maxPosition) {
            return last;
        }
        return null;
    }
    private _debouncedIsScrollStartOff = debounce(() => {
        this._isScrollStart = false;
    });

    protected cacheElements(isVertical: boolean, itemSize: number): void {
        if (!this._displayComponents) {
            return;
        }

        for (let i = 0, l = this._displayComponents.length; i < l; i++) {
            const component = this._displayComponents[i], itemId = component.instance.itemId;
            if (itemId === undefined) {
                continue;
            }
            const bounds = component.instance.getBounds();
            this.set(itemId, {
                ...this.get(itemId), ...bounds,
                width: bounds.width || (isVertical ? 0 : itemSize),
                height: bounds.height || (isVertical ? itemSize : 0),
            });
            if (this._isLazy && (this._isScrollStart)) {
                this._debouncedIsScrollStartOff.execute();
            }
        }
        const cache = this._prerenderedCache;
        if (!!cache) {
            for (const id in cache) {
                const cacheItem = cache[id];
                this.set(id, { ...(this.get(id) || {}), ...cacheItem });
            }
            this._prerenderedCache = null;
        }
    }

    resetCacheChunkInfo(): void {
        this._newItems = [];
    }

    cacheClean() {
        this._map.clear();
        this._snapshot.clear();
    }

    override dispose() {
        super.dispose();

        this.disposeClearBufferSizeTimer();

        if (!!this._debouncedIsScrollStartOff) {
            this._debouncedIsScrollStartOff.dispose();
        }

        if (!!this._tracker) {
            this._tracker.dispose();
        }
    }
}
