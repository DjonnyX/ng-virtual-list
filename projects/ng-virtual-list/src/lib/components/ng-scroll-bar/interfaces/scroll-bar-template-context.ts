import { GradientColorPositions } from "../../../types";
import { NgScrollBarPublicService } from "../ng-scroll-bar-public.service";

export interface IScrollBarTemplateContext {
    /**
     * API provider
     */
    api: NgScrollBarPublicService | null;
    /**
     * Scrollbar thumb width.
     */
    width: number;
    /**
     * Scrollbar thumb height.
     */
    height: number;
    /**
     * Gradient fill position parameters.
     */
    fillPositions: GradientColorPositions;
    /**
     * Additional options for the scrollbar.
     */
    params: { [propName: string]: any };
}
