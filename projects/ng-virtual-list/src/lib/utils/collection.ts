import { Id } from "../types"

/**
 * Returns the removed or updated elements of a collection.
 */
export const getCollectionRemovedOrUpdatedItems = <I extends { id: Id }, C extends Array<I>>(previousCollection: C | null | undefined, currentCollection: C | null | undefined): C => {
    const result = new Array<I> as C;
    if (!currentCollection || currentCollection.length === 0 || !previousCollection || previousCollection.length === 0) {
        return (previousCollection ? [...previousCollection] : []) as C;
    }
    const collectionDict: { [id: Id]: I } = {};
    for (let i = 0, l = currentCollection.length; i < l; i++) {
        const item = currentCollection[i];
        if (item) {
            collectionDict[item.id] = item;
        }
    }
    for (let i = 0, l = previousCollection.length; i < l; i++) {
        const item = previousCollection[i], id = item.id;
        if (item) {
            if (collectionDict.hasOwnProperty(id)) {
                if (item === collectionDict[id]) {
                    continue;
                }
            }
            result.push(item);
        }
    }
    return result;
}
