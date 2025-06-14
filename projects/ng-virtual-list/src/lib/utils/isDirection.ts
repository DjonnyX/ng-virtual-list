import { Direction, Directions } from "../enums";

const HORIZONTAL_ALIASES = [Directions.HORIZONTAL, 'horizontal'],
    VERTICAL_ALIASES = [Directions.VERTICAL, 'vertical']
    ;

export const isDirection = (src: Direction, expected: Direction): boolean => {
    if (HORIZONTAL_ALIASES.includes(expected)) {
        return HORIZONTAL_ALIASES.includes(src);
    }
    return VERTICAL_ALIASES.includes(src);
}