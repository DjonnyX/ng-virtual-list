import { Id } from "../types"

interface ICollectionDelta<I extends { id: Id }, C extends Array<I>> {
    deletedOrUpdated: C;
    notChanged: C;
    added: C;
}

/**
 * Returns the removed or updated elements of a collection.
 * @link https://github.com/DjonnyX/ng-virtual-list/blob/19.x/projects/ng-virtual-list/src/lib/utils/collection.ts
 * @author Evgenii Grebennikov
 * @email djonnyx@gmail.com
 */
export const getCollectionRemovedOrUpdatedItems = <I extends { id: Id }, C extends Array<I>>(previousCollection: C | null | undefined, currentCollection: C | null | undefined):
    ICollectionDelta<I, C> => {
    const result: ICollectionDelta<I, C> = { deletedOrUpdated: new Array<I>() as C, added: new Array<I>() as C, notChanged: new Array<I>() as C };
    if (!currentCollection || currentCollection.length === 0) {
        return { deletedOrUpdated: (previousCollection ? [...previousCollection] : []) as C, added: [] as unknown as C, notChanged: [] as unknown as C };
    }
    if (!previousCollection || previousCollection.length === 0) {
        return { deletedOrUpdated: [] as unknown as C, added: (currentCollection ? [...currentCollection] : []) as C, notChanged: [] as unknown as C };
    }
    const collectionDict: { [id: Id]: I } = {};
    for (let i = 0, l = currentCollection.length; i < l; i++) {
        const item = currentCollection[i];
        if (item) {
            collectionDict[item.id] = item;
        }
    }
    const notChangedMap: { [id: Id]: I } = {}, deletedOrUpdatedMap: { [id: Id]: I } = {};
    for (let i = 0, l = previousCollection.length; i < l; i++) {
        const item = previousCollection[i], id = item.id;
        if (item) {
            if (collectionDict.hasOwnProperty(id)) {
                if (item === collectionDict[id]) {
                    result.notChanged.push(item);
                    notChangedMap[item.id] = item;
                    continue;
                }
            }
            result.deletedOrUpdated.push(item);
            deletedOrUpdatedMap[item.id] = item;
        }
    }

    for (let i = 0, l = currentCollection.length; i < l; i++) {
        const item = currentCollection[i];
        if (item && !deletedOrUpdatedMap.hasOwnProperty(item.id) && !notChangedMap.hasOwnProperty(item.id)) {
            result.added.push(item);
        }
    }

    return result;
}
