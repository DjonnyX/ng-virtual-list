import { PERCENTAGE_VALUE_PATTERN } from "../const";

/**
 * isPercentageValue
 * @link https://github.com/DjonnyX/ng-virtual-list/blob/20.x/projects/ng-virtual-list/src/lib/utils/is-persentage-value.ts
 * @author Evgenii Alexandrovich Grebennikov
 * @email djonnyx@gmail.com
 */
export const isPercentageValue = (value: number | `${number}%` | string) => {
    if (value === undefined || typeof value === 'number') {
        return false;
    }
    return PERCENTAGE_VALUE_PATTERN.test(value);
};