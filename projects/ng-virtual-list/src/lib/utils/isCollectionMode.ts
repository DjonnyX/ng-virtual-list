import { CollectionMode, CollectionModes } from "../enums";

const NORMAL_ALIASES = [CollectionModes.NORMAL, 'normal'],
    LAZY_ALIASES = [CollectionModes.LAZY, 'lazy'];

/**
 * Determines the axis membership of a virtual list
 * @link https://github.com/DjonnyX/ng-virtual-list/blob/14.x/projects/ng-virtual-list/src/lib/utils/isCollectionMode.ts
 * @author Evgenii Grebennikov
 * @email djonnyx@gmail.com
 */
export const isCollectionMode = (src: CollectionMode, expected: CollectionMode): boolean => {
    if (LAZY_ALIASES.includes(expected)) {
        return LAZY_ALIASES.includes(src);
    }
    return NORMAL_ALIASES.includes(src);
}