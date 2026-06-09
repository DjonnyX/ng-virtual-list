import { SelectingModes } from "../enums";
import { SelectingMode } from "../types";

const NONE_ALIASES = [SelectingModes.NONE, 'none'],
    SELECT_ALIASES = [SelectingModes.SELECT, 'select'],
    MULTI_SELECT_ALIASES = [SelectingModes.MULTI_SELECT, 'multi-select'];

/**
 * Defines the mode for selecting list items.
 * @link https://github.com/DjonnyX/ng-virtual-list/blob/20.x/projects/ng-virtual-list/src/lib/utils/is-select-mode.ts
 * @author Evgenii Alexandrovich Grebennikov
 * @email djonnyx@gmail.com
 */
export const isSelectMode = (src: SelectingMode, expected: SelectingMode): boolean => {
    if (NONE_ALIASES.includes(expected)) {
        return NONE_ALIASES.includes(src);
    } else if (SELECT_ALIASES.includes(expected)) {
        return SELECT_ALIASES.includes(src);
    }
    return MULTI_SELECT_ALIASES.includes(src);
}
