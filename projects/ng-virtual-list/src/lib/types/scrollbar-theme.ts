import { Color } from "./color";
import { GradientColor } from "./gradient-color";
import { RoundedCorner } from "./rounded-corner";

/**
 * ScrollBarTheme
 * @link https://github.com/DjonnyX/ng-virtual-list/blob/15.x/projects/ng-virtual-list/src/lib/types/scrollbar-theme.ts
 * @author Evgenii Alexandrovich Grebennikov
 * @email djonnyx@gmail.com
 */
export type ScrollBarTheme = {
    /**
     * Fill color or gradient in normal state.
     */
    fill: Color | GradientColor;
    /**
     * Fill color or gradient in hover state.
     */
    hoverFill: Color | GradientColor;
    /**
     * Fill color or gradient in pressed state.
     */
    pressedFill: Color | GradientColor;
    /**
     * Fill color or gradient in stroke mode.
     */
    strokeGradientColor: Color | GradientColor;
    /**
     * Stroke animation duration.
     */
    strokeAnimationDuration: number;
    /**
     * Scrollbar thickness.
     */
    thickness: number;
    /**
     * An array of edge roundings where ['top-left', 'top-right', 'bottom-right', 'bottom-left']
     */
    roundCorner: RoundedCorner;
    /**
     * Ripple effect color.
     */
    rippleColor: Color;
    /**
     * Determines whether the ripple effect is enabled or not.
     */
    rippleEnabled: boolean;
}