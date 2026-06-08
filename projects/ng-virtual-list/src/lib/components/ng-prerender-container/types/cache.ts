import { ISize } from '../../../interfaces';
import { Id } from "../../../types";

/**
 * PrerenderCache
 * Maximum performance for extremely large lists.
 * It is based on algorithms for virtualization of screen objects.
 * @link https://github.com/DjonnyX/ng-virtual-list/blob/14.x/projects/ng-virtual-list/src/lib/prerender-container/types/cache.ts
 * @author Evgenii Alexandrovich Grebennikov
 * @email djonnyx@gmail.com
 */
export type PrerenderCache = { [id: Id]: ISize };
