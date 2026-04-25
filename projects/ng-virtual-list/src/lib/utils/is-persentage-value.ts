import { PERCENTAGE_VALUE_PATTERN } from "../const";

export const isPercentageValue = (value: number | `${number}%` | string) => {
    if (value === undefined || typeof value === 'number') {
        return false;
    }
    return PERCENTAGE_VALUE_PATTERN.test(value);
};