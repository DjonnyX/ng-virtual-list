import { ITEM_ID } from "../const";
import { Id } from "../types";

export const getSelectorByItemId = (id: Id) => {
    return `[${ITEM_ID}="${id}"]`;
};
