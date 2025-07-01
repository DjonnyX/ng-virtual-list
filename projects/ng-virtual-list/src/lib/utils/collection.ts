import { Id } from "../types"

interface ICollectionDelta<I extends { id: Id }, C extends Array<I>> {
    deleted: C;
    updated: C;
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
    const result: ICollectionDelta<I, C> = { deleted: new Array<I>() as C, updated: new Array<I>() as C, added: new Array<I>() as C, notChanged: new Array<I>() as C };
    if (!currentCollection || currentCollection.length === 0) {
        return { deleted: (previousCollection ? [...previousCollection] : []) as C, updated: [] as unknown as C, added: [] as unknown as C, notChanged: [] as unknown as C };
    }
    if (!previousCollection || previousCollection.length === 0) {
        return { deleted: [] as unknown as C, updated: [] as unknown as C, added: (currentCollection ? [...currentCollection] : []) as C, notChanged: [] as unknown as C };
    }
    const collectionDict: { [id: Id]: I } = {};
    for (let i = 0, l = currentCollection.length; i < l; i++) {
        const item = currentCollection[i];
        if (item) {
            collectionDict[item.id] = item;
        }
    }
    const notChangedMap: { [id: Id]: I } = {}, deletedMap: { [id: Id]: I } = {}, updatedMap: { [id: Id]: I } = {};
    for (let i = 0, l = previousCollection.length; i < l; i++) {
        const item = previousCollection[i], id = item.id;
        if (item) {
            if (collectionDict.hasOwnProperty(id)) {
                if (item === collectionDict[id]) {
                    result.notChanged.push(item);
                    notChangedMap[item.id] = item;
                    continue;
                } else {
                    result.updated.push(item);
                    updatedMap[item.id] = item;
                    continue;
                }
            }

            result.deleted.push(item);
            deletedMap[item.id] = item;
        }
    }

    for (let i = 0, l = currentCollection.length; i < l; i++) {
        const item = currentCollection[i], id = item.id;
        if (item && !deletedMap.hasOwnProperty(id) && !updatedMap.hasOwnProperty(id) && !notChangedMap.hasOwnProperty(id)) {
            result.added.push(item);
        }
    }

    return result;
}
