/**
 * Mods for selecting list items.
 * @link https://github.com/DjonnyX/ng-virtual-list/blob/20.x/projects/ng-virtual-list/src/lib/enums/selecting-modes.ts
 * @author Evgenii Alexandrovich Grebennikov
 * @email djonnyx@gmail.com
 */
export enum SelectingModes {
    /**
     * List items are not selectable.
     */
    NONE = 'none',
    /**
     * List items are selected one by one.
     */
    SELECT = 'select',
    /**
     * Multiple selection of list items.
     */
    MULTI_SELECT = 'multi-select',
}