import { SnappingMethods } from "./snapping-methods";

/**
 * Snapping method.
 * 'standart' - Classic group visualization.
 * 'advanced' - A mask is applied to the viewport area so that the background is displayed underneath the attached group.
 * @link https://github.com/DjonnyX/ng-virtual-list/blob/14.x/projects/ng-virtual-list/src/lib/enums/snapping-method.ts
 * @author Evgenii Alexandrovich Grebennikov
 * @email djonnyx@gmail.com
 */
export type SnappingMethod = SnappingMethods | 'standart' | 'advanced';