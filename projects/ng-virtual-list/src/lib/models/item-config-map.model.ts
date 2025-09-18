/**
 * Sets `sticky` position, `collapsable` and `selectable` for the list item element. If `sticky` position is greater than `0`, then `sticky` position is applied. 
 * If the `sticky` value is greater than `0`, then the `sticky` position mode is enabled for the element. `1` - position start, `2` - position end. Default value is `0`.
 * `selectable` determines whether an element can be selected or not. Default value is `true`.
 * `collapsable` determines whether an element with a `sticky` property greater than zero can collapse and collapse elements in front that do not have a `sticky` property.
 * @link https://github.com/DjonnyX/ng-virtual-list/blob/19.x/projects/ng-virtual-list/src/lib/models/item-config-map.model.ts
 * @author Evgenii Grebennikov
 * @email djonnyx@gmail.com
 */
export interface IVirtualListItemConfigMap {
    [id: string | number]: {
        /**
         * Sets `sticky` position for the element. If sticky position is greater than `0`, then `sticky` position is applied.
         * `1` - position start, `2` - position end.
         * Default value is `0`.
         */
        sticky?: 0 | 1 | 2;
        /**
         * Determines whether an element with a `sticky` property greater than zero can collapse and collapse elements in front that do not have a `sticky` property.
         * Default value is `false`.
         */
        collapsable?: boolean;
        /**
         * Determines whether an element can be selected or not.
         * Default value is `true`.
         */
        selectable?: boolean;
    }
}