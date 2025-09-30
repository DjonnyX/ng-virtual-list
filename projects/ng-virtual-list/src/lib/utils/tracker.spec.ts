import { Tracker } from './tracker';
import { BaseVirtualListItemComponent } from '../models/base-virtual-list-item-component';
import { IRenderVirtualListCollection } from '../models/render-collection.model';
import { IRenderVirtualListItem } from '../models/render-item.model';
import { Id, ISize } from '../types';

class ComponentRef<C extends any> {
    get instance(): C {
        return this._instance;
    };

    constructor(private _instance: C) { }
}

class Component {
    get id() {
        return this._id;
    }
    regular: boolean = false;
    set regularLength(v: string) { }
    data: IRenderVirtualListItem | undefined;
    private _item: IRenderVirtualListItem | null | undefined;
    set item(v: IRenderVirtualListItem | null | undefined) {
        this._item = v;
    }
    get item(): IRenderVirtualListItem | null | undefined {
        return this._item;
    }
    get itemId(): Id | undefined {
        return this._item?.id;
    }
    set renderer(v: any | undefined) { }
    private _element: HTMLElement;
    get element(): HTMLElement {
        return this._element;
    }
    visible: boolean = false;
    getBounds(): ISize { return { width: 0, height: 0 }; }
    show() {
        this.visible = true;
    }
    hide() {
        this.visible = false;
    }

    constructor(private _id: number = 0) {
        this._element = document.createElement('div');
    }
}

const generateComponent = (id: number): ComponentRef<BaseVirtualListItemComponent> => {
    return new ComponentRef(new Component(id));
};

const generateItem = (id: Id, trackBy: string): IRenderVirtualListItem => {
    return {
        id,
        index: 0,
        measures: { x: 0, y: 0, width: 0, height: 0, delta: 0 },
        data: {
            [trackBy]: id,
        },
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
        }
    };
};

class TrackerTested<C extends BaseVirtualListItemComponent = any> extends Tracker<C> { }

describe('Tracker', () => {
    it('Tracking should work correctly', () => {
        const trackBy = 'id', tracker = new TrackerTested(trackBy),
            items: IRenderVirtualListCollection = [],
            components = new Array<ComponentRef<BaseVirtualListItemComponent>>(),
            COLLECTION_LENGTH = 10,
            expected = [];
        for (let i = 0, l = COLLECTION_LENGTH; i < l; i++) {
            expected.push(i);
            const item = generateItem(i, trackBy);
            items.push(item);
            const comp = generateComponent(i);
            components.push(comp);
        }

        tracker.track(items, components as any, undefined, 1);

        const result = [];
        for (let i = 0, l = COLLECTION_LENGTH; i < l; i++) {
            const comp = components[i], instance = comp.instance as Component;
            if (instance.visible) {
                result.push(instance?.id);
            }
        }

        expect(JSON.stringify(result)).toEqual(JSON.stringify(expected));
    });

    it('Tracking with free components should work correctly', () => {
        const trackBy = 'id', tracker = new TrackerTested(trackBy),
            items: IRenderVirtualListCollection = [],
            components = new Array<ComponentRef<BaseVirtualListItemComponent>>(),
            COLLECTION_LENGTH = 10, COMPONENTS_LENGTH = 15, COLLECTION_DIFF_LENGTH = COMPONENTS_LENGTH - COLLECTION_LENGTH,
            COMPONENT_ID_OFFSET = 100,
            expected = [], displayObjectIndexMapById: {
                [id: number]: number;
            } = {};
        for (let i = 0, l = COLLECTION_LENGTH; i < l; i++) {
            displayObjectIndexMapById[i + COMPONENT_ID_OFFSET] = i + COLLECTION_DIFF_LENGTH;
            expected.push(i);
            const item = generateItem(i, trackBy);
            items.push(item);
        }
        tracker.displayObjectIndexMapById = displayObjectIndexMapById;

        for (let i = 0, l = COMPONENTS_LENGTH; i < l; i++) {
            const id = i, compId = i + COMPONENT_ID_OFFSET, comp = generateComponent(compId);
            components.push(comp);
            if (i >= 0) {
                tracker.trackMap.set(id, compId);
            }
        }

        tracker.track(items, components as any, undefined, 1);

        const result = [];
        for (let i = 0, l = COLLECTION_LENGTH; i < l; i++) {
            const comp = components[i], instance = comp.instance as Component;
            if (instance.visible) {
                result.push(instance?.item?.data[trackBy]);
            }
        }

        expect(JSON.stringify(result)).toEqual(JSON.stringify(expected));
    });

    it('Tracking with legacy components should work correctly', () => {
        const trackBy = 'id', tracker = new TrackerTested(trackBy),
            items: IRenderVirtualListCollection = [],
            components = new Array<ComponentRef<BaseVirtualListItemComponent>>(),
            COLLECTION_LENGTH = 10, COMPONENTS_LENGTH = 15, COLLECTION_DIFF_LENGTH = COMPONENTS_LENGTH - COLLECTION_LENGTH,
            COMPONENT_ID_OFFSET = 100, COMPONENTS_INDEX_OFFSET = 10,
            expected = [], displayObjectIndexMapById: {
                [id: number]: number;
            } = {};
        for (let i = 0, l = COLLECTION_LENGTH; i < l; i++) {
            displayObjectIndexMapById[i + COMPONENT_ID_OFFSET] = i - COLLECTION_DIFF_LENGTH;
            expected.push(i);
            const item = generateItem(i, trackBy);
            items.push(item);
        }
        tracker.displayObjectIndexMapById = displayObjectIndexMapById;

        for (let i = 0, l = COMPONENTS_LENGTH; i < l; i++) {
            const id = i, compId = i + COMPONENT_ID_OFFSET, comp = generateComponent(compId);
            components.push(comp);
            if (i >= 0) {
                tracker.trackMap.set(id - COMPONENTS_INDEX_OFFSET, compId);
            }
        }

        tracker.track(items, components as any, undefined, 1);

        const result = [];
        for (let i = 0, l = COLLECTION_LENGTH; i < l; i++) {
            const comp = components[i], instance = comp.instance as Component;
            if (instance.visible) {
                result.push(instance?.item?.data[trackBy]);
            }
        }

        expect(JSON.stringify(result)).toEqual(JSON.stringify(expected));
    });

    it('`trackBy` should work correctly', () => {
        const trackBy = 'number', tracker = new TrackerTested(trackBy),
            items: IRenderVirtualListCollection = [],
            components = new Array<ComponentRef<BaseVirtualListItemComponent>>(),
            COLLECTION_LENGTH = 10, COMPONENTS_LENGTH = 15, COLLECTION_DIFF_LENGTH = COMPONENTS_LENGTH - COLLECTION_LENGTH,
            COMPONENT_ID_OFFSET = 100, COMPONENTS_INDEX_OFFSET = 10,
            expected = [], displayObjectIndexMapById: {
                [id: number]: number;
            } = {};
        for (let i = 0, l = COLLECTION_LENGTH; i < l; i++) {
            displayObjectIndexMapById[i + COMPONENT_ID_OFFSET] = i - COLLECTION_DIFF_LENGTH;
            expected.push(i);
            const item = generateItem(i, trackBy);
            items.push(item);
        }
        tracker.displayObjectIndexMapById = displayObjectIndexMapById;

        for (let i = 0, l = COMPONENTS_LENGTH; i < l; i++) {
            const id = i, compId = i + COMPONENT_ID_OFFSET, comp = generateComponent(compId);
            components.push(comp);
            if (i >= 0) {
                tracker.trackMap.set(id - COMPONENTS_INDEX_OFFSET, compId);
            }
        }

        tracker.track(items, components as any, undefined, 1);

        const result = [];
        for (let i = 0, l = COLLECTION_LENGTH; i < l; i++) {
            const comp = components[i], instance = comp.instance as Component;
            if (instance.visible) {
                result.push(instance?.item?.data[trackBy]);
            }
        }

        expect(JSON.stringify(result)).toEqual(JSON.stringify(expected));
    });
});
