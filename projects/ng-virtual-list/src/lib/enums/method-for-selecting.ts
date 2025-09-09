import { MethodsForSelecting } from "./methods-for-selecting";

/**
 * Methods for selecting list items.
 * @link https://github.com/DjonnyX/ng-virtual-list/blob/19.x/projects/ng-virtual-list/src/lib/enums/method-for-selecting.ts
 * @author Evgenii Grebennikov
 * @email djonnyx@gmail.com
 */
export type MethodForSelecting = MethodsForSelecting | 'none' | 'select' | 'multi-select';
