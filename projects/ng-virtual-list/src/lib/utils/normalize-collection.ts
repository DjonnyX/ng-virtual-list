import { SERVICE_PROP_DUMMY, SERVICE_PROP_DUMMY_ENABLED, SERVICE_PROP_DUMMY_ID } from "../const";
import { IVirtualListCollection, IVirtualListItemConfigMap } from "../models";

/**
 * normalizeCollection
 * @link https://github.com/DjonnyX/ng-virtual-list/blob/20.x/projects/ng-virtual-list/src/lib/utils/normalize-collection.ts
 * @author Evgenii Alexandrovich Grebennikov
 * @email djonnyx@gmail.com
 */
export const normalizeCollection = (items: IVirtualListCollection, itemConfigMap: IVirtualListItemConfigMap, trackBy: string, divides: number) => {
    if (divides > 1) {
        const normalizedItems: IVirtualListCollection<any | null> = [];
        let ci = -1, emptyId = Number.MIN_SAFE_INTEGER, offset = 0;
        for (let i = 0, l = items.length; i < l; i++) {
            const dummyId = `${SERVICE_PROP_DUMMY_ID}-${i}`;
            const ii = i + offset, item = items[i], id = item[trackBy] ?? null, config = id !== null ? itemConfigMap[id] : null,
                sticky = !!config ? (!!config.sticky && config.sticky > 0) : false;

            if ((ii % divides) === 0) {
                ci = 0;
            } else {
                ci++;
            }

            if (sticky && ii > 0 && ci !== 0) {
                for (let j = ci; j < divides; j++) {
                    normalizedItems.push({[trackBy]: dummyId, [SERVICE_PROP_DUMMY]: SERVICE_PROP_DUMMY_ENABLED });
                    emptyId++;
                    offset++;
                }
            }
            normalizedItems.push(item);
            if (sticky && (i < (l - 1))) {
                for (let j = 1; j < divides; j++) {
                    normalizedItems.push({[trackBy]: dummyId, [SERVICE_PROP_DUMMY]: SERVICE_PROP_DUMMY_ENABLED });
                    emptyId++;
                    offset++;
                }
            }
        }
        return normalizedItems;
    }
    return items;
}
