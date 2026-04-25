import { isPercentageValue } from "./is-persentage-value";

const PERSENTS_100 = 100,
    PERSENTS_1 = 1,
    SIZE_PERSENT = '%',
    CHAR_NONE = '';

export const parseFloatOrPersentageValue = (value: number | `${number}%` | string): number => {
    const isPercentage = isPercentageValue(value);
    if (isPercentage) {
        const v = parseFloat(String(value).replace(SIZE_PERSENT, CHAR_NONE));
        return v / (isPercentage ? PERSENTS_100 : PERSENTS_1);
    }
    return value as number;
}
