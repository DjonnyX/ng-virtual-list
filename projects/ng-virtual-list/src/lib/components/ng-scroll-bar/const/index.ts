import { IScrollBarTemplateContext } from "../interfaces";

export const DEFAULT_THICKNESS = 6,
    DEFAULT_SIZE = 6,
    PX = 'px',
    WIDTH = 'width',
    HEIGHT = 'height',
    OPACITY = 'opacity',
    OPACITY_0 = '0',
    OPACITY_1 = '1',
    TRANSITION = 'transition',
    NONE = 'none',
    TRANSITION_FADE_IN = `${OPACITY} 500ms ease-out`;

export const DEFAULT_SCROLLBAR_TEMPLATE_CONTEXT: IScrollBarTemplateContext = {
    api: null,
    width: 0,
    height: 0,
    fillPositions: [0, 1],
    params: {}
}
