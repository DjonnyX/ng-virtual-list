/**
 * Dictionary zIndex by id of the list element. If the value is not set or equal to 0, then a simple element is displayed, if the value is greater than 0, then the sticky position mode is enabled for the element.
 * @link https://github.com/DjonnyX/ng-virtual-list/blob/14.x/projects/ng-virtual-list/src/lib/models/sticky-map.model.ts
 * @author Evgenii Grebennikov
 * @email djonnyx@gmail.com
 */
export interface IVirtualListStickyMap {
    /**
     * Sets zIndex for the element ID. If zIndex is greater than 0, then sticky position is applied.
     */
    [id: string]: number;
}