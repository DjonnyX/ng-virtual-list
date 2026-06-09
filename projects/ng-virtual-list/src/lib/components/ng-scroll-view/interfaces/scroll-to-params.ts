import { Easing } from "../../../utils/animator";

/**
 * IScrollToParams
 * @link https://github.com/DjonnyX/ng-virtual-list/blob/14.x/projects/ng-virtual-list/src/lib/components/ng-scroll-view/interfaces/scroll-to-params.ts
 * @author Evgenii Alexandrovich Grebennikov
 * @email djonnyx@gmail.com
 */
export interface IScrollToParams {
    x?: number;
    y?: number;
    left?: number;
    top?: number;
    snap?: boolean;
    normalize?: boolean;
    force?: boolean;
    blending?: boolean;
    behavior?: ScrollBehavior | "auto" | "instant" | "smooth";
    ease?: Easing;
    fireUpdate?: boolean;
    userAction?: boolean;
    duration?: number;
}
