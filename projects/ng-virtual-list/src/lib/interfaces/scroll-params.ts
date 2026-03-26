import { Id } from "../types";
/**
 * Interface IScrollParams.
 * @link https://github.com/DjonnyX/ng-virtual-list/blob/20.x/projects/ng-virtual-list/src/lib/interfaces/scroll-options.ts
 * @author Evgenii Alexandrovich Grebennikov
 * @email djonnyx@gmail.com
 */
export interface IScrollParams {
    id: Id;
    behavior?: ScrollBehavior;
    blending?: boolean;
    iteration?: number;
    isLastIteration?: boolean;
    scrollCalled?: boolean;
    cb?: () => void;
}
