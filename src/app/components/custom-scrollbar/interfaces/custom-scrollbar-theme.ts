import { Color } from "../../interfaces/color";
import { GradientColor, RoundedCorner } from "../../interfaces";

/**
 * CustomScrollBarTheme
 * @link https://github.com/DjonnyX/ng-virtual-list/blob/14.x/src/app/components/custom-scrollbar/interfaces/custom-scrollbar-theme.ts
 * @author Evgenii Alexandrovich Grebennikov
 * @email djonnyx@gmail.com
 */
export type CustomScrollBarTheme = {
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