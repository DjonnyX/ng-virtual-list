import { CollectionModes, MethodsForSelecting, SnappingMethods, SnapToItemAlign, SnapToItemAligns, TextDirections } from "../enums";
import { Directions } from "../enums/directions";
import { IAnimationParams, IScrollingSettings } from '../interfaces';

export const MAX_REGULAR_SNAPED_COMPONENTS = 2;

export const DEFAULT_ITEM_SIZE = 24;

export const DEFAULT_BUFFER_SIZE = 2;

export const DEFAULT_MAX_BUFFER_SIZE = 10;

export const DEFAULT_LIST_SIZE = 400;

export const DEFAULT_CLICK_DISTANCE = 40;

export const DEFAULT_WAIT_FOR_PREPARATION = true;

export const DEFAULT_SCROLLBAR_ENABLED = true;

export const DEFAULT_SCROLLBAR_INTERACTIVE = true;

export const DEFAULT_SCROLL_BEHAVIOR: ScrollBehavior = 'smooth';

export const NAVIGATION_BY_KEYBOARD_TIMER = 50;

export const DEFAULT_SNAP_TO_ITEM = false;

export const DEFAULT_MOTION_BLUR = 0.25;

export const DEFAULT_MAX_MOTION_BLUR = 20;

export const DEFAULT_SNAP_TO_ITEM_ALIGN: SnapToItemAlign = SnapToItemAligns.START;

export const DEFAULT_ANIMATION_PARAMS: IAnimationParams = {
    scrollToItem: 50,
    snapToItem: 150,
    navigateToItem: 150,
    navigateByKeyboard: NAVIGATION_BY_KEYBOARD_TIMER,
};

export const DEFAULT_SCROLLING_SETTINGS: IScrollingSettings = {
    frictionalForce: 0.035,
    mass: 0.005,
    maxDistance: 100000,
    maxDuration: 4000,
    speedScale: 10,
    optimization: true,
};

export const DEFAULT_OVERSCROLL_ENABLED = true;

export const DEFAULT_SNAP = false;

export const DEFAULT_SELECT_BY_CLICK = true;

export const DEFAULT_COLLAPSE_BY_CLICK = true;

export const DEFAULT_ENABLED_BUFFER_OPTIMIZATION = false;

export const DEFAULT_DYNAMIC_SIZE = true;

export const DEFAULT_SNAP_TO_END_TRANSITION_INSTANT_OFFSET = 1;

export const DEFAULT_SNAP_SCROLLTO_START = true;

export const DEFAULT_SNAP_SCROLLTO_END = true;

export const TRACK_BY_PROPERTY_NAME = 'id';

export const DEFAULT_DIRECTION = Directions.VERTICAL;

export const DEFAULT_COLLECTION_MODE = CollectionModes.NORMAL;

export const DISPLAY_OBJECTS_LENGTH_MESUREMENT_ERROR = 1;

export const MAX_SCROLL_TO_ITERATIONS = 5;

export const DEFAULT_SNAPPING_METHOD = SnappingMethods.STANDART;

export const DEFAULT_SELECT_METHOD = MethodsForSelecting.NONE;

export const DEFAULT_SCREEN_READER_MESSAGE = 'Showing items $1 to $2';

export const DEFAULT_LANG_TEXT_DIR = TextDirections.LTR;

export const DEFAULT_SCROLLBAR_THICKNESS: number = 6;

export const DEFAULT_SCROLLBAR_MIN_SIZE: number = 80;

// presets

export const BEHAVIOR_AUTO: ScrollBehavior = 'auto';

export const BEHAVIOR_INSTANT: ScrollBehavior = 'instant';

export const BEHAVIOR_SMOOTH: ScrollBehavior = 'smooth';

export const DISABLED = 'disabled';

export const VIEWPORT = 'viewport';

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

export const KEY_TAB = 'Tab';

export const SCROLL = 'scroll';

export const SCROLLER_SCROLL = 'scroll';

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

export const MIN_PIXELS_FOR_PREVENT_SNAPPING = 10;

export const MAX_VELOCITY_FOR_SCROLL_QUALITY_OPTIMIZATION_LVL1 = 74;

export const MAX_VELOCITY_FOR_SCROLL_QUALITY_OPTIMIZATION_LVL2 = 500;

export const MAX_NUMBERS_OF_SKIPS_FOR_QUALITY_OPTIMIZATION_LVL1 = 4;

export const RANGE_DISPLAY_ITEMS_END_OFFSET = 20;

export const PREPARE_ITERATIONS = 1;

export const PREPARATION_REUPDATE_LENGTH = 0;

export const PREPARE_ITERATIONS_FOR_UPDATE_ITEMS = 1;

export const PREPARATION_REUPDATE_LENGTH_FOR_UPDATE_ITEMS = 0;

export const PREPARE_ITERATIONS_FOR_COLLAPSE_ITEMS = 1;

export const PREPARATION_REUPDATE_LENGTH_FOR_COLLAPSE_ITEMS = 0;

export const EMPTY_SCROLL_STATE_VERSION = '-1';

export const ROLE_LIST = 'list';

export const ROLE_LIST_BOX = 'listbox';

export const ITEM_ID = 'item-id';

export const ITEM_CONTAINER = 'ngvl-item__container';
