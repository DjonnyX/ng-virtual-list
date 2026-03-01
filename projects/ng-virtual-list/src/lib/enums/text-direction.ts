import { TextDirections } from "./text-directions";

/**
 * TextDirection.
 * 'rtl' - right-to-left.
 * 'ltr' - left-to-right.
 * @link https://github.com/DjonnyX/ng-virtual-list/blob/21.x/projects/ng-virtual-list/src/lib/enums/text-direction.ts
 * @author Evgenii Alexandrovich Grebennikov
 * @email djonnyx@gmail.com
 */
export type TextDirection = TextDirections | 'rtl' | 'ltr';
