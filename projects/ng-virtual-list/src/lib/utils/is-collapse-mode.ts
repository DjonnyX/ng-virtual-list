import { CollapsingModes } from "../enums";
import { CollapsingMode } from "../types";

const NONE_ALIASES = [CollapsingModes.NONE, 'none'],
    MULTIMPLE_ALIASES = [CollapsingModes.MULTI_COLLAPSE, 'multi-collapse'],
    ACCORDION_ALIASES = [CollapsingModes.ACCORDION, 'accordion'];

/**
 * Defines the mode for collapsing list items.
 * @link https://github.com/DjonnyX/ng-virtual-list/blob/20.x/projects/ng-virtual-list/src/lib/utils/is-collapse-mode.ts
 * @author Evgenii Alexandrovich Grebennikov
 * @email djonnyx@gmail.com
 */
export const isCollapseMode = (src: CollapsingMode, expected: CollapsingMode): boolean => {
    if (NONE_ALIASES.includes(expected)) {
        return NONE_ALIASES.includes(src);
    } else if (MULTIMPLE_ALIASES.includes(expected)) {
        return MULTIMPLE_ALIASES.includes(src);
    }
    return ACCORDION_ALIASES.includes(src);
}
