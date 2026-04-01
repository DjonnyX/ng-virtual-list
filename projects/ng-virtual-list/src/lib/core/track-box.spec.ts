import { TrackBox, ItemDisplayMethods, TrackBoxEvents, IMetrics } from './track-box';
import { IRenderVirtualListItem } from '../models/render-item.model';
import { IRenderVirtualListCollection } from '../models/render-collection.model';
import { ISize } from '../interfaces';
import { Id } from '../types';
import { CMap } from '../utils/cmap';

interface IItem<I = any> {
    [prop: string]: I;
}

class TrackBoxTested extends TrackBox {
    get isReseted() {
        return this._isReseted;
    }

    get cache() {
        return this._map.toObject();
    }

    get map() {
        return this._map;
    }

    override updateCache<I extends IItem, C extends Array<I>>(previousCollection: C | null | undefined, currentCollection: C | null | undefined,
        itemSize: number) {
        super.updateCache(previousCollection, currentCollection, itemSize);
    }

    override getElementNumToEnd<I extends IItem, C extends Array<I>>(i: number, collection: C, map: CMap<Id, ISize>, typicalItemSize: number,
        size: number, isVertical: boolean, indexOffset: number = 0): { num: number, offset: number } {
        return super.getElementNumToEnd(i, collection, map, typicalItemSize, size, isVertical, indexOffset);
    }

    override updateAdaptiveBufferParams(metrics: IMetrics, totalItemsLength: number) {
        super.updateAdaptiveBufferParams(metrics, totalItemsLength);
    }
}

const generateItem = (id: Id): IRenderVirtualListItem => {
    return {
        id,
        index: 0,
        measures: {
            x: 0,
            y: 0,
            width: 0,
            height: 0,
            delta: 0,
            positionOffset: 0,
            position: 0,
            scrollSize: 0,
            size: 0,
            boundsSize: 0,
            absoluteStartPosition: 0,
            absoluteStartPositionPercent: 0,
            absoluteEndPosition: 0,
            absoluteEndPositionPercent: 0
        },
        data: { id },
        config: {
            new: false,
            odd: false,
            even: false,
            collapsable: false,
            sticky: 0,
            selectable: false,
            snap: false,
            snapped: false,
            snappedOut: false,
            isVertical: false,
            dynamic: false,
            isSnappingMethodAdvanced: false,
            tabIndex: 0,
            zIndex: '0',
        },
        previouseData: undefined,
        nextData: undefined,
    };
};

describe('TrackBox', () => {
    it('should create the trackBox', () => {
        const trackBox = new TrackBox('id');
        expect(trackBox).toBeDefined();
    });

    it('The `change detection` should work correctly', async () => {
        const markForChanges = await new Promise((res) => {
            const trackBy = 'id', id: Id = 1, cache: ISize = { width: 1, height: 1 }, trackBox = new TrackBoxTested(trackBy);
            trackBox.set(id, cache);
            trackBox.addEventListener(TrackBoxEvents.CHANGE, () => {
                res(true);
            });
            setTimeout(() => {
                res(false);
            }, 100);
        });
        expect(markForChanges).toBeTruthy();
    });

    it('isResetted should be set correctly when updating the collection', async () => {
        const trackBy = 'id', collection: IRenderVirtualListCollection = [];
        for (let i = 0, l = 10; i < l; i++) {
            collection.push(generateItem(i));
        }
        const trackBox = new TrackBoxTested(trackBy);
        trackBox.updateCollection(collection, {}, {
            bounds: {
                width: 0,
                height: 0,
                x: 0,
                y: 0
            },
            isVertical: true,
            itemSize: 40,
            bufferSize: 1,
            maxBufferSize: 1,
            dynamicSize: false,
            scrollSize: 100,
            snap: true,
            enabledBufferOptimization: false,
            fromItemId: undefined,
        });
        expect(trackBox.isReseted).toBeTruthy();
    });

    it('isResetted must be set correctly when resetting the collection', () => {
        const itemSize = 40, totalSize = 10, updatedTotalSize = 5, trackBy = 'id', collection: IRenderVirtualListCollection = [],
            collection1: IRenderVirtualListCollection = [];
        for (let i = 0, l = totalSize; i < l; i++) {
            collection.push(generateItem(i));
        }
        for (let i = 0, l = updatedTotalSize; i < l; i++) {
            collection1.push(generateItem(i + totalSize));
        }
        const trackBox = new TrackBoxTested(trackBy);
        trackBox.resetCollection([...collection], itemSize);
        trackBox.resetCollection([...collection1], itemSize);
        const reseted = trackBox.isReseted;
        expect(reseted).toBeFalse();
    });

    it('The cache should be populated correctly when calling the updateCache method', () => {
        const itemSize = 40, totalSize = 10, trackBy = 'id', collection: IRenderVirtualListCollection = [],
            expected: { [id: number]: { width: number; height: number; method: number } } = {};
        for (let i = 0, l = totalSize; i < l; i++) {
            collection.push(generateItem(i));
            expected[i] = { width: 40, height: 40, method: ItemDisplayMethods.CREATE };
        }
        const trackBox = new TrackBoxTested(trackBy);
        trackBox.updateCache([], collection, itemSize);
        expect(JSON.stringify(trackBox.cache)).toEqual(JSON.stringify(expected));
    });

    it('`updateCache` should be populated correctly when updating a collection in which some elements have been removed', () => {
        const itemSize = 40, totalSize = 10, updatedStart = 5, trackBy = 'id', collection: IRenderVirtualListCollection = [],
            collection1: IRenderVirtualListCollection = [],
            expected: { [id: number]: { width: number; height: number; method: number } } = {};
        for (let i = 0, l = totalSize; i < l; i++) {
            collection.push(generateItem(i));
        }
        for (let i = updatedStart, l = totalSize; i < l; i++) {
            const id = i;
            collection1.push(generateItem(id));
            expected[id] = { width: itemSize, height: itemSize, method: ItemDisplayMethods.UPDATE };
        }
        const trackBox = new TrackBoxTested(trackBy);
        trackBox.updateCache([], collection, itemSize);
        trackBox.updateCache(collection, collection1, itemSize);
        expect(JSON.stringify(trackBox.cache)).toEqual(JSON.stringify(expected));
    });

    it('`getElementNumToEnd` should return the correct value', () => {
        const itemSize = 40, totalSize = 10, trackBy = 'id', collection: IRenderVirtualListCollection = [];
        for (let i = 0, l = totalSize; i < l; i++) {
            collection.push(generateItem(i));
        }
        (function () {
            const trackBox = new TrackBoxTested(trackBy),
                expectedNum = 2, boundSize = 200, { num, offset } = trackBox.getElementNumToEnd(totalSize - expectedNum, collection, trackBox.map, itemSize, boundSize, true);
            expect(num).toEqual(expectedNum);
            expect(offset).toEqual(80);
        })();

        (function () {
            const trackBox = new TrackBoxTested(trackBy),
                expectedNum = 10, boundSize = 400, { num, offset } = trackBox.getElementNumToEnd(totalSize - expectedNum, collection, trackBox.map, itemSize, boundSize, true);
            expect(num).toEqual(expectedNum);
            expect(offset).toEqual(400);
        })();

        (function () {
            const trackBox = new TrackBoxTested(trackBy),
                boundSize = 400, { num, offset } = trackBox.getElementNumToEnd(0, [], trackBox.map, itemSize, boundSize, true);
            expect(num).toEqual(0);
            expect(offset).toEqual(0);
        })();
    });

    it('`updateAdaptiveBufferParams` should return the correct value', async () => {
        const itemSize = 40, totalSize = 2, trackBy = 'id';
        let scrollSize = 20000;
        const trackBox = new TrackBoxTested(trackBy);
        const generateMetrics = (scrollSize: number) => {
            const metric: IMetrics = {
                delta: 0,
                normalizedItemWidth: 0,
                normalizedItemHeight: 0,
                width: 0,
                height: 0,
                dynamicSize: false,
                itemSize: 0,
                itemsFromStartToScrollEnd: 0,
                itemsFromStartToDisplayEnd: 0,
                itemsOnDisplayWeight: 0,
                itemsOnDisplayLength: 0,
                isVertical: false,
                leftHiddenItemsWeight: 0,
                leftItemLength: 0,
                leftItemsWeight: 0,
                renderItems: 0,
                rightItemLength: 0,
                rightItemsWeight: 0,
                scrollSize,
                leftSizeOfAddedItems: 0,
                sizeProperty: 'height',
                snap: false,
                snipedPos: 0,
                startIndex: 0,
                startPosition: 0,
                totalItemsToDisplayEndWeight: 0,
                totalLength: 0,
                totalSize: 0,
                typicalItemSize: itemSize,
                isFromItemIdFound: false,
                offsetX: 0,
                offsetY: 0,
                isUpdating: false
            };
            return metric;
        }

        const buff = await new Promise((res) => {
            setTimeout(() => {
                trackBox.updateAdaptiveBufferParams(generateMetrics(scrollSize), totalSize);
                res(trackBox.bufferSize);
            }, 100);
        });
        expect(buff).toEqual(0);
    });
});