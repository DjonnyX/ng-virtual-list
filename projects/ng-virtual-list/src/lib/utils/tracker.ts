import { ComponentRef } from "@angular/core";
import { ScrollDirection } from "../models";
import { Id, ISize } from "../types";
import { BaseVirtualListItemComponent } from "../models/base-virtual-list-item-component";
import { CMap } from "./cacheMap";

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
 * @link https://github.com/DjonnyX/ng-virtual-list/blob/16.x/projects/ng-virtual-list/src/lib/utils/tracker.ts
 * @author Evgenii Grebennikov
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

    /**
     * tracking by propName
     */
    track(items: Array<any>, components: Array<ComponentRef<C>>, snapedComponent: ComponentRef<C> | null | undefined,
        direction: ScrollDirection): void {
        if (!items) {
            return;
        }

        const idPropName = this._trackingPropertyName, untrackedItems = [...components], newTrackItems: Array<ComponentRef<C>> = [], isDown = direction === 0 || direction === 1;
        let isRegularSnapped = false;

        for (let i = isDown ? 0 : items.length - 1, l = isDown ? items.length : 0; isDown ? i < l : i >= l; isDown ? i++ : i--) {
            const item = items[i], itemTrackingProperty = item[idPropName];

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
                            if (snapedComponent) {
                                if (item['config']['snapped'] || item['config']['snappedOut']) {
                                    isRegularSnapped = true;
                                    snapedComponent.instance.item = item;
                                    snapedComponent.instance.show();
                                }
                            }
                            comp.instance.item = item;

                            if (snapedComponent) {
                                if (item['config']['snapped'] || item['config']['snappedOut']) {
                                    comp.instance.hide();
                                } else {
                                    comp.instance.show();
                                }
                            } else {
                                comp.instance.show();
                            }
                            untrackedItems.splice(indexByUntrackedItems, 1);
                            continue;
                        }
                    }
                    this._trackMap.delete(itemTrackingProperty);
                }
            }

            if (untrackedItems.length > 0) {
                newTrackItems.push(item);
            }
        }

        for (let i = 0, l = newTrackItems.length; i < l; i++) {
            const item = newTrackItems[i], itemTrackingProperty = (item as any)[idPropName];
            if (untrackedItems.length > 0) {
                const comp = untrackedItems.shift(), item = items[i];
                if (comp) {
                    if (snapedComponent) {
                        if (item['config']['snapped'] || item['config']['snappedOut']) {
                            isRegularSnapped = true;
                            snapedComponent.instance.item = item;
                            snapedComponent.instance.show();
                        }
                    }
                    comp.instance.item = item;
                    if (snapedComponent) {
                        if (item['config']['snapped'] || item['config']['snappedOut']) {
                            comp.instance.hide();
                        } else {
                            comp.instance.show();
                        }
                    } else {
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
                comp.instance.hide();
            }
        }

        if (!isRegularSnapped) {
            if (snapedComponent) {
                snapedComponent.instance.item = null;
                snapedComponent.instance.hide();
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

    dispose() {
        if (this._trackMap) {
            this._trackMap.clear();
        }
    }
}