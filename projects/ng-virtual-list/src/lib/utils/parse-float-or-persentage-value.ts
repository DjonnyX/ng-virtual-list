import { isPercentageValue } from "./is-persentage-value";

const PERSENTS_100 = 100,
    PERSENTS_1 = 1,
    SIZE_PERSENT = '%',
    CHAR_NONE = '';

/**
 * parseFloatOrPersentageValue
 * @link https://github.com/DjonnyX/ng-virtual-list/blob/20.x/projects/ng-virtual-list/src/lib/utils/parse-float-or-persentage-value.ts
 * @author Evgenii Alexandrovich Grebennikov
 * @email djonnyx@gmail.com
 */
export const parseFloatOrPersentageValue = (value: number | `${number}%` | string): number => {
    const isPercentage = isPercentageValue(value);
    if (isPercentage) {
        const v = parseFloat(String(value).replace(SIZE_PERSENT, CHAR_NONE));
        return v / (isPercentage ? PERSENTS_100 : PERSENTS_1);
    }
    return value as number;
}
