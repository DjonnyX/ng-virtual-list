import { Direction, Directions } from "../enums";

const HORIZONTAL_ALIASES = [Directions.HORIZONTAL, 'horizontal'],
    VERTICAL_ALIASES = [Directions.VERTICAL, 'vertical'];

/**
 * Determines the axis membership of a virtual list
 * @link https://github.com/DjonnyX/ng-virtual-list/blob/14.x/projects/ng-virtual-list/src/lib/utils/isDirection.ts
 * @author Evgenii Grebennikov
 * @email djonnyx@gmail.com
 */
export const isDirection = (src: Direction, expected: Direction): boolean => {
    if (HORIZONTAL_ALIASES.includes(expected)) {
        return HORIZONTAL_ALIASES.includes(src);
    }
    return VERTICAL_ALIASES.includes(src);
}