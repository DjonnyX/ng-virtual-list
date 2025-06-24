import { ComponentRef } from "@angular/core";

type TrackingPropertyId = string | number;

/**
 * Tracks display items by property
 * @link https://github.com/DjonnyX/ng-virtual-list/blob/16.x/projects/ng-virtual-list/src/lib/utils/tracker.ts
 * @author Evgenii Grebennikov
 * @email djonnyx@gmail.com
 */
export class Tracker<I = any, C = { [prop: string]: any; }> {
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

    constructor(trackingPropertyName: string) {
        this._trackingPropertyName = trackingPropertyName;
    }

    /**
     * tracking by propName
     */
    track(items: Array<any>, components: Array<ComponentRef<any>>,
        afterComponentSetup?: (component: C, item: I) => void): void {
        if (!items) {
            return;
        }

        const idPropName = this._trackingPropertyName, untrackedItems = [...components];

        for (let i = 0, l = items.length; i < l; i++) {
            const item = items[i], itemTrackingProperty = item[idPropName];

            if (this._trackMap) {
                const diId = this._trackMap[itemTrackingProperty];
                if (this._trackMap.hasOwnProperty(itemTrackingProperty)) {
                    const lastIndex = this._displayObjectIndexMapById[diId], el = components[lastIndex];

                    this._checkComponentProperty(el?.instance);

                    const elId = el?.instance?.[itemTrackingProperty];
                    if (el && elId === diId) {
                        const indexByUntrackedItems = untrackedItems.findIndex(v => {
                            this._checkComponentProperty(v.instance);

                            return v.instance[itemTrackingProperty] === elId;
                        });
                        if (indexByUntrackedItems > -1) {
                            el.instance.item = item;

                            if (afterComponentSetup !== undefined) {
                                afterComponentSetup(el.instance, item);
                            }

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
                        this._checkComponentProperty(el.instance);

                        this._trackMap[itemTrackingProperty] = el.instance[itemTrackingProperty];
                    }

                    if (afterComponentSetup !== undefined) {
                        afterComponentSetup(el.instance, item);
                    }
                }
            }
        }

        if (untrackedItems.length) {
            throw Error('Tracking by id caused an error.')
        }
    }

    untrackComponentByIdProperty(component?: C): void {
        if (!component) {
            return;
        }

        const propertyIdName = this._trackingPropertyName;

        this._checkComponentProperty(component);

        if (this._trackMap && (component as any)[propertyIdName] !== undefined) {
            delete this._trackMap[propertyIdName];
        }
    }

    private _checkComponentProperty(component?: C): void {
        if (!component) {
            return;
        }

        const propertyIdName = this._trackingPropertyName;

        try {
            (component as any)[propertyIdName];
        } catch (err) {
            throw Error(`Property ${propertyIdName} does not exist.`);
        }
    }

    dispose() {
        this._trackMap = null;
    }
}