import { Color } from "./color";
import { GradientColor } from "./gradient-color";
import { RoundedCorner } from "./rounded-corner";

/**
 * ScrollBarTheme
 * @link https://github.com/DjonnyX/ng-virtual-list/blob/19.x/projects/ng-virtual-list/src/lib/types/scrollbar-theme.ts
 * @author Evgenii Alexandrovich Grebennikov
 * @email djonnyx@gmail.com
 */
export type ScrollBarTheme = {
    fill: GradientColor;
    hoverFill: GradientColor;
    pressedFill: GradientColor;
    strokeGradientColor: GradientColor;
    strokeAnimationDuration: number;
    thickness: number;
    roundCorner: RoundedCorner;
    rippleColor: Color;
    rippleEnabled: boolean;
}