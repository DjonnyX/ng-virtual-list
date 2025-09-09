/**
 * Methods for selecting list items.
 * @link https://github.com/DjonnyX/ng-virtual-list/blob/14.x/projects/ng-virtual-list/src/lib/enums/method-for-selecting-types.ts
 * @author Evgenii Grebennikov
 * @email djonnyx@gmail.com
 */
export enum MethodsForSelectingTypes {
    /**
     * List items are not selectable.
     */
    NONE = 0,
    /**
     * List items are selected one by one.
     */
    SELECT = 1,
    /**
     * Multiple selection of list items.
     */
    MULTI_SELECT = 2,
}