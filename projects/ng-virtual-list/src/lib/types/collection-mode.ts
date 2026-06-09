import { CollectionModes } from "../enums/collection-modes";

/**
 * Action modes for collection elements.
 * @link https://github.com/DjonnyX/ng-virtual-list/blob/20.x/projects/ng-virtual-list/src/lib/enums/collection-mode.ts
 * @author Evgenii Alexandrovich Grebennikov
 * @email djonnyx@gmail.com
 */
export type CollectionMode = CollectionModes | 'normal' | 'lazy';
