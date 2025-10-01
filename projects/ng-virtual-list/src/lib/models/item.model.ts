/**
 * Virtual list element model
 * For tracking to work correctly, you must set a unique identifier (the property specified by trackBy).
 * @link https://github.com/DjonnyX/ng-virtual-list/blob/17.x/projects/ng-virtual-list/src/lib/models/item.model.ts
 * @author Evgenii Grebennikov
 * @email djonnyx@gmail.com
 */
export type IVirtualListItem<E = Object> = E & {
    [x: string]: any;
};
