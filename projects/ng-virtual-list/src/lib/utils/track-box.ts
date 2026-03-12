import { ComponentRef } from "@angular/core";
import { IRenderVirtualListCollection, } from "../models/render-collection.model";
import { IRenderVirtualListItem } from "../models/render-item.model";
import { Id } from "../types/id";
import { CMap } from './cmap';
import { CACHE_BOX_CHANGE_EVENT_NAME, CacheMap } from "./cache-map";
import { Tracker } from "./tracker";
import { IRect, ISize } from "../types";
import {
    HEIGHT_PROP_NAME, TRACK_BY_PROPERTY_NAME, WIDTH_PROP_NAME, X_PROP_NAME, Y_PROP_NAME,
} from "../const";
import { IVirtualListItemConfigMap } from "../models";
import { bufferInterpolation } from "./buffer-interpolation";
import { BaseVirtualListItemComponent } from "../models/base-virtual-list-item-component";
import { debounce } from "./debounce";

export enum TrackBoxEvents {
    CHANGE = 'change',
    PREPARE = 'prepare',
    RESET = 'reset',
}

export interface IMetrics {
    delta: number;
    normalizedItemWidth: number;
    normalizedItemHeight: number;
    offsetX: number;
    offsetY: number;
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
    isUpdating: boolean;
}

export interface IRecalculateMetricsOptions<I extends IItem, C extends Array<I>> {
    bounds: IRect;
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

export interface IGetItemPositionOptions<I extends IItem, C extends Array<I>>
    extends Omit<IRecalculateMetricsOptions<I, C>, 'previousTotalSize' | 'crudDetected' | 'deletedItemsMap'> { }

export interface IUpdateCollectionOptions<I extends IItem, C extends Array<I>>
    extends Omit<IRecalculateMetricsOptions<I, C>, 'collection' | 'previousTotalSize' | 'crudDetected' | 'deletedItemsMap'> { }

export type CacheMapEvents = TrackBoxEvents;

export type OnChangeEventListener = (version: number) => void;

export type OnResetEventListener = (reseted: boolean) => void;

export type OnPrepareEventListener = (prepared: boolean) => void;

export type CacheMapListeners = OnChangeEventListener | OnResetEventListener | OnPrepareEventListener;

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

export interface IGetMetricsReturns {
    totalSize: number;
    delta: number;
    crudDetected: boolean;
}

interface IItem<I = any> {
    [prop: string]: I;
}

const DEFAULT_BUFFER_EXTREMUM_THRESHOLD = 15,
    DEFAULT_MAX_BUFFER_SEQUENCE_LENGTH = 30,
    DEFAULT_RESET_BUFFER_SIZE_TIMEOUT = 10000,
    IS_NEW = 'isNew',
    SCROLL_SNAP_TO_START_ITERATIONS = 10,
    SCROLL_SNAP_TO_END_ITERATIONS = 5;

type Cache = ISize & { method?: ItemDisplayMethods } & IItem;

/**
 * An object that performs tracking, calculations and caching.
 * @link https://github.com/DjonnyX/ng-virtual-list/blob/18.x/projects/ng-virtual-list/src/lib/utils/track-box.ts
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

    set isScrollStart(v: boolean) {
        this._isScrollStart = v;
        if (v) {
            this._isScrollSnapToStart = SCROLL_SNAP_TO_START_ITERATIONS;
        }
    }

    protected _isScrollStart: boolean = false;

    set isScrollEnd(v: boolean) {
        this._isScrollEnd = v;
        if (v) {
            this._isScrollSnapToEnd = SCROLL_SNAP_TO_END_ITERATIONS;
        }
    }

    protected _isScrollEnd: boolean = false;

    protected _isScrollSnapToStart: number = 0;

    get isSnappedToStart() {
        return this._isScrollStart || this._isScrollSnapToStart > 0;
    }

    protected _isScrollSnapToEnd: number = 0;

    get isSnappedToEnd() {
        return this._isScrollEnd || this._isScrollSnapToEnd > 0;
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
            if (b?.width === cache.width && b.height === cache.height) {
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

    protected _isReseted: boolean = true;

    protected _prepared: boolean = false;

    protected _preparedToStart: boolean = false;

    protected _preparedToStartIterations: number = 2;

    get prepared() { return this._prepared; }

    protected override lifeCircle() {
        this.fireChangeIfNeed();

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
        if (this._isReseted !== reseted && reseted && this._prepared) {
            this._prepared = false;
            this.dispatch(TrackBoxEvents.PREPARE, false);
        }

        this._isReseted = reseted;

        this.dispatch(TrackBoxEvents.RESET, reseted);

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

        if (!currentCollection || currentCollection.length === 0) {
            if (previousCollection) {
                // deleted
                for (let i = 0, l = previousCollection.length; i < l; i++) {
                    const item = previousCollection[i], id = item[trackBy];
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
                    const item = currentCollection[i], id = item[trackBy];
                    this._map.set(id, { width: itemSize, height: itemSize, method: ItemDisplayMethods.CREATE });
                }
            }
            return;
        }
        const collectionDict: IItem<I> = {};
        for (let i = 0, l = currentCollection.length; i < l; i++) {
            const item = currentCollection[i];
            if (item) {
                collectionDict[item[trackBy]] = item;
            }
        }
        const notChangedMap: IItem<I> = {}, deletedMap: IItem<I> = {}, deletedItemsMap: { [index: number]: ISize } = {},
            updatedMap: IItem<I> = {};
        for (let i = 0, l = previousCollection.length; i < l; i++) {
            const item = previousCollection[i], id = item[trackBy];
            if (item) {
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
            const item = currentCollection[i], id = item[trackBy];
            if (item && !deletedMap.hasOwnProperty(id) && !updatedMap.hasOwnProperty(id) &&
                !notChangedMap.hasOwnProperty(id)) {
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
        const opt = { fromItemId: id, itemConfigMap, ...options };
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

    cancelScrollSnappingToEnd(clearBuffer: boolean = false) {
        this._isScrollEnd = false;

        if (clearBuffer) {
            this._isScrollSnapToEnd = 0;
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

        if (this.isSnappedToStart) {
            if (this._isScrollSnapToStart) {
                this._isScrollSnapToStart--;
            }
        }

        if (this.isSnappedToEnd) {
            if (this._isScrollSnapToEnd) {
                this._isScrollSnapToEnd--;
            }
        }

        this._delta += metrics.delta;

        this.updateAdaptiveBufferParams(metrics, items.length);

        if (!opt.dynamicSize || (this._preparedToStart && !this._prepared && this._previousTotalSize === metrics.totalSize)) {
            this._prepared = true;
            this.dispatch(TrackBoxEvents.PREPARE, true);
        }

        if (this._preparedToStartIterations > 0 && this._previousTotalSize !== metrics.totalSize) {
            this._preparedToStartIterations--;
        }

        if (this._preparedToStartIterations === 0) {
            this._preparedToStart = true;
        }

        this._previousTotalSize = metrics.totalSize;

        this._deletedItemsMap = {};

        if (!dynamicSize) {
            this._isScrollStart = false;
        }
        this._crudDetected = false;

        if (opt.dynamicSize) {
            this.snapshot();
        }

        const displayItems = this.generateDisplayCollection(items, itemConfigMap, { ...metrics, });
        return { displayItems, totalSize: metrics.totalSize, delta: metrics.delta, crudDetected };
    }

    protected _previousScrollSize = 0;

    protected updateAdaptiveBufferParams(metrics: IMetrics, totalItemsLength: number) {
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
        size: number, isVertical: boolean, indexOffset: number = 0): { num: number, offset: number } {
        const trackBy = this._trackingPropertyName, sizeProperty = isVertical ? HEIGHT_PROP_NAME : WIDTH_PROP_NAME;
        let offset = 0, num = 0;
        for (let j = collection.length - indexOffset - 1; j >= i; j--) {
            const item = collection[j], id = item[trackBy];
            let itemSize = 0;
            if (map.has(id)) {
                const cache = map.get(id);
                itemSize = cache && cache[sizeProperty] > 0 ? cache[sizeProperty] : typicalItemSize;
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
    protected recalculateMetrics<I extends IItem, C extends Array<I>>(options: IRecalculateMetricsOptions<I, C>): IMetrics {
        const { fromItemId, bounds, collection, dynamicSize, isVertical, itemSize, bufferSize: minBufferSize,
            scrollSize, snap, itemConfigMap, enabledBufferOptimization, previousTotalSize, crudDetected,
            deletedItemsMap } = options as IRecalculateMetricsOptions<I, C> & {
                itemConfigMap: IVirtualListItemConfigMap,
            }, roundedScrollSize = Math.round(scrollSize);

        const trackBy = this._trackingPropertyName, bufferSize = Math.max(minBufferSize, this._bufferSize),
            { width, height } = bounds, sizeProperty = isVertical ? HEIGHT_PROP_NAME : WIDTH_PROP_NAME,
            size = isVertical ? height : width, totalLength = collection.length, typicalItemSize = itemSize,
            w = isVertical ? width : typicalItemSize, h = isVertical ? typicalItemSize : height,
            map = this._map, snapshot = this._snapshot, checkOverscrollItemsLimit = Math.ceil(typicalItemSize !== 0 ? size / typicalItemSize : 0),
            snippedPos = Math.floor(scrollSize) + this._scrollStartOffset, leftItemsWeights: Array<number> = [],
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
            itemByIdPos: number = this._scrollStartOffset,
            targetDisplayItemIndex: number = -1,
            isTargetInOverscroll: boolean = false,
            actualScrollSize = itemByIdPos,
            totalSize = this._scrollStartOffset + this._scrollEndOffset,
            startIndex: number,
            isFromItemIdFound = false,
            deltaFromStartCreation = 0,
            isUpdating = false;

        const isStart = ((roundedScrollSize === 0) || this.isSnappedToStart);
        let stickyItemId: Id | undefined, isNew = false;

        // If the list is dynamic or there are new elements in the collection, then it switches to the long algorithm.
        if (dynamicSize) {
            if (isFromId) {
                for (let stickyId: Id | undefined = undefined, i = 0, l = collection.length; i < l; i++) {
                    const item = collection[i], id = item?.[trackBy];
                    if (stickyId !== undefined && !itemConfigMap[id]?.sticky && id === fromItemId) {
                        stickyItemId = stickyId;
                        break;
                    }
                    if (itemConfigMap[id]?.sticky === 1) {
                        stickyId = id;
                    }
                }
            }

            let y = this._scrollStartOffset, stickyCollectionItem: I | undefined = undefined, stickyComponentSize = 0;
            for (let i = 0, l = collection.length; i < l; i++) {
                const ii = i + 1, collectionItem = collection[i], id = collectionItem[trackBy];

                let componentSize = 0, componentSizeDelta = 0, itemDisplayMethod: ItemDisplayMethods = ItemDisplayMethods.NOT_CHANGED;
                if (map.has(id)) {
                    const cache = map.get(id);
                    componentSize = cache[sizeProperty] > 0 ? cache[sizeProperty] : typicalItemSize;
                    itemDisplayMethod = cache?.method ?? ItemDisplayMethods.UPDATE;
                    const isItemNew = (cache satisfies Cache)?.[IS_NEW] ?? (this._isLazy && isStart && !this._isReseted);
                    isNew = isItemNew;
                    if (isNew) {
                        isUpdating = true;
                    }
                    const snapshotBounds = snapshot.get(id),
                        componentSnapshotSize = componentSize - (snapshotBounds ? snapshotBounds[sizeProperty] : typicalItemSize);
                    componentSizeDelta = componentSnapshotSize;
                    switch (itemDisplayMethod) {
                        case ItemDisplayMethods.UPDATE: {
                            map.set(id, { ...cache, method: isNew ? ItemDisplayMethods.UPDATE : ItemDisplayMethods.NOT_CHANGED, isNew });
                            if (isNew && y <= (scrollSize + size + deltaFromStartCreation + componentSize)) {
                                deltaFromStartCreation += componentSizeDelta;
                                componentSizeDelta = 0;
                            }
                            break;
                        }
                        case ItemDisplayMethods.CREATE: {
                            componentSizeDelta = typicalItemSize;
                            map.set(id, { ...cache, method: ItemDisplayMethods.UPDATE, isNew });
                            if (isNew && y <= (scrollSize + size + deltaFromStartCreation + componentSize)) {
                                deltaFromStartCreation += componentSizeDelta;
                                componentSizeDelta = 0;
                            }
                            break;
                        }
                    }
                }

                if (deletedItemsMap.hasOwnProperty(i)) {
                    const cache = deletedItemsMap[i], size = cache?.[sizeProperty] ?? typicalItemSize;
                    if (y < scrollSize + this._scrollStartOffset - size) {
                        leftSizeOfDeletedItems += size;
                    }
                }

                totalSize += componentSize;

                if (isFromId) {
                    if (itemById === undefined) {
                        if (id !== fromItemId && id === stickyItemId && itemConfigMap?.[id]?.sticky === 1) {
                            stickyComponentSize = componentSize;
                            stickyCollectionItem = collectionItem;
                            y -= stickyComponentSize;
                        }

                        if (id === fromItemId) {
                            isFromItemIdFound = true;
                            targetDisplayItemIndex = i;
                            if (stickyCollectionItem && itemConfigMap) {
                                const { num } = this.getElementNumToEnd(i, collection, map, typicalItemSize, size, isVertical);
                                if (num > 0) {
                                    isTargetInOverscroll = true;
                                    y -= size - this._scrollEndOffset - componentSize - stickyComponentSize;
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

                    if (y <= scrollSize + componentSize) {
                        switch (itemDisplayMethod) {
                            case ItemDisplayMethods.CREATE: {
                                leftSizeOfAddedItems += componentSizeDelta;
                                break;
                            }
                            case ItemDisplayMethods.UPDATE:
                            case ItemDisplayMethods.NOT_CHANGED: {
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
                const collectionLength = collection.length, { num } = this.getElementNumToEnd(
                    collectionLength - (checkOverscrollItemsLimit < 0 ? 0 : collectionLength - checkOverscrollItemsLimit),
                    collection, map, typicalItemSize, size, isVertical,
                    collectionLength - (collectionLength - (targetDisplayItemIndex + 1)),
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
            itemsFromStartToScrollEnd = Math.floor(typicalItemSize !== 0 ? scrollSize / typicalItemSize : 0);
            itemsFromStartToDisplayEnd = Math.ceil(typicalItemSize !== 0 ? (scrollSize + size) / typicalItemSize : 0);
            leftItemLength = Math.min(itemsFromStartToScrollEnd, bufferSize);
            rightItemLength = itemsFromStartToDisplayEnd + bufferSize > totalLength
                ? totalLength - itemsFromStartToDisplayEnd : bufferSize;
            leftItemsWeight = leftItemLength * typicalItemSize;
            rightItemsWeight = rightItemLength * typicalItemSize;
            leftHiddenItemsWeight = itemsFromStartToScrollEnd * typicalItemSize;
            totalItemsToDisplayEndWeight = itemsFromStartToDisplayEnd * typicalItemSize;
            totalSize = (totalLength * typicalItemSize) + this._scrollStartOffset + this._scrollEndOffset;

            const k = totalSize !== 0 ? previousTotalSize / totalSize : 0;
            actualScrollSize = scrollSize * k;
        }
        startIndex = Math.min(itemsFromStartToScrollEnd - leftItemLength, totalLength > 0 ? totalLength - 1 : 0);

        const itemsOnDisplayWeight = totalItemsToDisplayEndWeight - leftItemsWeight,
            itemsOnDisplayLength = itemsFromStartToDisplayEnd - itemsFromStartToScrollEnd,
            startPosition = this._scrollStartOffset + leftHiddenItemsWeight - leftItemsWeight,
            renderItems = itemsOnDisplayLength + leftItemLength + rightItemLength,
            startCreationDelta = deltaFromStartCreation > 0 ? deltaFromStartCreation : 0,
            delta = leftSizeOfUpdatedItems + leftSizeOfAddedItems - leftSizeOfDeletedItems + startCreationDelta;

        if (isFromId && !isTargetInOverscroll) {
            actualScrollSize -= this._scrollStartOffset;
        }

        const metrics: IMetrics = {
            delta,
            normalizedItemWidth: w,
            normalizedItemHeight: h,
            offsetX: bounds.x,
            offsetY: bounds.y,
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
            isUpdating,
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

    changes(immediately: boolean = false): void {
        if (immediately) {
            this._previousVersion = this._version;
            this.dispatch(CACHE_BOX_CHANGE_EVENT_NAME as CacheMapEvents, this.version);
        } else {
            if (this.changesDetected()) {
                return;
            }
            this.bumpVersion();
        }
    }

    protected generateDisplayCollection<I extends IItem, C extends Array<I>>(items: C, itemConfigMap: IVirtualListItemConfigMap,
        metrics: IMetrics): IRenderVirtualListCollection {
        const {
            offsetY,
            offsetX,
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
            const trackBy = this._trackingPropertyName, actualSnippedPosition = snippedPos,
                isSnappingMethodAdvanced = this.isSnappingMethodAdvanced,
                boundsSize = isVertical ? height : width, actualEndSnippedPosition = scrollSize + boundsSize - this._scrollEndOffset,
                positionOffset = isVertical ? offsetY : offsetX;
            let pos = startPosition,
                renderItems = renderItemsLength,
                stickyItem: IRenderVirtualListItem | undefined, nextSticky: IRenderVirtualListItem | undefined, stickyItemIndex = -1,
                stickyItemSize = 0, endStickyItem: IRenderVirtualListItem | undefined, nextEndSticky: IRenderVirtualListItem | undefined,
                endStickyItemIndex = -1, endStickyItemSize = 0, count = 1;

            if (snap) {
                for (let i = Math.min(itemsFromStartToScrollEnd > 0 ? itemsFromStartToScrollEnd : 0, totalLength - 1); i >= 0; i--) {
                    const collectionItem = items[i];
                    if (!collectionItem) {
                        continue;
                    }
                    const id = collectionItem[trackBy], cache = this.get(id)!, sticky = itemConfigMap[id]?.sticky ?? 0,
                        selectable = itemConfigMap[id]?.selectable ?? true,
                        collapsable = itemConfigMap[id]?.collapsable ?? false,
                        size = dynamicSize ? cache?.[sizeProperty] > 0 ? cache?.[sizeProperty] : typicalItemSize : typicalItemSize,
                        absoluteStartPosition = pos - (scrollSize - size) - size,
                        ratio = size !== 0 ? boundsSize / size : 0, absoluteStartPositionPercent = -(boundsSize !== 0 ? absoluteStartPosition / boundsSize : 0) * ratio,
                        absoluteEndPosition = boundsSize - (absoluteStartPositionPercent + size),
                        absoluteEndPositionPercent = (absoluteStartPositionPercent + (boundsSize !== 0 ? (absoluteEndPosition + size) / boundsSize : 0) * ratio);
                    if (sticky === 1) {
                        const isOdd = i % 2 != 0,
                            measures = {
                                x: isVertical ? startPosition : actualSnippedPosition,
                                y: isVertical ? actualSnippedPosition : startPosition,
                                width: isVertical ? normalizedItemWidth : size,
                                height: isVertical ? size : normalizedItemHeight,
                                size,
                                position: pos,
                                positionOffset,
                                boundsSize,
                                scrollSize,
                                absoluteStartPosition,
                                absoluteStartPositionPercent,
                                absoluteEndPosition,
                                absoluteEndPositionPercent,
                                delta: sticky === 1 ? this._scrollStartOffset : sticky === 2 ? actualEndSnippedPosition - size : 0,
                            }, config = {
                                new: (cache satisfies Cache)?.[IS_NEW] === true,
                                odd: isOdd,
                                even: !isOdd,
                                isVertical,
                                collapsable,
                                selectable,
                                sticky,
                                snap,
                                snapped: true,
                                snappedOut: false,
                                dynamic: dynamicSize,
                                isSnappingMethodAdvanced,
                                tabIndex: count,
                                zIndex: '1',
                            };

                        const itemData: I = collectionItem;

                        stickyItem = {
                            index: i, id, measures, data: itemData, previouseData: i > 0 ? items[i - 1] : null,
                            nextData: i < totalLength ? items[i + 1] : null, config,
                        };
                        stickyItemIndex = i;
                        stickyItemSize = size;

                        displayItems.push(stickyItem);

                        count++;
                        break;
                    }
                }
            }

            if (snap) {
                const si = itemsFromStartToScrollEnd + itemsOnDisplayLength - 1, startIndex = si < 0 ? si : si;
                for (let i = Math.min(startIndex, totalLength > 0 ? totalLength - 1 : 0), l = totalLength; i < l; i++) {
                    const collectionItem = items[i];
                    if (!collectionItem) {
                        continue;
                    }
                    const id = collectionItem[trackBy], cache = this.get(id)!, sticky = itemConfigMap[id]?.sticky ?? 0,
                        selectable = itemConfigMap[id]?.selectable ?? true,
                        collapsable = itemConfigMap[id]?.collapsable ?? false,
                        size = dynamicSize
                            ? cache?.[sizeProperty] || typicalItemSize
                            : typicalItemSize;
                    if (sticky === 2) {
                        const isOdd = i % 2 != 0,
                            w = isVertical ? normalizedItemWidth : size, h = isVertical ? size : normalizedItemHeight,
                            absoluteStartPosition = pos - (scrollSize - size) - size, ratio = size !== 0 ? boundsSize / size : 0, absoluteStartPositionPercent = -(boundsSize !== 0 ? absoluteStartPosition / boundsSize : 0) * ratio,
                            absoluteEndPosition = boundsSize - (absoluteStartPositionPercent + size),
                            absoluteEndPositionPercent = (absoluteStartPositionPercent + (boundsSize !== 0 ? (absoluteEndPosition + size) / boundsSize : 0) * ratio),
                            measures = {
                                x: isVertical ? 0 : actualEndSnippedPosition - w,
                                y: isVertical ? actualEndSnippedPosition - h : 0,
                                size,
                                position: pos,
                                boundsSize,
                                positionOffset,
                                scrollSize,
                                absoluteStartPosition,
                                absoluteStartPositionPercent,
                                absoluteEndPosition,
                                absoluteEndPositionPercent,
                                width: w,
                                height: h,
                                delta: actualEndSnippedPosition - size,
                            }, config = {
                                new: (cache satisfies Cache)?.[IS_NEW] === true,
                                odd: isOdd,
                                even: !isOdd,
                                isVertical,
                                collapsable,
                                selectable,
                                sticky,
                                snap,
                                snapped: true,
                                snappedOut: false,
                                dynamic: dynamicSize,
                                isSnappingMethodAdvanced,
                                tabIndex: items.length,
                                zIndex: '1',
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

            let i = startIndex, iterations = 0;

            while (renderItems > 0) {
                iterations++;
                if (iterations > totalLength || i >= totalLength) {
                    break;
                }
                const collectionItem = items[i];
                if (!collectionItem) {
                    continue;
                }

                const id = collectionItem[trackBy], cache = this.get(id)!,
                    size = dynamicSize ? cache?.[sizeProperty] || typicalItemSize : typicalItemSize;

                if (id !== stickyItem?.id && id !== endStickyItem?.id) {
                    const isOdd = i % 2 != 0,
                        sticky = itemConfigMap[id]?.sticky ?? 0,
                        selectable = itemConfigMap[id]?.selectable ?? true,
                        collapsable = itemConfigMap[id]?.collapsable ?? false,
                        snapped = snap && (sticky === 1 && (pos <= scrollSize + this._scrollStartOffset) || sticky === 2 && (pos >= scrollSize + boundsSize - size)),
                        absoluteStartPosition = pos - scrollSize, ratio = size !== 0 ? boundsSize / size : 0, absoluteStartPositionPercent = -(boundsSize !== 0 ? absoluteStartPosition / boundsSize : 0) * ratio,
                        absoluteEndPosition = boundsSize - (absoluteStartPositionPercent + size),
                        absoluteEndPositionPercent = (absoluteStartPositionPercent + (boundsSize !== 0 ? (absoluteEndPosition + size) / boundsSize : 0) * ratio),
                        measures = {
                            x: isVertical ? 0 : pos,
                            y: isVertical ? pos : 0,
                            size,
                            position: pos,
                            boundsSize,
                            positionOffset,
                            scrollSize,
                            absoluteStartPosition,
                            absoluteStartPositionPercent,
                            absoluteEndPosition,
                            absoluteEndPositionPercent,
                            width: isVertical ? normalizedItemWidth : size,
                            height: isVertical ? size : normalizedItemHeight,
                            delta: sticky === 1 ? actualSnippedPosition : sticky === 2 ? actualEndSnippedPosition - size : 0,
                        }, config = {
                            new: (cache satisfies Cache)?.[IS_NEW] === true,
                            odd: isOdd,
                            even: !isOdd,
                            isVertical,
                            collapsable,
                            selectable,
                            sticky: sticky,
                            snap,
                            snapped: false,
                            snappedOut: false,
                            dynamic: dynamicSize,
                            isSnappingMethodAdvanced,
                            tabIndex: count,
                            zIndex: '0',
                        };

                    count++;

                    if (snapped) {
                        config.zIndex = '2';
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
                        nextSticky.measures.delta = isVertical ? (item.measures.y - scrollSize) : (item.measures.x - scrollSize);
                        nextSticky.config.zIndex = '3';
                    }
                    if (!nextEndSticky && endStickyItemIndex > i && sticky === 2 &&
                        (pos >= actualEndSnippedPosition - size - endStickyItemSize)) {
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

            if (nextSticky && stickyItem && nextSticky.measures[axis] <= actualSnippedPosition + stickyItemSize) {
                if (nextSticky.measures[axis] > scrollSize - stickyItemSize) {
                    stickyItem.measures[axis] = nextSticky.measures[axis] - stickyItemSize;
                    stickyItem.config.snapped = nextSticky.config.snapped = false;
                    stickyItem.config.snappedOut = true;
                    stickyItem.config.sticky = 1;
                    stickyItem.measures.delta = isVertical ? stickyItem.measures.y - scrollSize : stickyItem.measures.x - scrollSize;
                } else {
                    nextSticky.config.snapped = true;
                    nextSticky.measures.delta = isVertical ? nextSticky.measures.y - scrollSize : nextSticky.measures.x - scrollSize;
                    stickyItem.measures[axis] = stickyItem.measures[axis] + stickyItem.measures[sizeProperty];
                }
            }

            if (nextEndSticky && endStickyItem &&
                (nextEndSticky.measures[axis] >= actualEndSnippedPosition - endStickyItemSize - nextEndSticky.measures[sizeProperty])) {
                if (nextEndSticky.measures[axis] < actualEndSnippedPosition - nextEndSticky.measures[sizeProperty]) {
                    endStickyItem.measures[axis] = nextEndSticky.measures[axis] + nextEndSticky.measures[sizeProperty];
                    endStickyItem.config.snapped = nextEndSticky.config.snapped = false;
                    endStickyItem.config.snappedOut = true;
                    endStickyItem.config.sticky = 2;
                    endStickyItem.measures.delta = isVertical ? endStickyItem.measures.y - scrollSize : endStickyItem.measures.x - scrollSize;
                } else {
                    nextEndSticky.config.snapped = true;
                    nextEndSticky.measures[axis] = actualEndSnippedPosition - nextEndSticky.measures[sizeProperty];
                    endStickyItem.measures[axis] = nextEndSticky.measures[axis] + nextEndSticky.measures[sizeProperty];
                }
            }
        }
        return displayItems;
    }

    resetPositions() {
        this._tracker.clearTrackMap();

        this.clearScrollDirectionCache(false);

        this.deltaDirection = 0;

        this.track();
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

    private _debouncedIsScrollStartOff = debounce(() => {
        this._isScrollStart = false;
    });

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

            if (bounds.width && bounds.height) {
                this.set(itemId, { ...this.get(itemId), ...bounds });
                if (this._isLazy && (this._isScrollStart)) {
                    this._debouncedIsScrollStartOff.execute();
                }
            }
        }
    }

    cacheClean() {
        this._map.clear();
        this._snapshot.clear();
    }

    override dispose() {
        super.dispose();

        this.disposeClearBufferSizeTimer();

        if (this._debouncedIsScrollStartOff) {
            this._debouncedIsScrollStartOff.dispose();
        }

        if (this._tracker) {
            this._tracker.dispose();
        }
    }
}
