import { IRenderVirtualListCollection } from "../../models/render-collection.model";

/**
 * IUpdateCollectionReturns
 * @link https://github.com/DjonnyX/ng-virtual-list/blob/17.x/projects/ng-virtual-list/src/lib/core/interfaces/update-collection-returns.ts
 * @author Evgenii Alexandrovich Grebennikov
 * @email djonnyx@gmail.com
 */
export interface IUpdateCollectionReturns {
    displayItems: IRenderVirtualListCollection;
    totalSize: number;
    leftLayoutOffset: number;
    delta: number;
    crudDetected: boolean;
}