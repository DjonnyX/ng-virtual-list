import { CollectionModes, MethodsForSelecting, SnappingMethods, TextDirections } from "../enums";
import { Directions } from "../enums/directions";
import { GradientColor, IAnimationParams, ScrollBarTheme } from "../types";

export const DEFAULT_ITEM_SIZE = 24;

export const DEFAULT_BUFFER_SIZE = 2;

export const DEFAULT_MAX_BUFFER_SIZE = 10;

export const DEFAULT_LIST_SIZE = 400;

export const DEFAULT_CLICK_DISTANCE = 40;

export const DEFAULT_WAIT_FOR_PREPARATION = true;

export const DEFAULT_SCROLLBAR_ENABLED = true;

export const DEFAULT_SCROLLBAR_INTERACTIVE = true;

export const DEFAULT_SCROLL_BEHAVIOR: ScrollBehavior = 'smooth';

export const DEFAULT_ANIMATION_PARAMS: IAnimationParams = {
    scrollToItem: 50,
    navigateToItem: 150,
};

export const DEFAULT_OVERSCROLL_ENABLED = true;

export const DEFAULT_SNAP = false;

export const DEFAULT_SELECT_BY_CLICK = true;

export const DEFAULT_COLLAPSE_BY_CLICK = true;

export const DEFAULT_ENABLED_BUFFER_OPTIMIZATION = false;

export const DEFAULT_DYNAMIC_SIZE = false;

export const DEFAULT_SNAP_TO_END_TRANSITION_INSTANT_OFFSET = 1;

export const DEFAULT_SNAP_SCROLLTO_BOTTOM = false;

export const TRACK_BY_PROPERTY_NAME = 'id';

export const DEFAULT_DIRECTION = Directions.VERTICAL;

export const DEFAULT_COLLECTION_MODE = CollectionModes.NORMAL;

export const DISPLAY_OBJECTS_LENGTH_MESUREMENT_ERROR = 1;

export const MAX_SCROLL_TO_ITERATIONS = 5;

export const DEFAULT_SNAPPING_METHOD = SnappingMethods.NORMAL;

export const DEFAULT_SELECT_METHOD = MethodsForSelecting.NONE;

export const DEFAULT_SCREEN_READER_MESSAGE = 'Showing items $1 to $2';

export const DEFAULT_LANG_TEXT_DIR = TextDirections.LTR;

const X_LITE_BLUE_PLASMA_GRADIENT: GradientColor = ["rgba(133, 142, 255, 0)", "rgb(126, 219, 255)"];;

export const DEFAULT_SCROLLBAR_THEME: ScrollBarTheme = {
    fill: ["rgba(198, 172, 248, 1)", "rgba(168, 229, 250, 1)"],
    hoverFill: ["rgba(165, 136, 220, 1)", "rgba(132, 195, 217, 1)"],
    pressedFill: ["rgba(132, 104, 185, 1)", "rgba(107, 171, 193, 1)"],
    strokeGradientColor: X_LITE_BLUE_PLASMA_GRADIENT,
    strokeAnimationDuration: 1000,
    thickness: 12,
    roundCorner: [3, 3, 3, 3],
    rippleColor: 'rgba(0,0,0,0.5)',
    rippleEnabled: true,
}

export const DEFAULT_SCROLLBAR_MIN_SIZE: number = 80;

// presets

export const BEHAVIOR_AUTO: ScrollBehavior = 'auto';

export const BEHAVIOR_INSTANT: ScrollBehavior = 'instant';

export const BEHAVIOR_SMOOTH: ScrollBehavior = 'smooth';

export const DISPLAY_BLOCK = 'block';

export const DISPLAY_NONE = 'none';

export const OPACITY_0 = '0';

export const OPACITY_100 = '100';

export const VISIBILITY_VISIBLE = 'visible';

export const VISIBILITY_HIDDEN = 'hidden';

export const SIZE_100_PERSENT = '100%';

export const SIZE_AUTO = 'auto';

export const POSITION_ABSOLUTE = 'absolute';

export const TRANSLATE_3D = 'translate3d';

export const ZEROS_TRANSLATE_3D = `${TRANSLATE_3D}(0,0,0)`;

export const HIDDEN_ZINDEX = '-1';

export const DEFAULT_ZINDEX = '0';

export const TOP_PROP_NAME = 'top';

export const LEFT_PROP_NAME = 'left';

export const X_PROP_NAME = 'x';

export const Y_PROP_NAME = 'y';

export const WIDTH_PROP_NAME = 'width';

export const HEIGHT_PROP_NAME = 'height';

export const MARGIN_TOP = 'marginTop';

export const MARGIN_LEFT = 'marginLeft';

export const PX = 'px';

export const INTERACTIVE = 'interactive';

export const FOCUS = 'focus';

export const WHEEL = 'wheel';

export const SCROLLER_WHEEL = 'wheel';

export const TOUCH_MOVE = 'touchmove';

export const TOUCH_START = 'touchstart';

export const TOUCH_END = 'touchend';

export const TOUCH_LEAVE = 'touchleave';

export const TOUCH_OUT = 'touchout';

export const MOUSE_MOVE = 'mousemove';

export const MOUSE_UP = 'mouseup';

export const MOUSE_DOWN = 'mousedown';

export const MOUSE_LEAVE = 'mouseleave';

export const MOUSE_OUT = 'mouseout';

export const POINTER_MOVE = 'pointermove';

export const POINTER_UP = 'pointerup';

export const POINTER_DOWN = 'pointerdown';

export const POINTER_LEAVE = 'pointerleave';

export const POINTER_OUT = 'pointerout';

export const CLICK = 'click';

export const KEY_DOWN = 'keydown';

export const SCROLL = 'scroll';

export const SCROLLER_SCROLL = 'scroll';

export const SCROLLER_SCROLLBAR_SCROLL = 'scrollbar-scroll';

export const SCROLL_END = 'scrollend';

export const CLASS_LIST_VERTICAL = 'vertical';

export const CLASS_LIST_HORIZONTAL = 'horizontal';

// styles

export const PART_DEFAULT_ITEM = 'item';

export const PART_ITEM_NEW = ' item-new';

export const PART_ITEM_ODD = ' item-odd';

export const PART_ITEM_EVEN = ' item-even';

export const PART_ITEM_SNAPPED = ' item-snapped';

export const PART_ITEM_SELECTED = ' item-selected';

export const PART_ITEM_COLLAPSED = ' item-collapsed';

export const PART_ITEM_FOCUSED = ' item-focused';

