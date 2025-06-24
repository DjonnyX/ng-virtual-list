import { Id } from "../types/id";

/**
 * Virtual list element model
 * @link https://github.com/DjonnyX/ng-virtual-list/blob/14.x/projects/ng-virtual-list/src/lib/models/item.model.ts
 * @author Evgenii Grebennikov
 * @email djonnyx@gmail.com
 */
export interface IVirtualListItem {
    /**
     * Unique identifier of the element.
     */
    id: Id;
    [x: string]: any;
};
