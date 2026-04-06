import { IDisplayObjectConfig, IDisplayObjectMeasures } from "../../../models";
import { NgVirtualListPublicService } from "../../../ng-virtual-list-public.service";

/**
 * BaseVirtualListItemComponent
 * @link https://github.com/DjonnyX/ng-virtual-list/blob/14.x/projects/ng-virtual-list/src/lib/components/list-item/interfaces/template-context.ts
 * @author Evgenii Alexandrovich Grebennikov
 * @email djonnyx@gmail.com
 */
export interface ITemplateContext<D = any> {
    /**
     * API provider.
     */
    api: NgVirtualListPublicService | null;
    /**
     * List item data.
     */
    data: D;
    /**
     * Data of the previous list item.
     */
    prevData: D;
    /**
     * Data of the next list item.
     */
    nextData: D;
    /**
     * List item measurement data.
     */
    measures: IDisplayObjectMeasures | null;
    /**
     * List item configuration.
     */
    config: IDisplayObjectConfig;
    /**
     * Indicates a reset state.
     */
    reseted: boolean;
    /**
     * List item index.
     */
    index: number;
}