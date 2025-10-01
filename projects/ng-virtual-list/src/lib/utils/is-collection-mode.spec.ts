import { CollectionModes } from "../enums/collection-modes";
import { isCollectionMode } from './is-collection-mode';

describe('isCollectionMode', () => {
    it('isLazy value must be true', () => {
        const isLazy = isCollectionMode(CollectionModes.LAZY, CollectionModes.LAZY) && 
        isCollectionMode('lazy', CollectionModes.LAZY) && 
        isCollectionMode(CollectionModes.LAZY, 'lazy');
        expect(isLazy).toBeTruthy();
    });

    it('isLazy value must be false', () => {
        const isLazy = isCollectionMode(CollectionModes.NORMAL, CollectionModes.LAZY);
        expect(isLazy).toBeFalsy();
    });

    it('isNormal value must be true', () => {
        const isNormal = isCollectionMode(CollectionModes.NORMAL, CollectionModes.NORMAL) && 
        isCollectionMode('normal', CollectionModes.NORMAL) && 
        isCollectionMode(CollectionModes.NORMAL, 'normal');
        expect(isNormal).toBeTruthy();
    });

    it('isNormal value must be true', () => {
        const isNormal = isCollectionMode(CollectionModes.LAZY, CollectionModes.NORMAL);
        expect(isNormal).toBeFalsy();
    });
});