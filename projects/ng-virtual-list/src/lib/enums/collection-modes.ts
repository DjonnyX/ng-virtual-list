/**
 * Action modes for collection elements.
 * @link https://github.com/DjonnyX/ng-virtual-list/blob/20.x/projects/ng-virtual-list/src/lib/enums/collection-modes.ts
 * @author Evgenii Grebennikov
 * @email djonnyx@gmail.com
 */
export enum CollectionModes {
    /**
     * When adding elements to the beginning of the collection, the scroll remains at the current position.
     */
    NORMAL = 'normal',
    /**
     * When adding elements to the beginning of the collection, the scroll is shifted by the sum of the sizes of the new elements.
     */
    LAZY = 'lazy',
}