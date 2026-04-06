import { GradientColor } from "../../interfaces";
import { CustomScrollBarTheme } from "../interfaces/custom-scrollbar-theme";

const X_LITE_BLUE_PLASMA_GRADIENT: GradientColor = ["rgba(133, 142, 255, 0)", "rgb(126, 219, 255)"];

export const DEFAULT_SCROLLBAR_THEME: CustomScrollBarTheme = {
    fill: ["rgba(198, 172, 248, 1)", "rgba(168, 229, 250, 1)"],
    hoverFill: ["rgba(165, 136, 220, 1)", "rgba(132, 195, 217, 1)"],
    pressedFill: ["rgba(132, 104, 185, 1)", "rgba(107, 171, 193, 1)"],
    strokeGradientColor: X_LITE_BLUE_PLASMA_GRADIENT,
    strokeAnimationDuration: 1000,
    roundCorner: [3, 3, 3, 3],
    rippleColor: 'rgba(0,0,0,0.5)',
    rippleEnabled: true,
}
