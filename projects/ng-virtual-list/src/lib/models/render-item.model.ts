import { IRect } from "../types";
import { Id } from "../types/id";
import { IVirtualListItem } from "./item.model";
import { IRenderVirtualListItemConfig } from "./render-item-config.model";

/**
 * List screen element model
 * @link https://github.com/DjonnyX/ng-virtual-list/blob/14.x/projects/ng-virtual-list/src/lib/models/render-item.model.ts
 * @author Evgenii Grebennikov
 * @email djonnyx@gmail.com
 */
export interface IRenderVirtualListItem {
    /**
     * Unique identifier of the element.
     */
    id: Id;
    /**
     * Element metrics.
     */
    measures: IRect;
    /**
     * Element data.
     */
    data: IVirtualListItem;
    /**
     * Object with configuration parameters for IRenderVirtualListItem.
     */
    config: IRenderVirtualListItemConfig;
};
