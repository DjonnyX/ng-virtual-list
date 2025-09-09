/**
 * Methods for selecting list items.
 * @link https://github.com/DjonnyX/ng-virtual-list/blob/18.x/projects/ng-virtual-list/src/lib/enums/methods-for-selecting.ts
 * @author Evgenii Grebennikov
 * @email djonnyx@gmail.com
 */
export enum MethodsForSelecting {
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