import { CollapsingModes } from "../enums/collapsing-modes";

/**
 * Modes for collapsing list items.
 * @link https://github.com/DjonnyX/ng-virtual-list/blob/15.x/projects/ng-virtual-list/src/lib/enums/collapsing-mode.ts
 * @author Evgenii Alexandrovich Grebennikov
 * @email djonnyx@gmail.com
 */
export type CollapsingMode = CollapsingModes | 'none' | 'multi-collapse' | 'accordion';
