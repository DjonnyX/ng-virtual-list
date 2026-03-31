import { ComponentRef } from "@angular/core";
import { ScrollDirection } from "../types";
import { IRenderVirtualListCollection } from "../models/render-collection.model";
import { BaseVirtualListItemComponent } from "../components/list-item/base";
import { ISize } from '../interfaces';
import { Id } from "../types";
import { CMap } from "../utils/cmap";

type TrackingPropertyId = string | number;

export interface IVirtualListItemComponent<I = any> {
    getBounds(): ISize;
    itemId: Id;
    id: number;
    item: I | null;
    show: () => void;
    hide: () => void;
}

/**
 * Tracks display items by property
 * Maximum performance for extremely large lists.
 * It is based on algorithms for virtualization of screen objects.
 * @link https://github.com/DjonnyX/ng-virtual-list/blob/14.x/projects/ng-virtual-list/src/lib/core/tracker.ts
 * @author Evgenii Alexandrovich Grebennikov
 * @email djonnyx@gmail.com
 */
export class Tracker<C extends BaseVirtualListItemComponent = any> {
    /**
     * display objects dictionary of indexes by id
     */
    protected _displayObjectIndexMapById: { [id: number]: number } = {};

    set displayObjectIndexMapById(v: { [id: number]: number }) {
        if (this._displayObjectIndexMapById === v) {
            return;
        }

        this._displayObjectIndexMapById = v;
    }

    get displayObjectIndexMapById() {
        return this._displayObjectIndexMapById;
    }

    /**
     * Dictionary displayItems propertyNameId by items propertyNameId
     */
    protected _trackMap = new CMap<TrackingPropertyId, number>();

    get trackMap() {
        return this._trackMap;
    }

    protected _trackingPropertyName!: string;

    set trackingPropertyName(v: string) {
        this._trackingPropertyName = v;
    }

    constructor(trackingPropertyName: string) {
        this._trackingPropertyName = trackingPropertyName;
    }

    private tearOutSnapedDisplayObjectByItemId = (itemId: Id, snappedComponents: Array<ComponentRef<C>> | null | undefined):
        ComponentRef<C> | null => {
        if (!snappedComponents || snappedComponents?.length === 0) {
            return null;
        }
        const index = snappedComponents?.findIndex(comp => comp?.instance?.itemId === itemId);
        if (index > -1) {
            const comp = snappedComponents[index];
            snappedComponents.splice(index, 1);
            return comp;
        }
        return snappedComponents.shift() ?? null;
    }

    /**
     * tracking by propName
     */
    track(items: IRenderVirtualListCollection, components: Array<ComponentRef<C>>, snappedComponents: Array<ComponentRef<C>> | null | undefined,
        direction: ScrollDirection): void {
        if (!items) {
            return;
        }

        const untrackedItems = [...components], newTrackItems: Array<any> = [],
            untrackedComponentsByTypeMap: { [type: string]: Array<{ comp: ComponentRef<C>; index: number }>; } = {},
            isDown = direction === 0 || direction === 1, snapped = !!snappedComponents ? [...snappedComponents] : [];
        let isRegularSnapped = false;

        for (let i = isDown ? 0 : items.length - 1, l = isDown ? items.length : 0; isDown ? i < l : i >= l; isDown ? i++ : i--) {
            const item = items[i], itemTrackingProperty = item.id;
            let snappedComponent: ComponentRef<C> | null | undefined;
            if (this._trackMap) {
                if (this._trackMap.has(itemTrackingProperty)) {
                    const diId = this._trackMap.get(itemTrackingProperty),
                        compIndex = this._displayObjectIndexMapById[diId], comp = components[compIndex];

                    const compId = comp?.instance?.id;
                    if (comp !== undefined && compId === diId) {
                        const indexByUntrackedItems = untrackedItems.findIndex(v => {
                            return v.instance.id === compId;
                        });
                        if (indexByUntrackedItems > -1) {
                            if (item.config.snapped || item.config.snappedOut) {
                                if (snapped.length > 0) {
                                    snappedComponent = this.tearOutSnapedDisplayObjectByItemId(item.id, snapped);
                                    if (!!snappedComponent) {
                                        isRegularSnapped = true;
                                        snappedComponent.instance.item = item;
                                        snappedComponent.instance.show();
                                    }
                                }
                            }

                            if (!!snappedComponent) {
                                if (item.config.snapped || item.config.snappedOut) {
                                    comp.instance.item = null;
                                    comp.instance.hide();
                                } else {
                                    comp.instance.item = item;
                                    comp.instance.show();
                                }
                            } else {
                                comp.instance.item = item;
                                comp.instance.show();
                            }
                            untrackedItems.splice(indexByUntrackedItems, 1);
                            continue;
                        }
                    }
                } else {
                    this._trackMap.delete(itemTrackingProperty);

                }
            }

            if (untrackedItems.length > 0) {
                newTrackItems.push(item);
            }
        }

        if (untrackedItems.length > 0) {
            for (let i = 0, l = untrackedItems.length; i < l; i++) {
                const comp = untrackedItems[i], type = comp?.instance.item?.data?.type;
                if (!Array.isArray(untrackedComponentsByTypeMap[type])) {
                    untrackedComponentsByTypeMap[type] = [];
                }
                untrackedComponentsByTypeMap[type].push({ comp, index: i });
            }
        }

        for (let i = 0, l = newTrackItems.length; i < l; i++) {
            let snappedComponent: ComponentRef<C> | null | undefined;
            if (untrackedItems.length > 0) {
                const item = newTrackItems[i], itemTrackingProperty = item.id,
                    type = item.data?.type;
                let comp: ComponentRef<C> | undefined;
                if (type) {
                    const list = untrackedComponentsByTypeMap[type];
                    if (Array.isArray(list) && list.length > 0) {
                        const untrackedItem = list.shift();
                        if (untrackedItem) {
                            comp = untrackedItem.comp;
                            untrackedItems.slice(untrackedItem.index, 1);
                        }
                    }
                }

                if (!comp) {
                    comp = untrackedItems.shift();
                }

                if (comp) {
                    if (item.config.snapped || item.config.snappedOut) {
                        if (snapped.length > 0) {
                            snappedComponent = this.tearOutSnapedDisplayObjectByItemId(item.id, snapped);
                            isRegularSnapped = true;
                            if (!!snappedComponent) {
                                snappedComponent.instance.item = item;
                                snappedComponent.instance.show();
                            }
                        }
                    }
                    if (!!snappedComponent) {
                        if (item.config.snapped || item.config.snappedOut) {
                            comp.instance.item = null;
                            comp.instance.hide();
                        } else {
                            comp.instance.item = item;
                            comp.instance.show();
                        }
                    } else {
                        comp.instance.item = item;
                        comp.instance.show();
                    }

                    if (this._trackMap) {
                        this._trackMap.set(itemTrackingProperty, comp.instance.id);
                    }
                }
            }
        }

        if (untrackedItems.length) {
            for (let i = 0, l = untrackedItems.length; i < l; i++) {
                const comp = untrackedItems[i];
                comp.instance.item = null;
                comp.instance.hide();
            }
        }

        if (!isRegularSnapped) {
            for (let i = 0, l = snapped.length; i < l; i++) {
                const snappedComponent = snapped[i];
                if (!!snappedComponent) {
                    snappedComponent.instance.item = null;
                    snappedComponent.instance.hide();
                }
            }
        }
    }

    untrackComponentByIdProperty(component?: C): void {
        if (!component) {
            return;
        }

        const propertyIdName = this._trackingPropertyName;

        if (this._trackMap && (component as any)[propertyIdName] !== undefined) {
            this._trackMap.delete(propertyIdName);
        }
    }

    clearTrackMap() {
        this._trackMap.clear();
    }

    dispose() {
        if (this._trackMap) {
            this._trackMap.clear();
        }
    }
}