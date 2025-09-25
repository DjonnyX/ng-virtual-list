import { CollectionModes, MethodsForSelecting, SnappingMethods } from "../enums";
import { Directions } from "../enums/directions";

export const DEFAULT_ITEM_SIZE = 24;

export const DEFAULT_BUFFER_SIZE = 2;

export const DEFAULT_MAX_BUFFER_SIZE = 10;

export const DEFAULT_LIST_SIZE = 400;

export const DEFAULT_SNAP = false;

export const DEFAULT_SELECT_BY_CLICK = true;

export const DEFAULT_COLLAPSE_BY_CLICK = true;

export const DEFAULT_ENABLED_BUFFER_OPTIMIZATION = false;

export const DEFAULT_DYNAMIC_SIZE = false;

export const TRACK_BY_PROPERTY_NAME = 'id';

export const DEFAULT_DIRECTION = Directions.VERTICAL;

export const DEFAULT_COLLECTION_MODE = CollectionModes.NORMAL;

export const DISPLAY_OBJECTS_LENGTH_MESUREMENT_ERROR = 1;

export const MAX_SCROLL_TO_ITERATIONS = 5;

export const DEFAULT_SNAPPING_METHOD = SnappingMethods.NORMAL;

export const DEFAULT_SELECT_METHOD = MethodsForSelecting.NONE;

export const DEFAULT_SCREEN_READER_MESSAGE = 'Showing items $1 to $2';

// presets

export const BEHAVIOR_AUTO = 'auto';

export const BEHAVIOR_INSTANT = 'instant';

export const BEHAVIOR_SMOOTH = 'smooth';

export const DISPLAY_BLOCK = 'block';

export const DISPLAY_NONE = 'none';

export const OPACITY_0 = '0';

export const OPACITY_100 = '100';

export const VISIBILITY_VISIBLE = 'visible';

export const VISIBILITY_HIDDEN = 'hidden';

export const SIZE_100_PERSENT = '100%';

export const SIZE_AUTO = 'auto';

export const POSITION_ABSOLUTE = 'absolute';

export const POSITION_STICKY = 'sticky';

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

export const PX = 'px';

export const SCROLL = 'scroll';

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

