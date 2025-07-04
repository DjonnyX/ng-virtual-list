import { ComponentRef } from "@angular/core";
import { ScrollDirection } from "../models";

type TrackingPropertyId = string | number;

interface IVirtualListItemComponent<I = any> {
    id: number;
    item: I;
    show: () => void;
    hide: () => void;
}

/**
 * Tracks display items by property
 * @link https://github.com/DjonnyX/ng-virtual-list/blob/20.x/projects/ng-virtual-list/src/lib/utils/tracker.ts
 * @author Evgenii Grebennikov
 * @email djonnyx@gmail.com
 */
export class Tracker<I = any, C extends IVirtualListItemComponent = any> {
    /**
     * display objects dictionary of indexes by id
     */
    private _displayObjectIndexMapById: { [id: number]: number } = {};

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
    private _trackMap: { [id: TrackingPropertyId]: number } | null = {};

    get trackMap() {
        return this._trackMap;
    }

    private _trackingPropertyName!: string;

    set trackingPropertyName(v: string) {
        this._trackingPropertyName = v;
    }

    constructor(trackingPropertyName: string) {
        this._trackingPropertyName = trackingPropertyName;
    }

    /**
     * tracking by propName
     */
    track(items: Array<any>, components: Array<ComponentRef<C>>,
        direction: ScrollDirection): void {
        if (!items) {
            return;
        }

        const idPropName = this._trackingPropertyName, untrackedItems = [...components], isDown = direction === 0 || direction === 1;

        for (let i = isDown ? 0 : items.length - 1, l = isDown ? items.length : 0; isDown ? i < l : i >= l; isDown ? i++ : i--) {
            const item = items[i], itemTrackingProperty = item[idPropName];

            if (this._trackMap) {
                if (this._trackMap.hasOwnProperty(itemTrackingProperty)) {
                    const diId = this._trackMap[itemTrackingProperty],
                        compIndex = this._displayObjectIndexMapById[diId], comp = components[compIndex];

                    const compId = comp?.instance?.id;
                    if (comp !== undefined && compId == diId) {
                        const indexByUntrackedItems = untrackedItems.findIndex(v => {
                            return v.instance.id == compId;
                        });
                        if (indexByUntrackedItems > -1) {
                            comp.instance.item = item;
                            comp.instance.show();
                            untrackedItems.splice(indexByUntrackedItems, 1);
                            continue;
                        }
                    }
                    delete this._trackMap[itemTrackingProperty];
                }
            }

            if (untrackedItems.length > 0) {
                const el = untrackedItems.shift(), item = items[i];
                if (el) {
                    el.instance.item = item;

                    if (this._trackMap) {
                        this._trackMap[itemTrackingProperty] = el.instance.id;
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
    }

    untrackComponentByIdProperty(component?: C): void {
        if (!component) {
            return;
        }

        const propertyIdName = this._trackingPropertyName;

        if (this._trackMap && (component as any)[propertyIdName] !== undefined) {
            delete this._trackMap[propertyIdName];
        }
    }

    dispose() {
        this._trackMap = null;
    }
}