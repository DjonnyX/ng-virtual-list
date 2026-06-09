import { ISize } from "../../interfaces";
import { ItemDisplayMethods } from "../enums";
import { IItem } from "../interfaces";

/**
 * Cache
 * @link https://github.com/DjonnyX/ng-virtual-list/blob/21.x/projects/ng-virtual-list/src/lib/core/types/cache.ts
 * @author Evgenii Alexandrovich Grebennikov
 * @email djonnyx@gmail.com
 */
export type Cache = ISize & { method?: ItemDisplayMethods } & IItem;
