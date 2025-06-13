import { IRect } from "../types";
import { Id } from "../types/id";
import { IVirtualListItem } from "./item.model";

export interface IRenderVirtualListItem {
    id: Id;
    measures: IRect;
    data: Omit<IVirtualListItem, 'id'>;
};
