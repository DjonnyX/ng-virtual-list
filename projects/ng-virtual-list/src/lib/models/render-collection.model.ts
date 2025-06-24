import { IRenderVirtualListItem } from "./render-item.model";

/**
 * Virtual list screen elements collection interface
 * @link https://github.com/DjonnyX/ng-virtual-list/blob/14.x/projects/ng-virtual-list/src/lib/models/render-collection.model.ts
 * @author Evgenii Grebennikov
 * @email djonnyx@gmail.com
 */
export interface IRenderVirtualListCollection extends Array<IRenderVirtualListItem> { };