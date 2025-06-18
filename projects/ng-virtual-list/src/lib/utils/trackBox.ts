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

export interface IMetrics {
    itemsFromStartToScrollEnd: number;
    itemsFromStartToDisplayEnd: number;
    itemsOnDisplay: number;
    itemsOnDisplayLength: number;
    leftHiddenItemsWeight: number;
    leftItemLength: number;
    leftItemsWeight: number;
    rightItemLength: number;
    rightItemsWeight: number;
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

type CacheMapEvents = 'change';

type OnChangeEventListener = (version: number) => void;

type CacheMapListeners = OnChangeEventListener;

/**
 * An object that performs tracking, calculations and caching.
 * @homepage https://github.com/DjonnyX/ng-virtual-list/tree/main/projects/ng-virtual-list
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

    private _fireChangeTimeouts: Array<any> = [];

    protected override fireChange() {
        this.clearchangesTimeouts();

        this._fireChangeTimeouts.push(setTimeout(() => { this.dispatch('change', this._version) }));
    }

    private clearchangesTimeouts() {
        while (this._fireChangeTimeouts.length > 0) {
            const timeout = this._fireChangeTimeouts.pop();
            clearTimeout(timeout);
        }
    }

    recalculateMetrics(options: IRecalculateMetricsOptions): IMetrics {
        const { bounds, collection, dynamicSize, isVertical, itemSize, itemsOffset, scrollSize, snap, } = options;

        const { width, height } = bounds, sizeProperty = isVertical ? 'height' : 'width', size = isVertical ? height : width,
            weightToDisplayEnd = scrollSize + height,
            totalLength = collection.length, typicalItemSize = dynamicSize ? this.getTypicalItemSize(isVertical, itemSize) || itemSize : itemSize,
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

        const metrics = {
            itemsFromStartToScrollEnd,
            itemsFromStartToDisplayEnd,
            itemsOnDisplay,
            itemsOnDisplayLength,
            leftHiddenItemsWeight,
            leftItemLength,
            leftItemsWeight,
            rightItemLength,
            rightItemsWeight,
            snippedPos,
            totalItemsToDisplayEndWeight,
            totalSize,
            typicalItemSize,
        };

        return metrics;
    }

    /**
     * Calculates and returns the maximum size of a repeating item
     */
    getTypicalItemSize(isVertical: boolean, defaultItemSize: number, fromIndex: number = 0, to: number = -1) {
        const sizeProperty = isVertical ? 'height' : 'width',
            sizes: { [size: number]: number } = {};

        let maxRepeatingSize = defaultItemSize, count = 0;

        this._map.forEach(bound => {
            const size = bound[sizeProperty];
            if (sizes.hasOwnProperty(size)) {
                sizes[size] += 1;
            } else {
                sizes[size] = 1;
            }
            if (sizes[size] > count) {
                count = sizes[size];
                maxRepeatingSize = size;
            }
        });
        return maxRepeatingSize;
    }

    /**
     * tracking by propName
     */
    track(dynamicSize: boolean = false): void {
        if (!this._items || !this._displayComponents) {
            return;
        }

        this._tracker.track(this._items, this._displayComponents, dynamicSize ? (component, item) => {
            this.cacheElementBounds(component, item);
        } : undefined);
    }

    setDisplayObjectIndexMapById(v: { [id: number]: number }): void {
        this._tracker.displayObjectIndexMapById = v;
    }

    untrackComponentByIdProperty(component?: NgVirtualListItemComponent | undefined) {
        this._tracker.untrackComponentByIdProperty(component);
    }

    /**
     * Stores the element bounds in _sizeCacheMap
     */
    private cacheElementBounds(component: NgVirtualListItemComponent, item: IRenderVirtualListItem) {
        component.item = item;
        const bounds = component.getBounds();
        this.set(item.id, bounds);
    }

    /**
     * Returns calculated bounds from cache
     */
    private getBoundsFromCache(items: IVirtualListCollection, typicalItemSize: number, isVertical: boolean) {
        const sizeProperty = isVertical ? 'height' : 'width', map = this._map;
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

        this.clearchangesTimeouts();

        if (this._tracker) {
            this._tracker.dispose();
        }
    }
}
