import { IItemTransformation } from "../interfaces";
import { IRenderVirtualListItemConfig, IRenderVirtualListItemMeasures } from "../models";

/**
 * ItemTransform
 * @link https://github.com/DjonnyX/ng-virtual-list/blob/20.x/projects/ng-virtual-list/src/lib/types/item-transform.ts
 * @author Evgenii Alexandrovich Grebennikov
 * @email djonnyx@gmail.com
 */
export type ItemTransform = (index: number, measures: IRenderVirtualListItemMeasures, config: IRenderVirtualListItemConfig) =>
    IItemTransformation;
