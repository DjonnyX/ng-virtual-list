import { MethodForSelecting, MethodsForSelecting } from "../enums";

const NONE_ALIASES = [MethodsForSelecting.NONE, 'none'],
    SELECT_ALIASES = [MethodsForSelecting.SELECT, 'select'],
    MULTI_SELECT_ALIASES = [MethodsForSelecting.MULTI_SELECT, 'multi-select'];

/**
 * Defines the method for selecting list items.
 * @link https://github.com/DjonnyX/ng-virtual-list/blob/19.x/projects/ng-virtual-list/src/lib/utils/isMethodForSelecting.ts
 * @author Evgenii Grebennikov
 * @email djonnyx@gmail.com
 */
export const isMethodForSelecting = (src: MethodForSelecting, expected: MethodForSelecting): boolean => {
    if (NONE_ALIASES.includes(expected)) {
        return NONE_ALIASES.includes(src);
    } else if (SELECT_ALIASES.includes(expected)) {
        return SELECT_ALIASES.includes(src);
    }
    return MULTI_SELECT_ALIASES.includes(src);
}
