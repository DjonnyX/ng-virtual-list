import { Easing } from "../../../utils/animator";

/**
 * IScrollToParams
 * @link https://github.com/DjonnyX/ng-virtual-list/blob/20.x/projects/ng-virtual-list/src/lib/components/ng-scroll-view/interfaces/scroll-to-params.ts
 * @author Evgenii Alexandrovich Grebennikov
 * @email djonnyx@gmail.com
 */
export interface IScrollToParams {
    x?: number;
    y?: number;
    left?: number;
    top?: number;
    blending?: boolean;
    behavior?: ScrollBehavior;
    ease?: Easing;
    fireUpdate?: boolean;
    userAction?: boolean;
    fromScrollbar?: boolean;
    duration?: number;
}
