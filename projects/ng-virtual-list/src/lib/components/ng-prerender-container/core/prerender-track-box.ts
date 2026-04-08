import { ComponentRef, ViewContainerRef } from "@angular/core";
import { IRenderVirtualListItem, IVirtualListCollection, IVirtualListItem } from "../../../models";
import { Id } from "../../../types";
import { ISize } from '../../../interfaces';
import { CMap } from "../../../utils/cmap";
import { PrerenderCache } from "../types/cache";
import { BaseVirtualListItemComponent } from "../../ng-list-item/base";
import { IPrerenderTrackBoxRefreshParams } from "../interfaces";
import { DEFAULT_DYNAMIC_SIZE, DEFAULT_ITEM_SIZE, TRACK_BY_PROPERTY_NAME } from "../../../const";
import { Component$1 } from "../../../models/component.model";
import { EventEmitter } from "../../../utils/event-emitter/event-emitter";
import { PrerenderTrackBoxEvents, PrerenderTrackBoxHandlers } from "../events";

const createItemData = (data: IVirtualListItem, isVertical: boolean, bounds: ISize, boundsSize: number,
    dynamic: boolean, itemSize: number, id: Id, index: number): IRenderVirtualListItem => {
    return {
        index,
        id,
        measures: {
            position: 0,
            scrollSize: 0,
            size: itemSize,
            boundsSize,
            absoluteStartPosition: 0,
            absoluteStartPositionPercent: 0,
            absoluteEndPosition: 0,
            absoluteEndPositionPercent: 0,
            delta: 0,
            x: 0,
            y: 0,
            width: (isVertical ? bounds.width : itemSize) as any,
            height: (isVertical ? itemSize : bounds.height) as any,
        },
        data,
        previouseData: data,
        nextData: data,
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
            isVertical,
            dynamic,
            isSnappingMethodAdvanced: false,
            tabIndex: 0,
            zIndex: "0",
        },
    }
}

/**
 * PrerenderTrackBox
 * Maximum performance for extremely large lists.
 * It is based on algorithms for virtualization of screen objects.
 * @link https://github.com/DjonnyX/ng-virtual-list/blob/21.x/projects/ng-virtual-list/src/lib/prerender-container/core/prerender-track-box.ts
 * @author Evgenii Alexandrovich Grebennikov
 * @email djonnyx@gmail.com
 */
export class PrerenderTrackBox extends EventEmitter<PrerenderTrackBoxEvents, PrerenderTrackBoxHandlers> {
    private _map: CMap<Id, ISize> | null = new CMap<Id, ISize>();

    private _items: IVirtualListCollection | null = new Array<IVirtualListItem>();

    private _container: ViewContainerRef | null = null;

    private _componentClass: Component$1<BaseVirtualListItemComponent> | null = null;

    private _components: Array<ComponentRef<BaseVirtualListItemComponent>> | null = new Array<ComponentRef<BaseVirtualListItemComponent>>();

    private _componentsResizeObserver: ResizeObserver | null = new ResizeObserver(() => {
        const components = this._components;
        if (!!components) {
            for (const comp of components) {
                const { width, height } = comp.instance.getBounds();
                this._map?.set(comp.instance.itemId!, { width, height });
            }
        }
        this.dispatch(PrerenderTrackBoxEvents.RESIZE, (this._map?.toObject() || {}));
    });

    private _active: boolean = true;
    get active() { return this._active; }

    private refresh(componentClass: Component$1<BaseVirtualListItemComponent>, bounds: ISize, params: IPrerenderTrackBoxRefreshParams) {
        const isVertical = params.isVertical ?? true,
            dynamic = params.dynamic ?? DEFAULT_DYNAMIC_SIZE,
            itemsSize = params.itemSize ?? DEFAULT_ITEM_SIZE,
            trackBy = params.trackBy ?? TRACK_BY_PROPERTY_NAME,
            itemRenderer = params.itemRenderer,
            boundsSize = isVertical ? bounds.height : bounds.width,
            items = this._items, components = this._components,
            resizeObserver = this._componentsResizeObserver;

        if (!items || !components || !this._container) {
            return;
        }
        let totalSize = 0, j = 0;
        for (let i = items.length - 1, l = 0; i >= l; i--) {
            if (totalSize > boundsSize) {
                break;
            }
            const item = items[i];
            if (!!item) {
                const id = item[trackBy], index = items.length - i - 1;
                let comp: ComponentRef<BaseVirtualListItemComponent>;
                if (components.length <= j) {
                    comp = this._container.createComponent(componentClass);
                    comp.instance.renderer = itemRenderer;
                    if (!!resizeObserver) {
                        resizeObserver.observe(comp.instance.element);
                    }
                    components.push(comp);
                } else {
                    comp = components[j];
                }
                comp.instance.item = createItemData(item, isVertical, bounds, boundsSize, dynamic, itemsSize, id, index);
                comp.instance.show();
                const { width, height } = comp.instance.getBounds(),
                    w = isVertical ? width : width < itemsSize ? itemsSize : width,
                    h = isVertical ? height < itemsSize ? itemsSize : height : height;
                totalSize += isVertical ? h : w;
                j++;
            }
        }
    }

    create(container: ViewContainerRef) {
        this._container = container;
    }

    reset(componentClass: Component$1<BaseVirtualListItemComponent>, items: IVirtualListCollection,
        bounds: ISize, params: IPrerenderTrackBoxRefreshParams) {
        this._items = items;
        this._componentClass = componentClass;
        this.refresh(componentClass, bounds, params);
    }

    getCache(): PrerenderCache {
        return !!this._map ? this._map.toObject() : {};
    }

    clear() {
        if (!!this._map) {
            this._map.clear();
        }
    }

    on() {
        if (this._active) {
            return;
        }

        this._active = true;
        const components = this._components;
        if (!!components) {
            const observer = this._componentsResizeObserver;
            for (const comp of components) {
                if (!!comp && !!observer) {
                    observer.observe(comp.instance.element);
                }
            }
        }
    }

    off() {
        if (!this._active) {
            return;
        }

        this._active = false;
        if (!!this._componentsResizeObserver) {
            this._componentsResizeObserver?.disconnect();
        }
    }

    override dispose() {
        super.dispose();

        if (!!this._map) {
            this._map.clear();
            this._map = null;
        }

        if (!!this._items) {
            this._items = null;
        }

        if (!!this._componentClass) {
            this._componentClass = null;
        }

        if (!!this._container) {
            this._container = null;
        }

        if (!!this._components) {
            this._components = null;
        }

        if (!!this._componentsResizeObserver) {
            this._componentsResizeObserver.disconnect();
            this._componentsResizeObserver = null;
        }
    }
}
