import { IVirtualListItem } from "./item.model";

/**
 * Virtual list elements collection interface
 * @link https://github.com/DjonnyX/ng-virtual-list/blob/20.x/projects/ng-virtual-list/src/lib/models/collection.model.ts
 * @author Evgenii Grebennikov
 * @email djonnyx@gmail.com
 */
export interface IVirtualListCollection<E = Object> extends Array<IVirtualListItem<E>> { };