import { IRect } from "../types";
import { Id } from "../types/id";
import { IVirtualListItem } from "./item.model";
import { IRenderVirtualListItemConfig } from "./render-item-config.model";

export interface IRenderVirtualListItem {
    id: Id;
    measures: IRect;
    data: IVirtualListItem;
    config: IRenderVirtualListItemConfig;
};
