import { Id } from "../types";

/**
 * IScrollParams
 * @link https://github.com/DjonnyX/ng-virtual-list/blob/15.x/projects/ng-virtual-list/src/lib/interfaces/scroll-options.ts
 * @author Evgenii Alexandrovich Grebennikov
 * @email djonnyx@gmail.com
 */
export interface IScrollParams {
    id: Id;
    behavior?: ScrollBehavior | "auto" | "instant" | "smooth";
    blending?: boolean;
    iteration?: number;
    isLastIteration?: boolean;
    scrollCalled?: boolean;
    delay?: number;
    cb?: () => void;
}
