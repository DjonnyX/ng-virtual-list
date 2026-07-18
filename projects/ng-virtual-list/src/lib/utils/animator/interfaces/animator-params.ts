import { Easing } from "../types";
import { IAnimatorUpdateData } from "./animator-update-data";

/**
 * IAnimatorParams
 * @link https://github.com/DjonnyX/ng-virtual-list/21.x/library/src/utils/animator/interfaces/animator-params.ts
 * @author Evgenii Alexandrovich Grebennikov
 * @email djonnyx@gmail.com
 */
export interface IAnimatorParams {
    startValue: number;
    endValue: number;
    duration?: number;
    withDelta?: boolean;
    getPropValue?: () => number;
    easingFunction?: Easing;
    onUpdate?: (data: IAnimatorUpdateData) => void;
    onComplete?: (data: IAnimatorUpdateData) => void;
}