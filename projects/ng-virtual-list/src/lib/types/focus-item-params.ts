import { FocusAlignment } from "./focus-alignment";

/**
 * FocusItemParams
 * @link https://github.com/DjonnyX/ng-virtual-list/blob/20.x/projects/ng-virtual-list/src/lib/types/focus-item-params.ts
 * @author Evgenii Alexandrovich Grebennikov
 * @email djonnyx@gmail.com
 */
export type FocusItemParams = {
    element: HTMLElement;
    position: number;
    align?: FocusAlignment;
    behavior?: ScrollBehavior
}
