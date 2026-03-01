import { SubstarateStyles } from "../enums/substrate-styles";

/**
 * SubstarateStyle
 * Maximum performance for extremely large lists.
 * It is based on algorithms for virtualization of screen objects.
 * @link https://github.com/DjonnyX/ng-virtual-list/blob/16.x/projects/ng-virtual-list/src/lib/components/substrate/types/substrate-style.ts
 * @author Evgenii Alexandrovich Grebennikov
 * @email djonnyx@gmail.com
 */
export type SubstarateStyle = SubstarateStyles.NONE | SubstarateStyles.STROKE | 'none' | 'stroke';
