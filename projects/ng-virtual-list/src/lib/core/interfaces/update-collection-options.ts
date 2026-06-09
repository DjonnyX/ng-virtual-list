import { IItem } from "./item";
import { IRecalculateMetricsOptions } from "./recalculate-metrics-options";

/**
 * IUpdateCollectionOptions
 * @link https://github.com/DjonnyX/ng-virtual-list/blob/22.x/projects/ng-virtual-list/src/lib/core/interfaces/update-collection-options.ts
 * @author Evgenii Alexandrovich Grebennikov
 * @email djonnyx@gmail.com
 */
export interface IUpdateCollectionOptions<I extends IItem, C extends Array<I>>
    extends Omit<IRecalculateMetricsOptions<I, C>, 'collection' | 'previousTotalSize' | 'crudDetected' | 'deletedItemsMap'> { }
