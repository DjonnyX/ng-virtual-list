import { CollapsingModes } from "../enums/collapsing-modes";

/**
 * Modes for collapsing list items.
 * @link https://github.com/DjonnyX/ng-virtual-list/blob/20.x/projects/ng-virtual-list/src/lib/enums/collapsing-modes.ts
 * @author Evgenii Alexandrovich Grebennikov
 * @email djonnyx@gmail.com
 */
export type CollapsingMode = CollapsingModes | 'none' | 'multi-collapse' | 'accordion';
