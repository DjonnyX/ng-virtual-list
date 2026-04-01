import { IDisplayObjectConfig, IDisplayObjectMeasures } from "../../../models";

export interface ITemplateContext<D = any> {
    data: D;
    prevData: D;
    nextData: D;
    measures: IDisplayObjectMeasures | null;
    config: IDisplayObjectConfig;
    reseted: boolean;
    index: number;
}