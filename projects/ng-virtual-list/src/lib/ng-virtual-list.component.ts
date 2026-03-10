import {
  ChangeDetectionStrategy, Component, ComponentRef, computed, DestroyRef, effect, ElementRef, inject, input,
  OnDestroy, output, Signal, signal, TemplateRef, ViewChild, viewChild, ViewContainerRef, ViewEncapsulation,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { takeUntilDestroyed, toObservable } from '@angular/core/rxjs-interop';
import {
  BehaviorSubject, combineLatest, debounceTime, delay, distinctUntilChanged, filter, fromEvent, map,
  of, race, Subject, switchMap, take, takeUntil, tap,
} from 'rxjs';
import { NgVirtualListItemComponent } from './components/list-item/ng-virtual-list-item.component';
import {
  BEHAVIOR_INSTANT, CLASS_LIST_HORIZONTAL, CLASS_LIST_VERTICAL, DEFAULT_DIRECTION, DEFAULT_DYNAMIC_SIZE,
  DEFAULT_ENABLED_BUFFER_OPTIMIZATION, DEFAULT_ITEM_SIZE, DEFAULT_BUFFER_SIZE, DEFAULT_LIST_SIZE, DEFAULT_SNAP, DEFAULT_SNAPPING_METHOD,
  HEIGHT_PROP_NAME, LEFT_PROP_NAME, MAX_SCROLL_TO_ITERATIONS, PX, FOCUS, TOP_PROP_NAME, TRACK_BY_PROPERTY_NAME, WIDTH_PROP_NAME,
  DEFAULT_MAX_BUFFER_SIZE, DEFAULT_SELECT_METHOD, DEFAULT_SELECT_BY_CLICK, DEFAULT_COLLAPSE_BY_CLICK, DEFAULT_COLLECTION_MODE,
  DEFAULT_SCREEN_READER_MESSAGE, BEHAVIOR_SMOOTH, DEFAULT_SNAP_TO_END_TRANSITION_INSTANT_OFFSET, DEFAULT_SNAP_SCROLLTO_BOTTOM,
  MOUSE_DOWN, MOUSE_UP, MOUSE_LEAVE, MOUSE_OUT, TOUCH_END, TOUCH_LEAVE, TOUCH_OUT, TOUCH_START, SCROLLER_WHEEL, SCROLLER_SCROLLBAR_SCROLL,
  DEFAULT_LANG_TEXT_DIR, DEFAULT_SCROLLBAR_THEME, DEFAULT_CLICK_DISTANCE, DEFAULT_WAIT_FOR_PREPARATION, DEFAULT_SCROLLBAR_MIN_SIZE,
  KEY_DOWN, BEHAVIOR_AUTO, DEFAULT_SCROLLBAR_ENABLED, DEFAULT_SCROLLBAR_INTERACTIVE, DEFAULT_OVERSCROLL_ENABLED, DEFAULT_ANIMATION_PARAMS,
  DEFAULT_SCROLL_BEHAVIOR,
} from './const';
import {
  IRenderVirtualListItem, IScrollEvent, IScrollOptions, IVirtualListCollection, IVirtualListItem, IVirtualListItemConfigMap,
} from './models';
import { FocusAlignment, IAnimationParams, Id, IRect, ISize, ScrollBarTheme } from './types';
import { IRenderVirtualListCollection } from './models/render-collection.model';
import {
  CollectionMode, CollectionModes, Direction, Directions, FocusAlignments, MethodForSelecting, MethodsForSelecting, SnappingMethod,
  SnappingMethods, TextDirection, TextDirections,
} from './enums';
import { ScrollEvent, toggleClassName } from './utils';
import { IGetItemPositionOptions, IUpdateCollectionOptions, TrackBoxEvents, TrackBox } from './utils/track-box';
import { isSnappingMethodAdvenced } from './utils/snapping-method';
import { BaseVirtualListItemComponent } from './models/base-virtual-list-item-component';
import { Component$1 } from './models/component.model';
import { isDirection } from './utils/is-direction';
import { NgVirtualListService } from './ng-virtual-list.service';
import { isMethodForSelecting } from './utils/is-method-for-selecting';
import { MethodsForSelectingTypes } from './enums/method-for-selecting-types';
import { CMap } from './utils/cmap';
import { validateArray, validateBoolean, validateFloat, validateInt, validateObject, validateString } from './utils/validation';
import { copyValueAsReadonly, objectAsReadonly } from './utils/object';
import { isCollectionMode } from './utils/is-collection-mode';
import { NgScrollerComponent } from './components/scroller/ng-scroller.component';
import { IScrollToParams } from './components/ng-scroll-view';

interface IScrollParams {
  id: Id;
  behavior?: ScrollBehavior;
  blending?: boolean;
  iteration?: number;
  isLastIteration?: boolean;
  scrollCalled?: boolean;
  scroller?: HTMLElement;
  cb?: () => void;
}

const MIN_SCROLL_TO_START_PIXELS = 10,
  RANGE_DISPLAY_ITEMS_END_OFFSET = 20,
  MAX_INIT_ITERATIONS = 10,
  ROLE_LIST = 'list',
  ROLE_LIST_BOX = 'listbox',
  ITEM_ID = 'item-id',
  ITEM_CONTAINER = 'ngvl-item__container',
  READY_TO_START = 'ready-to-start',
  WAIT_FOR_PREPARATION = 'wait-for-preparation';

const validateScrollIteration = (value: number) => {
  return Number.isNaN(value) || (value < 0) ? 0 : value > MAX_SCROLL_TO_ITERATIONS ? MAX_SCROLL_TO_ITERATIONS : value
},
  validateId = (id: Id) => {
    const valid = validateString(id as string) || validateFloat(id as number);
    if (!valid) {
      throw Error('The "id" parameter must be of type `Id`.');
    }
  },
  validateScrollBehavior = (behavior: ScrollBehavior) => {
    const valid = validateString(behavior as string) && (behavior === 'auto' || behavior === 'instant' || behavior === 'smooth');
    if (!valid) {
      throw Error('The "behavior" parameter must have the value `auto`, `instant` or `smooth`.');
    }
  },
  validateIteration = (iteration: number | undefined) => {
    const valid = validateInt(iteration, true);
    if (!valid) {
      throw Error('The "iteration" parameter must be of type `number`.');
    }
  },
  validateFocusAlignment = (align: FocusAlignment) => {
    const valid = validateString(align as string) && (align === 'none' || align === 'start' || align === 'center' || align === 'end');
    if (!valid) {
      throw Error('The "align" parameter must have the value `none`, `start`, `center` or `end`.');
    }
  };

const formatScreenReaderMessage = (items: IRenderVirtualListCollection, messagePattern: string | undefined, scrollSize: number,
  isVertical: boolean, bounds: ISize) => {
  if (!messagePattern) {
    return '';
  }
  const list = items ?? [], size = isVertical ? bounds.height : bounds.width;
  let start = Number.NaN, end = Number.NaN, prevItem: IRenderVirtualListItem | undefined;
  for (let i = 0, l = list.length; i < l; i++) {
    const item = list[i], position = isVertical ? item.measures.y : item.measures.x,
      itemSize = isVertical ? item.measures.height : item.measures.width;
    if (((position + itemSize) >= scrollSize) && Number.isNaN(start)) {
      start = item.index + 1;
    }
    if ((position >= (scrollSize + size)) && Number.isNaN(end) && prevItem) {
      end = prevItem.index + 1;
    }
    prevItem = item;
  }
  if (Number.isNaN(start) || Number.isNaN(end)) {
    return '';
  }
  let formatted = messagePattern ?? '';
  formatted = formatted.replace('$1', `${start}`);
  formatted = formatted.replace('$2', `${end}`);
  return formatted;
};

const formatActualDisplayItems = (items: IRenderVirtualListCollection, startOffset: number, endOffset: number, scrollSize: number,
  isVertical: boolean, bounds: ISize): [number, number] | undefined => {
  const list = items ?? [], size = isVertical ? bounds.height : bounds.width;
  let start = Number.NaN, end = Number.NaN;
  for (let i = 0, l = list.length; i < l; i++) {
    const item = list[i], position = isVertical ? item.measures.y : item.measures.x,
      itemSize = isVertical ? item.measures.height : item.measures.width;
    if ((position + itemSize <= scrollSize + startOffset)) {
      start = item.index;
    }
    if (((position) <= (scrollSize + size - endOffset + RANGE_DISPLAY_ITEMS_END_OFFSET))) {
      end = item.index;
    }
  }
  if (Number.isNaN(start) || Number.isNaN(end)) {
    return undefined;
  }
  return [start, end];
};

/**
 * Virtual list component.
 * Maximum performance for extremely large lists.
 * It is based on algorithms for virtualization of screen objects.
 * @link https://github.com/DjonnyX/ng-virtual-list/blob/20.x/projects/ng-virtual-list/src/lib/ng-virtual-list.component.ts
 * @author Evgenii Alexandrovich Grebennikov
 * @email djonnyx@gmail.com
 */
@Component({
  selector: 'ng-virtual-list',
  imports: [CommonModule, NgScrollerComponent],
  templateUrl: './ng-virtual-list.component.html',
  styleUrl: './ng-virtual-list.component.scss',
  host: {
    'style': 'position: relative;'
  },
  changeDetection: ChangeDetectionStrategy.OnPush,
  encapsulation: ViewEncapsulation.ShadowDom,
  providers: [NgVirtualListService],
})
export class NgVirtualListComponent implements OnDestroy {
  private static __nextId: number = 0;

  private _id: number = NgVirtualListComponent.__nextId;
  /**
   * Readonly. Returns the unique identifier of the component.
   */
  get id() { return this._id; }

  private _service = inject(NgVirtualListService);

  @ViewChild('renderersContainer', { read: ViewContainerRef })
  private _listContainerRef: ViewContainerRef | undefined;

  @ViewChild('snapRendererContainer', { read: ViewContainerRef })
  private _snapContainerRef: ViewContainerRef | undefined;

  private _scrollerComponent = viewChild<NgScrollerComponent>('scroller');

  private _scroller: Signal<ElementRef<HTMLDivElement> | undefined>;

  private _list: Signal<ElementRef<HTMLDivElement> | undefined>;

  /**
   * Fires when the list has been scrolled.
   */
  onScroll = output<IScrollEvent>();

  /**
   * Fires when the list has completed scrolling.
   */
  onScrollEnd = output<IScrollEvent>();

  /**
   * Fires when the viewport size is changed.
   */
  onViewportChange = output<ISize>();

  /**
   * Fires when an element is clicked.
   */
  onItemClick = output<IRenderVirtualListItem<any> | undefined>();

  /**
   * Fires when elements are selected.
   */
  onSelect = output<Array<Id> | Id | undefined>();

  /**
   * Fires when elements are collapsed.
   */
  onCollapse = output<Array<Id> | Id | undefined>();

  /**
   * Fires when the scroll reaches the start.
   */
  onScrollReachStart = output<void>();

  /**
   * Fires when the scroll reaches the end.
   */
  onScrollReachEnd = output<void>();

  private _$show = new BehaviorSubject<boolean>(false);
  readonly $show = this._$show.asObservable();

  private _scrollbarTheme = {
    transform: (v: ScrollBarTheme) => {
      const valid = validateObject(v);

      if (!valid) {
        console.error('The "scrollbarTheme" parameter must be of type `object`.');
        return DEFAULT_SCROLLBAR_THEME;
      }
      return v;
    },
  } as any;

  /**
   * Scrollbar theme.
   */
  scrollbarTheme = input<ScrollBarTheme>(DEFAULT_SCROLLBAR_THEME, { ...this._scrollbarTheme });

  private _scrollbarMinSize = {
    transform: (v: number) => {
      const valid = validateInt(v);

      if (!valid) {
        console.error('The "scrollbarMinSize" parameter must be of type `number`.');
        return DEFAULT_SCROLLBAR_MIN_SIZE;
      }
      return v;
    },
  } as any;

  /**
   * Minimum scrollbar size.
   */
  scrollbarMinSize = input<number>(DEFAULT_SCROLLBAR_MIN_SIZE, { ...this._scrollbarMinSize });

  private _loading = {
    transform: (v: boolean) => {
      const valid = validateBoolean(v);

      if (!valid) {
        console.error('The "loading" parameter must be of type `boolean`.');
        return false;
      }
      return v;
    },
  } as any;

  /**
   * If `true`, the scrollBar goes into loading state. The default value is `false`.
   */
  loading = input<boolean>(false, { ...this._loading });

  private _waitForPreparation = {
    transform: (v: boolean) => {
      const valid = validateBoolean(v);

      if (!valid) {
        console.error('The "waitForPreparation" parameter must be of type `boolean`.');
        return DEFAULT_WAIT_FOR_PREPARATION;
      }
      return v;
    },
  } as any;

  /**
   * If true, it will wait until the list items are fully prepared before displaying them.. The default value is `true`.
   */
  waitForPreparation = input<boolean>(DEFAULT_WAIT_FOR_PREPARATION, { ...this._waitForPreparation });

  private _clickDistance = {
    transform: (v: number) => {
      const valid = validateInt(v);

      if (!valid) {
        console.error('The "clickDistance" parameter must be of type `number`.');
        return DEFAULT_CLICK_DISTANCE;
      }
      return v;
    },
  } as any;

  /**
   * The maximum scroll distance at which a click event is triggered.
   */
  clickDistance = input<number>(DEFAULT_CLICK_DISTANCE, { ...this._clickDistance });

  private _itemsOptions = {
    transform: (v: IVirtualListCollection | undefined) => {
      let valid = validateArray(v, true);
      if (valid) {
        if (v) {
          const trackBy = this.trackBy();
          for (let i = 0, l = v.length; i < l; i++) {
            const item = v[i];
            valid = validateObject(item, true);
            if (valid) {
              if (item && !(validateFloat(item?.[trackBy] as number, true) || validateString(item?.[trackBy] as string, true))) {
                valid = false;
                break;
              }
            }
          }
        }
      }

      if (!valid) {
        console.error('The "items" parameter must be of type `IVirtualListCollection` or `undefined`.');
        return [];
      }
      return v;
    },
  } as any;

  /**
   * Collection of list items.
   */
  items = input.required<IVirtualListCollection>({
    ...this._itemsOptions,
  });

  private _selectedIdsOptions = {
    transform: (v: Array<Id> | Id | undefined) => {
      let valid = validateArray(v as any, true) || validateString(v as any, true) || validateFloat(v as any, true);
      if (valid) {
        if (v && Array.isArray(v)) {
          for (let i = 0, l = v.length; i < l; i++) {
            const item = v[i];
            valid = validateString(item as any) || validateFloat(item as any);
            if (!valid) {
              break;
            }
          }
        }
      }

      if (!valid) {
        console.error('The "selectedIds" parameter must be of type `Array<Id> | Id` or `undefined`.');
        return this._isMultiSelecting ? [] : undefined;
      }
      return v;
    },
  } as any;

  defaultItemValue = input<IVirtualListItem | null>(null);

  /**
   * Sets the selected items.
   */
  selectedIds = input<Array<Id> | Id | undefined>(undefined, { ...this._selectedIdsOptions });

  private _collapsedIdsOptions = {
    transform: (v: Array<Id>) => {
      let valid = validateArray(v as any, true);
      if (valid) {
        if (v && Array.isArray(v)) {
          for (let i = 0, l = v.length; i < l; i++) {
            const item = v[i];
            valid = validateString(item as any) || validateFloat(item as any);
            if (!valid) {
              break;
            }
          }
        }
      }

      if (!valid) {
        console.error('The "collapsedIds" parameter must be of type `Array<Id>.');
        return [];
      }
      return v;
    },
  } as any;

  /**
   * Sets the collapsed items.
   */
  collapsedIds = input<Array<Id>>([], { ...this._collapsedIdsOptions });

  private _selectByClickOptions = {
    transform: (v: boolean) => {
      const valid = validateBoolean(v);

      if (!valid) {
        console.error('The "selectByClick" parameter must be of type `boolean`.');
        return DEFAULT_SELECT_BY_CLICK;
      }
      return v;
    },
  } as any;

  /**
   * If `false`, the element is selected using the config.select method passed to the template; 
   * if `true`, the element is selected by clicking on it. The default value is `true`.
   */
  selectByClick = input<boolean>(DEFAULT_SELECT_BY_CLICK, { ...this._selectByClickOptions });

  private _collapseByClickOptions = {
    transform: (v: boolean) => {
      const valid = validateBoolean(v);

      if (!valid) {
        console.error('The "collapseByClick" parameter must be of type `boolean`.');
        return DEFAULT_COLLAPSE_BY_CLICK;
      }
      return v;
    },
  } as any;

  /**
   * If `false`, the element is collapsed using the config.collapse method passed to the template; 
   * if `true`, the element is collapsed by clicking on it. The default value is `true`.
   */
  collapseByClick = input<boolean>(DEFAULT_COLLAPSE_BY_CLICK, { ...this._collapseByClickOptions });

  private _snapOptions = {
    transform: (v: boolean) => {
      const valid = validateBoolean(v);

      if (!valid) {
        console.error('The "snap" parameter must be of type `boolean`.');
        return DEFAULT_SNAP;
      }
      return v;
    },
  } as any;

  /**
   * Determines whether elements will snap. Default value is "true".
   */
  snap = input<boolean>(DEFAULT_SNAP, { ...this._snapOptions });

  private _snapToEndTransitionInstantOffsetOptions = {
    transform: (v: number) => {
      const valid = validateFloat(v, true);

      if (!valid) {
        console.error('The "snapToEndTransitionInstantOffset" parameter must be of type `number`.');
        return DEFAULT_SNAP_TO_END_TRANSITION_INSTANT_OFFSET;
      }
      return v;
    },
  } as any;

  /**
   * Sets the offset value; if the scroll area value is exceeded, the scroll animation will be disabled. Default value is "0".
   */
  snapToEndTransitionInstantOffset = input<number>(DEFAULT_SNAP_TO_END_TRANSITION_INSTANT_OFFSET, { ...this._snapToEndTransitionInstantOffsetOptions });

  private _scrollStartOffsetOptions = {
    transform: (v: number) => {
      const valid = validateFloat(v, true);

      if (!valid) {
        console.error('The "scrollStartOffset" parameter must be of type `number`.');
        return 0;
      }
      return v;
    },
  } as any;

  /**
   * Sets the scroll start offset value; Default value is "0".
   */
  scrollStartOffset = input<number>(0, { ...this._scrollStartOffsetOptions });

  private _scrollEndOffsetOptions = {
    transform: (v: number) => {
      const valid = validateFloat(v, true);

      if (!valid) {
        console.error('The "scrollEndOffset" parameter must be of type `number`.');
        return 0;
      }
      return v;
    },
  } as any;

  /**
   * Sets the scroll end offset value; Default value is "0".
   */
  scrollEndOffset = input<number>(0, { ...this._scrollEndOffsetOptions });

  private _snapScrollToBottomOptions = {
    transform: (v: boolean) => {
      const valid = validateBoolean(v, true);

      if (!valid) {
        console.error('The "snapScrollToBottom" parameter must be of type `boolean`.');
        return DEFAULT_SNAP_SCROLLTO_BOTTOM;
      }
      return v;
    },
  } as any;

  /**
   * Determines whether the scroll will be anchored to the end of the list at startup.. Default value is "false".
   */
  snapScrollToBottom = input<boolean>(DEFAULT_SNAP_SCROLLTO_BOTTOM, { ...this._snapScrollToBottomOptions });

  private _scrollbarEnabledOptions = {
    transform: (v: boolean) => {
      const valid = validateBoolean(v, true);

      if (!valid) {
        console.error('The "scrollbarEnabled" parameter must be of type `boolean`.');
        return DEFAULT_SCROLLBAR_ENABLED;
      }
      return v;
    },
  } as any;

  /**
   * Determines whether the scrollbar is shown or not. The default value is "true".
   */
  scrollbarEnabled = input<boolean>(DEFAULT_SCROLLBAR_ENABLED, { ...this._scrollbarEnabledOptions });

  private _scrollbarInteractiveOptions = {
    transform: (v: boolean) => {
      const valid = validateBoolean(v, true);

      if (!valid) {
        console.error('The "scrollbarInteractive" parameter must be of type `boolean`.');
        return DEFAULT_SCROLLBAR_INTERACTIVE;
      }
      return v;
    },
  } as any;

  /**
   * Determines whether scrolling using the scrollbar will be possible. The default value is "true".
   */
  scrollbarInteractive = input<boolean>(DEFAULT_SCROLLBAR_INTERACTIVE, { ...this._scrollbarInteractiveOptions });

  private _scrollBehaviorOptions = {
    transform: (v: ScrollBehavior) => {
      const valid = validateString(v, true);

      if (!valid) {
        console.error('The "scrollBehavior" parameter must be of type `boolean`.');
        return DEFAULT_SCROLL_BEHAVIOR;
      }
      return v;
    },
  } as any;

  /**
   * Defines the scrolling behavior for any element on the page. The default value is "smooth".
   */
  scrollBehavior = input<ScrollBehavior>(DEFAULT_SCROLL_BEHAVIOR, { ...this._scrollBehaviorOptions });

  private _animationParamsOptions = {
    transform: (v: IAnimationParams) => {
      const valid = validateObject(v, true);

      if (!valid) {
        console.error('The "animationParams" parameter must be of type `object`.');
        return DEFAULT_ANIMATION_PARAMS;
      }
      return v;
    },
  } as any;

  /**
   * Animation parameters. The default value is "{ scrollToItem: 50, navigateToItem: 150 }".
   */
  animationParams = input<IAnimationParams>(DEFAULT_ANIMATION_PARAMS, { ...this._animationParamsOptions });

  private _overscrollEnabledOptions = {
    transform: (v: boolean) => {
      const valid = validateBoolean(v, true);

      if (!valid) {
        console.error('The "overscrollEnabled" parameter must be of type `boolean`.');
        return DEFAULT_OVERSCROLL_ENABLED;
      }
      return v;
    },
  } as any;

  /**
   * Determines whether the overscroll (re-scroll) feature will work. The default value is "true".
   */
  overscrollEnabled = input<boolean>(DEFAULT_OVERSCROLL_ENABLED, { ...this._overscrollEnabledOptions });

  private _enabledBufferOptimizationOptions = {
    transform: (v: boolean) => {
      const valid = validateBoolean(v);

      if (!valid) {
        console.error('The "enabledBufferOptimization" parameter must be of type `boolean`.');
        return DEFAULT_ENABLED_BUFFER_OPTIMIZATION;
      }
      return v;
    },
  } as any;

  /**
   * Experimental!
   * Enables buffer optimization.
   * Can only be used if items in the collection are not added or updated. Otherwise, artifacts in the form of twitching of the scroll area are possible.
   * Works only if the property dynamic = true
   */
  enabledBufferOptimization = input<boolean>(DEFAULT_ENABLED_BUFFER_OPTIMIZATION, { ...this._enabledBufferOptimizationOptions });

  private _itemRendererOptions = {
    transform: (v: TemplateRef<any>) => {
      let valid = validateObject(v);
      if (v && !(typeof v.elementRef === 'object' && typeof v.createEmbeddedView === 'function')) {
        valid = false;
      }

      if (!valid) {
        throw Error('The "itemRenderer" parameter must be of type `TemplateRef`.');
      }
      return v;
    },
  } as any;

  /**
   * Rendering element template.
   */
  itemRenderer = input.required<TemplateRef<any>>({ ...this._itemRendererOptions });

  private _itemRenderer = signal<TemplateRef<any> | undefined>(undefined);

  private _itemConfigMapOptions = {
    transform: (v: IVirtualListItemConfigMap) => {
      let valid = validateObject(v);
      if (valid) {
        if (v) {
          for (let id in v) {
            const item = v[id];
            if (!item ||
              !validateBoolean(item.collapsable, true) ||
              !validateBoolean(item.selectable, true) ||
              !(item.sticky === undefined || item.sticky === 0 || item.sticky === 1 || item.sticky === 2)
            ) {
              valid = false;
              break;
            }
          }
        }
      }
      if (!valid) {
        console.error('The "itemConfigMap" parameter must be of type `IVirtualListItemConfigMap`.');
        return {};
      }
      return v;
    },
  } as any;

  /**
   * Sets `sticky` position, `collapsable` and `selectable` for the list item element. If `sticky` position is greater than `0`, then `sticky` position is applied. 
   * If the `sticky` value is greater than `0`, then the `sticky` position mode is enabled for the element. `1` - position start, `2` - position end.
   *  Default value is `0`.
   * `selectable` determines whether an element can be selected or not. Default value is `true`.
   * `collapsable` determines whether an element with a `sticky` property greater than zero can collapse and
   *  collapse elements in front that do not have a `sticky` property.
   * @link https://github.com/DjonnyX/ng-virtual-list/blob/20.x/projects/ng-virtual-list/src/lib/models/item-config-map.model.ts
   * @author Evgenii Alexandrovich Grebennikov
   * @email djonnyx@gmail.com
   */
  itemConfigMap = input<IVirtualListItemConfigMap>({}, { ...this._itemConfigMapOptions });

  private _itemSizeOptions = {
    transform: (v: number) => {
      const valid = validateFloat(v);
      if (!valid) {
        console.error('The "itemSize" parameter must be of type `number` or `undefined`.');
        return DEFAULT_ITEM_SIZE;
      }
      return v;
    },
  } as any;

  /**
   * If direction = 'vertical', then the height of a typical element. If direction = 'horizontal', then the width of a typical element.
   * Ignored if the dynamicSize property is true.
   */
  itemSize = input<number>(DEFAULT_ITEM_SIZE, { ...this._itemSizeOptions });

  private _dynamicSizeOptions = {
    transform: (v: boolean) => {
      const valid = validateBoolean(v);
      if (!valid) {
        console.error('The "dynamicSize" parameter must be of type `boolean`.');
        return DEFAULT_DYNAMIC_SIZE;
      }
      return v;
    },
  } as any;

  /**
   * If true then the items in the list can have different sizes and the itemSize property is ignored.
   * If false then the items in the list have a fixed size specified by the itemSize property. The default value is false.
   */
  dynamicSize = input(DEFAULT_DYNAMIC_SIZE, { ...this._dynamicSizeOptions });

  private _directionOptions = {
    transform: (v: Direction) => {
      const valid = validateString(v) && (v === 'horizontal' || v === 'vertical');
      if (!valid) {
        console.error('The "direction" parameter must have the value `horizontal` or `vertical`.');
        return DEFAULT_DIRECTION;
      }
      return v;
    },
  } as any;

  /**
   * Determines the direction in which elements are placed. Default value is "vertical".
   */
  direction = input<Direction>(DEFAULT_DIRECTION, { ...this._directionOptions });

  private _collectionModeOptions = {
    transform: (v: CollectionMode) => {
      const valid = validateString(v) && (v === 'normal' || v === 'lazy');
      if (!valid) {
        console.error('The "direction" parameter must have the value `normal` or `lazy`.');
        return DEFAULT_COLLECTION_MODE;
      }
      return v;
    },
  } as any;

  /**
   * Determines the action modes for collection elements. Default value is "normal".
   */
  collectionMode = input<CollectionMode>(DEFAULT_COLLECTION_MODE, { ...this._collectionModeOptions });

  private _bufferSizeOptions = {
    transform: (v: number) => {
      const valid = validateInt(v);
      if (!valid) {
        console.error('The "bufferSize" parameter must be of type `number`.');
        return DEFAULT_BUFFER_SIZE;
      }
      return v;
    },
  } as any;

  /**
   * Number of elements outside the scope of visibility. Default value is 2.
   */
  bufferSize = input<number>(DEFAULT_BUFFER_SIZE, { ...this._bufferSizeOptions });

  private _maxBufferSizeTransform = {
    transform: (v: number | undefined) => {
      let val = v;
      const valid = validateInt(v, true);
      if (!valid) {
        console.error('The "maxBufferSize" parameter must be of type `number`.');
        val = DEFAULT_MAX_BUFFER_SIZE;
      }

      const bufferSize = this.bufferSize();
      if (val === undefined || val <= bufferSize) {
        return bufferSize;
      }
      return val;
    }
  } as any;

  /**
   * Maximum number of elements outside the scope of visibility. Default value is 100.
   * If maxBufferSize is set to be greater than bufferSize, then adaptive buffer mode is enabled.
   * The greater the scroll size, the more elements are allocated for rendering.
   */
  maxBufferSize = input<number>(DEFAULT_MAX_BUFFER_SIZE, { ...this._maxBufferSizeTransform });

  private _snappingMethodOptions = {
    transform: (v: SnappingMethod) => {
      const valid = validateString(v) && (v === 'normal' || v === 'advanced' || 'chat');
      if (!valid) {
        console.error('The "snappingMethod" parameter must have the value `normal`, `advanced` or `chat`.');
        return DEFAULT_SNAPPING_METHOD;
      }
      return v;
    },
  } as any;

  /**
   * Snapping method.
   * 'default' - Normal group rendering.
   * 'advanced' - The group is rendered on a transparent background. List items below the group are not rendered.
   * 'chat' - The group is rendered on a background.
   */
  snappingMethod = input<SnappingMethod>(DEFAULT_SNAPPING_METHOD, { ...this._snappingMethodOptions });

  private _methodForSelectingOptions = {
    transform: (v: MethodForSelecting) => {
      const valid = validateString(v) && (v === 'none' || v === 'select' || 'multi-select');
      if (!valid) {
        console.error('The "methodForSelecting" parameter must have the value `none`, `select` or `multi-select`.');
        return DEFAULT_SELECT_METHOD;
      }
      return v;
    },
  } as any;

  /**
   *  Method for selecting list items. Default value is 'none'.
   * 'select' - List items are selected one by one.
   * 'multi-select' - Multiple selection of list items.
   * 'none' - List items are not selectable.
   */
  methodForSelecting = input<MethodForSelecting>(DEFAULT_SELECT_METHOD, { ...this._methodForSelectingOptions });

  private _trackByOptions = {
    transform: (v: string) => {
      const valid = validateString(v);
      if (!valid) {
        console.error('The "trackBy" parameter must be of type `string`.');
        return TRACK_BY_PROPERTY_NAME;
      }
      return v;
    },
  } as any;

  /**
   * The name of the property by which tracking is performed
   */
  trackBy = input<string>(TRACK_BY_PROPERTY_NAME, { ...this._trackByOptions });

  private _screenReaderMessageOptions = {
    transform: (v: string) => {
      const valid = validateString(v);
      if (!valid) {
        console.error('The "screenReaderMessage" parameter must be of type `string`.');
        return DEFAULT_SCREEN_READER_MESSAGE;
      }
      return v;
    },
  } as any;

  /**
   * Message for screen reader.
   * The message format is: "some text $1 some text $2",
   * where $1 is the number of the first element of the screen collection,
   * $2 is the number of the last element of the screen collection.
   */
  screenReaderMessage = input<string>(DEFAULT_SCREEN_READER_MESSAGE, { ...this._screenReaderMessageOptions });

  readonly screenReaderFormattedMessage = signal<string>(this.screenReaderMessage());

  private _langTextDir = {
    transform: (v: TextDirection) => {
      const valid = validateString(v);
      if (!valid) {
        console.error('The "langTextDir" parameter must be of type `string`.');
        return DEFAULT_LANG_TEXT_DIR;
      }
      return v;
    },
  } as any;

  /**
   * A string indicating the direction of text for the locale.
   * Can be either "ltr" (left-to-right) or "rtl" (right-to-left).
   */
  langTextDir = input<TextDirection>(DEFAULT_LANG_TEXT_DIR, { ...this._langTextDir });

  get displayItems() {
    return this._service.displayItems;
  }

  private _isNotSelecting = this.getIsNotSelecting();
  get isNotSelecting() { return this._isNotSelecting; }

  private _isSingleSelecting = this.getIsSingleSelecting();
  get isSingleSelecting() { return this._isSingleSelecting; }

  private _isMultiSelecting = this.getIsMultiSelecting();
  get isMultiSelecting() { return this._isMultiSelecting; }

  private _isSnappingMethodAdvanced: boolean = this.getIsSnappingMethodAdvanced();
  get isSnappingMethodAdvanced() { return this._isSnappingMethodAdvanced; }

  private _isVertical = this.getIsVertical();

  get orientation() {
    return this._isVertical ? Directions.VERTICAL : Directions.HORIZONTAL;
  }

  readonly focusedElement = signal<Id | undefined>(undefined);

  readonly classes = signal<{ [cName: string]: boolean }>({});

  private _actualItems = signal<IVirtualListCollection>([]);

  private _collapsedItemIds = signal<Array<Id>>([]);

  private _displayComponents: Array<ComponentRef<BaseVirtualListItemComponent>> = [];

  private _snapedDisplayComponent: ComponentRef<BaseVirtualListItemComponent> | undefined;

  private _bounds = signal<IRect | null>(null);

  private _totalSize = signal<number>(0);

  private _listBounds = signal<IRect | null>(null);

  private _scrollSize = signal<number>(0);

  private _isScrollStart = signal<boolean>(true);

  private _isScrollFinished = signal<boolean>(false);

  private _resizeObserver: ResizeObserver | null = null;

  private _listResizeObserver: ResizeObserver | null = null;

  private _resizeSnappedComponentHandler = () => {
    const list = this._list(), scroller = this._scroller(), bounds = this._bounds(), snappedComponent = this._snapedDisplayComponent?.instance;
    if (list && scroller && snappedComponent) {
      const isVertical = this._isVertical, listBounds = list.nativeElement.getBoundingClientRect(), listElement = list?.nativeElement,
        { width: lWidth, height: lHeight } = listElement?.getBoundingClientRect() ?? { width: 0, height: 0 },
        { width, height } = bounds ?? { width: 0, height: 0 }/*,
        isScrollable = isVertical ? scroller.nativeElement.scrollHeight > 0 : scroller.nativeElement.scrollWidth > 0*/;

      let scrollBarSize = isVertical ? width - lWidth : height - lHeight;

      this._service.scrollBarSize = scrollBarSize;

      const langTextDir = this.langTextDir();

      const snappingMethod = this.snappingMethod();
      if (snappingMethod === SnappingMethods.NORMAL || snappingMethod === SnappingMethods.ADVANCED) {
        snappedComponent.element.style.clipPath = `path("M 0 0 L 0 ${snappedComponent.element.offsetHeight} L ${snappedComponent.element.offsetWidth} ${snappedComponent.element.offsetHeight} L ${snappedComponent.element.offsetWidth} 0 Z")`;
      }

      snappedComponent.regularLength = `${isVertical ? listBounds.width : listBounds.height}${PX}`;
      const { width: sWidth, height: sHeight } = snappedComponent.getBounds() ?? { width: 0, height: 0 },
        scrollerElement = scroller.nativeElement, delta = snappedComponent.item?.measures.delta ?? 0;

      let left: number, right: number, top: number, bottom: number;
      if (isVertical) {
        left = 0;
        right = width - scrollBarSize;
        top = sHeight;
        bottom = height;
        if (snappingMethod === SnappingMethods.NORMAL || snappingMethod === SnappingMethods.ADVANCED) {
          if (langTextDir === TextDirections.RTL) {
            scrollerElement.style.clipPath = `path("M 0 0 L 0 ${height} L ${width} ${height} L ${width} ${top + delta} L ${scrollBarSize} ${top + delta} L ${scrollBarSize} 0 Z")`;
          } else {
            scrollerElement.style.clipPath = `path("M 0 ${top + delta} L 0 ${height} L ${width} ${height} L ${width} 0 L ${right} 0 L ${right} ${top + delta} Z")`;
          }
        }
      } else {
        left = sWidth;
        right = width;
        top = 0;
        bottom = height - scrollBarSize;
        if (snappingMethod === SnappingMethods.NORMAL || snappingMethod === SnappingMethods.ADVANCED) {
          scrollerElement.style.clipPath = `path("M ${width} 0 L ${width} ${bottom} L 0 ${bottom} L 0 0 L ${width} 0 Z")`;
        }
      }
    }
  };

  private _resizeSnappedObserver: ResizeObserver | null = null;

  private _componentsResizeObserver = new ResizeObserver(() => {
    this._trackBox.changes();
  });

  private _onResizeHandler = () => {
    const bounds = this._scroller()?.nativeElement?.getBoundingClientRect();
    if (bounds) {
      this._bounds.set({ x: bounds.x, y: bounds.y, width: bounds.width, height: bounds.height });
    } else {
      this._bounds.set({ x: 0, y: 0, width: DEFAULT_LIST_SIZE, height: DEFAULT_LIST_SIZE });
    }

    if (this._isSnappingMethodAdvanced) {
      this.updateRegularRenderer();
    }
  }

  private _onListResizeHandler = () => {
    const bounds = this._list()?.nativeElement?.getBoundingClientRect();
    if (bounds) {
      this._listBounds.set({ x: bounds.x, y: bounds.y, width: bounds.width, height: bounds.height });
    } else {
      this._listBounds.set({ x: 0, y: 0, width: DEFAULT_LIST_SIZE, height: DEFAULT_LIST_SIZE });
    }
  }

  private itemToFocus = (element: HTMLElement, position: number, align: FocusAlignment = FocusAlignments.CENTER,
    behavior: ScrollBehavior = BEHAVIOR_AUTO) => {
    const scroller = this._scrollerComponent();
    if (scroller) {
      const { width, height } = this._bounds()!, { width: elementWidth, height: elementHeight } = element.getBoundingClientRect(),
        isVertical = this._isVertical,
        viewportSize = isVertical ? height : width,
        elementSize = isVertical ? elementHeight : elementWidth;
      let pos: number = Number.NaN;
      switch (align) {
        case FocusAlignments.START: {
          pos = position;
          break;
        }
        case FocusAlignments.CENTER: {
          pos = position - (viewportSize - elementSize) * .5;
          break;
        }
        case FocusAlignments.END: {
          pos = position - (viewportSize - elementSize);
          break;
        }
        case FocusAlignments.NONE:
        default: {
          break;
        }
      }
      if (!Number.isNaN(pos)) {
        const scrollWidth = scroller?.scrollWidth ?? 0, scrollHeight = scroller?.scrollHeight ?? 0;
        if (isVertical) {
          if (pos < 0) {
            pos = 0;
          }
          if (pos > scrollHeight) {
            pos = scrollHeight;
          }
        } else {
          if (pos < 0) {
            pos = 0;
          }
          if (pos > scrollWidth) {
            pos = scrollWidth;
          }
        }

        this._trackBox.cancelScrollSnappingToEnd(true);
        const params: IScrollToParams = {
          [this._isVertical ? TOP_PROP_NAME : LEFT_PROP_NAME]: pos, behavior,
          fireUpdate: true, blending: true, userAction: true, duration: this.animationParams().navigateToItem,
        };
        scroller.scrollTo(params);
      }
    }
  }

  private _elementRef = inject(ElementRef<HTMLDivElement>);
  get host() {
    return this._elementRef;
  }

  /**
   * Base class of the element component
   */
  private _itemComponentClass: Component$1<BaseVirtualListItemComponent> = NgVirtualListItemComponent;

  /**
   * Base class trackBox
   */
  private _trackBoxClass: Component$1<TrackBox> = TrackBox;

  /**
   * Dictionary of element sizes by their id
   */
  private _trackBox: TrackBox = new this._trackBoxClass(this.trackBy());

  private _onTrackBoxChangeHandler = (v: number) => {
    this._cacheVersion.set(v);
  };

  private _cacheVersion = signal<number>(-1);

  private _$prepared = new BehaviorSubject<boolean>(false);
  readonly $prepared = this._$prepared.asObservable();

  private _$update = new Subject<void>();
  readonly $update = this._$update.asObservable();

  private _$isResetedReachStart = new BehaviorSubject<boolean>(true);
  readonly $isResetedReachStart = this._$isResetedReachStart.asObservable();

  private _$scrollTo = new Subject<IScrollParams>();
  protected $scrollTo = this._$scrollTo.asObservable();

  private _$scroll = new Subject<IScrollEvent>();
  readonly $scroll = this._$scroll.asObservable();

  private _$userScroll = new Subject<IScrollEvent | void>();
  readonly $userScroll = this._$userScroll.asObservable();

  private _onTrackBoxResetHandler = (v: boolean) => {
    if (v && this._scrollerComponent()?.scrollable) {
      this._$isResetedReachStart.next(true);

      const scroller = this._scroller()?.nativeElement;
      if (scroller) {
        const params: IScrollToParams = {
          [this._isVertical ? TOP_PROP_NAME : LEFT_PROP_NAME]: 0,
          behavior: BEHAVIOR_INSTANT,
          blending: false,
          fireUpdate: false,
          userAction: false,
          duration: this.animationParams().scrollToItem,
        };

        scroller.scrollTo(params);
      }
    }
  };

  private _$updateIteration = new BehaviorSubject<number>(0);

  private _onPreparedHandler = (v: boolean) => {
    this._$updateIteration.next(0);
    this._$prepared.next(v);
  };

  private _destroyRef = inject(DestroyRef);

  private _updateId: number | undefined;

  constructor() {
    NgVirtualListComponent.__nextId = NgVirtualListComponent.__nextId + 1 === Number.MAX_SAFE_INTEGER
      ? 0 : NgVirtualListComponent.__nextId + 1;
    this._id = NgVirtualListComponent.__nextId;

    this._trackBox.addEventListener(TrackBoxEvents.RESET, this._onTrackBoxResetHandler);
    this._trackBox.addEventListener(TrackBoxEvents.PREPARE, this._onPreparedHandler);

    this._service.initialize(this._trackBox);
    this._service.itemToFocus = this.itemToFocus;

    this._trackBox.displayComponents = this._displayComponents;

    const $scrollToItem = this.$scrollTo.pipe(takeUntilDestroyed()),
      $mouseDown = fromEvent(this._elementRef.nativeElement, MOUSE_DOWN).pipe(takeUntilDestroyed()),
      $touchStart = fromEvent(this._elementRef.nativeElement, TOUCH_START).pipe(takeUntilDestroyed());

    fromEvent(document, KEY_DOWN).pipe(
      takeUntilDestroyed(),
      switchMap(e => {
        return fromEvent(this._elementRef.nativeElement, FOCUS).pipe(
          takeUntilDestroyed(this._destroyRef),
          delay(0),
          takeUntil($scrollToItem),
          takeUntil($mouseDown),
          takeUntil($touchStart),
          tap(e => {
            this._service.focusFirstElement();
          }),
        )
      }),
    ).subscribe();

    this._service.$scrollToStart.pipe(
      takeUntilDestroyed(),
      tap(options => {
        this.scrollToStart(undefined, options);
      }),
    ).subscribe();

    this._service.$scrollToEnd.pipe(
      takeUntilDestroyed(),
      tap(options => {
        this.scrollToEndItem(undefined, options);
      }),
    ).subscribe();

    this._scroller = computed(() => {
      return this._scrollerComponent()?.scrollViewport();
    });

    this._list = computed(() => {
      return this._scrollerComponent()?.scrollContent();
    });

    effect(() => {
      const dir = this.langTextDir() as TextDirection;
      this._service.langTextDir = dir;
    });

    effect(() => {
      const dist = this.clickDistance();
      this._service.clickDistance = dist;
    });

    let prepared = false, readyToStart = false, isUserScrolling = false;

    const $updateComplete = this.$update.pipe(
      takeUntilDestroyed(),
      tap(() => {
        this._$updateIteration.next(this._$updateIteration.getValue() + 1);
        if (this._$updateIteration.getValue() <= Math.max(MAX_INIT_ITERATIONS, this.items().length)) {
          this._service.update(true);
        }
      }),
      debounceTime(250),
    ),
      $items = toObservable(this.items).pipe(
        map(i => !i ? [] : i),
      ), $dynamicSize = toObservable(this.dynamicSize);

    $dynamicSize.pipe(
      takeUntilDestroyed(),
      tap(v => {
        if (!v) {
          this._$show.next(true);
          prepared = readyToStart = true;
          const scrollerComponent = this._scrollerComponent();
          if (scrollerComponent) {
            scrollerComponent.prepared = true;
          }
          this.classes.set({ prepared: true, [READY_TO_START]: true, [WAIT_FOR_PREPARATION]: false });
          this._service.update(true);
        }
      }),
      filter(v => !!v),
      switchMap(() => {
        return this.$prepared.pipe(
          takeUntilDestroyed(this._destroyRef),
          distinctUntilChanged(),
          tap(v => {
            if (!v) {
              this._$show.next(false);
              readyToStart = isUserScrolling = prepared = false;
              this.cacheClean();
              const waitForPreparation = this.waitForPreparation();
              if (waitForPreparation) {
                const scrollerComponent = this._scrollerComponent();
                if (scrollerComponent) {
                  scrollerComponent.prepared = v;
                }
                this.classes.set({ prepared: v, [READY_TO_START]: false, [WAIT_FOR_PREPARATION]: waitForPreparation });
              }
            }
          }),
          filter(v => !!v),
          switchMap(v => {
            return $updateComplete.pipe(
              takeUntilDestroyed(this._destroyRef),
              switchMap(() => of(v)),
              take(1),
              takeUntilDestroyed(this._destroyRef),
              tap(v => {
                prepared = v;
                const waitForPreparation = this.waitForPreparation(), scrollerComponent = this._scrollerComponent(), val = v || !waitForPreparation;
                if (scrollerComponent) {
                  scrollerComponent.prepared = val;
                }
                this.classes.set({ prepared: val, [READY_TO_START]: true, [WAIT_FOR_PREPARATION]: waitForPreparation });
                this._service.update(true);
                this._$show.next(true);
              }),
              debounceTime(100),
              takeUntilDestroyed(this._destroyRef),
              tap(v => {
                const waitForPreparation = this.waitForPreparation(), val = v || !waitForPreparation;
                this.classes.set({ prepared: val, [READY_TO_START]: true, [WAIT_FOR_PREPARATION]: waitForPreparation });
                readyToStart = true;
                this._service.update(true);
              }),
            );
          }),
        )
      }),
    ).subscribe();

    this._service.$focusedId.pipe(
      takeUntilDestroyed(),
      tap(v => {
        this.focusedElement.set(v ?? undefined);
      }),
    ).subscribe();

    toObservable(this._list).pipe(
      takeUntilDestroyed(),
      filter(v => !!v),
      tap(v => {
        this._service.listElement = v.nativeElement;
      }),
    ).subscribe();

    const $defaultItemValue = toObservable(this.defaultItemValue),
      $snapScrollToBottom = toObservable(this.snapScrollToBottom),
      $trackBy = toObservable(this.trackBy),
      $selectByClick = toObservable(this.selectByClick),
      $collapseByClick = toObservable(this.collapseByClick),
      $isScrollStart = toObservable(this._isScrollStart),
      $isScrollFinished = toObservable(this._isScrollFinished),
      $scrollStartOffset = toObservable(this.scrollStartOffset),
      $scrollEndOffset = toObservable(this.scrollEndOffset),
      $isVertical = toObservable(this.direction).pipe(
        map(v => this.getIsVertical(v || DEFAULT_DIRECTION)),
      );

    $snapScrollToBottom.pipe(
      takeUntilDestroyed(),
      tap(v => {
        this._service.snapScrollToBottom = v;
      }),
    ).subscribe();

    $isVertical.pipe(
      takeUntilDestroyed(),
      tap(v => {
        this._service.isVertical = v;
      }),
    ).subscribe();

    $dynamicSize.pipe(
      takeUntilDestroyed(),
      tap(v => {
        this._service.dynamic = v;
      }),
    ).subscribe();

    $defaultItemValue.pipe(
      takeUntilDestroyed(),
      tap(v => {
        this._service.defaultItemValue = v;
      }),
    ).subscribe();

    $scrollStartOffset.pipe(
      takeUntilDestroyed(),
      distinctUntilChanged(),
      tap(v => {
        this._trackBox.scrollStartOffset = this._service.scrollStartOffset = v;
      }),
    ).subscribe();

    $scrollEndOffset.pipe(
      takeUntilDestroyed(),
      distinctUntilChanged(),
      tap(v => {
        this._trackBox.scrollEndOffset = this._service.scrollEndOffset = v;
      }),
    ).subscribe();

    let isResetedReachStart = this._$isResetedReachStart.getValue();

    this.$isResetedReachStart.pipe(
      takeUntilDestroyed(),
      tap(v => {
        if (v) {
          isResetedReachStart = v;
        }
      }),
      debounceTime(1),
      takeUntilDestroyed(this._destroyRef),
      tap(v => {
        isResetedReachStart = v;
      }),
    ).subscribe();

    $isScrollStart.pipe(
      takeUntilDestroyed(),
      distinctUntilChanged(),
      debounceTime(0),
      tap(v => {
        if (readyToStart && v && !isResetedReachStart && this._scrollerComponent()?.scrollable) {
          this._trackBox.isScrollStart = true;
          this.onScrollReachStart.emit();
        }
        this._$isResetedReachStart.next(false);
      }),
    ).subscribe();

    $isScrollFinished.pipe(
      takeUntilDestroyed(),
      distinctUntilChanged(),
      debounceTime(0),
      tap(v => {
        this._trackBox.isScrollEnd = v;
        if (readyToStart && v && this._scrollerComponent()?.scrollable) {
          this.onScrollReachEnd.emit();
        }
      }),
    ).subscribe();

    $selectByClick.pipe(
      takeUntilDestroyed(),
      tap(v => {
        this._service.selectByClick = v;
      }),
    ).subscribe();

    $collapseByClick.pipe(
      takeUntilDestroyed(),
      tap(v => {
        this._service.collapseByClick = v;
      }),
    ).subscribe();

    $trackBy.pipe(
      takeUntilDestroyed(),
      tap(v => {
        this._trackBox.trackingPropertyName = v;
      }),
    ).subscribe();

    const $bounds = toObservable(this._bounds).pipe(
      filter(b => !!b),
    ),
      $listBounds = toObservable(this._listBounds).pipe(
        filter(b => !!b),
      ), $scrollSize = toObservable(this._scrollSize),
      $itemSize = toObservable(this.itemSize).pipe(
        map(v => v <= 0 ? DEFAULT_ITEM_SIZE : v),
      ),
      $bufferSize = toObservable(this.bufferSize).pipe(
        map(v => v < 0 ? DEFAULT_BUFFER_SIZE : v),
      ),
      $maxBufferSize = toObservable(this.maxBufferSize).pipe(
        map(v => v < 0 ? DEFAULT_BUFFER_SIZE : v),
      ),
      $itemConfigMap = toObservable(this.itemConfigMap).pipe(
        map(v => !v ? {} : v),
      ),
      $snap = toObservable(this.snap),
      $isLazy = toObservable(this.collectionMode).pipe(
        map(v => this.getIsLazy(v || DEFAULT_COLLECTION_MODE)),
      ),
      $enabledBufferOptimization = toObservable(this.enabledBufferOptimization),
      $snappingMethod = toObservable(this.snappingMethod).pipe(
        map(v => this.getIsSnappingMethodAdvanced(v || DEFAULT_SNAPPING_METHOD)),
      ),
      $methodForSelecting = toObservable(this.methodForSelecting),
      $selectedIds = toObservable(this.selectedIds),
      $collapsedIds = toObservable(this.collapsedIds).pipe(
        map(v => Array.isArray(v) ? v : []),
      ),
      $collapsedItemIds = toObservable(this._collapsedItemIds).pipe(
        map(v => Array.isArray(v) ? v : []),
      ),
      $actualItems = toObservable(this._actualItems),
      $screenReaderMessage = toObservable(this.screenReaderMessage),
      $displayItems = this._service.$displayItems,
      $cacheVersion = toObservable(this._cacheVersion);

    combineLatest([$displayItems, $screenReaderMessage, $isVertical, $scrollSize, $bounds]).pipe(
      takeUntilDestroyed(),
      distinctUntilChanged(),
      debounceTime(100),
      takeUntilDestroyed(),
      tap(([items, screenReaderMessage, isVertical, scrollSize, bounds]) => {
        this.screenReaderFormattedMessage.set(
          formatScreenReaderMessage(items, screenReaderMessage, scrollSize, isVertical, bounds)
        );
      }),
    ).subscribe();

    $isLazy.pipe(
      takeUntilDestroyed(),
      tap(v => {
        this._trackBox.isLazy = v;
      }),
    ).subscribe();

    combineLatest([$items, $itemSize]).pipe(
      takeUntilDestroyed(),
      map(([items, itemSize]) => ({ items, itemSize })),
      tap(({ items, itemSize }) => {
        this._trackBox.resetCollection(items, itemSize);
      }),
    ).subscribe();

    combineLatest([$items, $collapsedItemIds, $itemConfigMap, $trackBy]).pipe(
      takeUntilDestroyed(),
      tap(([items, collapsedIds, itemConfigMap, trackBy]) => {
        const hiddenItems = new CMap<Id, boolean>();

        let isCollapsed = false;
        for (let i = 0, l = items.length; i < l; i++) {
          const item = items[i], id = item[trackBy], group = (itemConfigMap[id]?.sticky ?? 0) > 0, collapsed = collapsedIds.includes(id);
          if (group) {
            isCollapsed = collapsed;
          } else {
            if (isCollapsed) {
              hiddenItems.set(id, true);
            }
          }
        }

        const actualItems: IVirtualListCollection = [];
        for (let i = 0, l = items.length; i < l; i++) {
          const item = items[i], id = item[trackBy];
          if (hiddenItems.has(id)) {
            continue;
          }
          actualItems.push(item);
        }

        this._actualItems.set(actualItems);
      }),
    ).subscribe();

    $isVertical.pipe(
      takeUntilDestroyed(),
      tap(v => {
        this._isVertical = v;
        const el: HTMLElement = this._elementRef.nativeElement;
        toggleClassName(el, v ? CLASS_LIST_VERTICAL : CLASS_LIST_HORIZONTAL, v ? CLASS_LIST_HORIZONTAL : CLASS_LIST_VERTICAL);
      }),
    ).subscribe();

    $snappingMethod.pipe(
      takeUntilDestroyed(),
      tap(v => {
        this._isSnappingMethodAdvanced = this._trackBox.isSnappingMethodAdvanced = v;
      }),
    ).subscribe();

    $methodForSelecting.pipe(
      takeUntilDestroyed(),
      tap(v => {
        const el = this._list()?.nativeElement;
        if (this.getIsMultiSelecting(v || DEFAULT_SNAPPING_METHOD)) {
          this._isMultiSelecting = true;
          this._isNotSelecting = this._isSingleSelecting = false;
          if (el) {
            el.role = ROLE_LIST_BOX;
          }
          this._service.methodOfSelecting = MethodsForSelectingTypes.MULTI_SELECT;
        } else if (this.getIsSingleSelecting(v || DEFAULT_SNAPPING_METHOD)) {
          this._isSingleSelecting = true;
          this._isNotSelecting = this._isMultiSelecting = false;
          if (el) {
            el.role = ROLE_LIST_BOX;
          }
          this._service.methodOfSelecting = MethodsForSelectingTypes.SELECT;
        } else if (this.getIsNotSelecting(v || DEFAULT_SNAPPING_METHOD)) {
          this._isNotSelecting = true;
          this._isSingleSelecting = this._isMultiSelecting = false;
          if (el) {
            el.role = ROLE_LIST;
          }
          this._service.methodOfSelecting = MethodsForSelectingTypes.NONE;
        }
      }),
    ).subscribe();

    $dynamicSize.pipe(
      takeUntilDestroyed(),
      tap(dynamicSize => {
        this.listenCacheChangesIfNeed(dynamicSize);
      })
    ).subscribe();

    /**
     * 0 - none; 1 - instant;
     */
    const _$scrollToEndDuringUpdateCanceller = new BehaviorSubject<0 | 1>(0),
      $scrollToEndDuringUpdateCanceller = _$scrollToEndDuringUpdateCanceller.asObservable();

    $scrollToEndDuringUpdateCanceller.pipe(
      takeUntilDestroyed(),
      filter(v => v > 0),
      tap((v) => {
        const scroller = this._scrollerComponent();
        if (scroller) {
          this._trackBox.cancelScrollSnappingToEnd(true);
        }
      }),
      tap(() => {
        _$scrollToEndDuringUpdateCanceller.next(0);
      }),
    ).subscribe();

    const update = (params: {
      snapScrollToBottom: boolean; bounds: IRect; listBounds: IRect; scrollEndOffset: number; items: IVirtualListCollection<Object>;
      itemConfigMap: IVirtualListItemConfigMap; scrollSize: number; itemSize: number; bufferSize: number; maxBufferSize: number;
      snap: boolean; isVertical: boolean; dynamicSize: boolean; enabledBufferOptimization: boolean; cacheVersion: number;
    }) => {
      const {
        snapScrollToBottom, bounds, listBounds, scrollEndOffset, items, itemConfigMap, scrollSize, itemSize,
        bufferSize, maxBufferSize, snap, isVertical, dynamicSize, enabledBufferOptimization, cacheVersion,
      } = params;
      const scroller = this._scrollerComponent();
      if (scroller) {
        let actualScrollSize = snapScrollToBottom && !prepared ?
          (isVertical ? scroller.actualScrollHeight ?? 0 : scroller.actualScrollWidth ?? 0) :
          (isVertical ? scroller.actualScrollTop ?? 0 : scroller.actualScrollLeft ?? 0),
          totalSize = 0, displayItems: IRenderVirtualListCollection;

        const { width, height, x, y } = bounds, viewportSize = (isVertical ? height : width);

        let scrollLength = Math.round(this._totalSize()) ?? 0,
          actualScrollLength = Math.round(scrollLength === 0 ? 0 : scrollLength > viewportSize ? scrollLength - viewportSize : scrollLength),
          roundedMaxPosition = Math.round(actualScrollLength),
          scrollPosition = Math.round(actualScrollSize);

        const opts: IUpdateCollectionOptions<IVirtualListItem, IVirtualListCollection> = {
          bounds: { width, height, x, y }, dynamicSize, isVertical, itemSize,
          bufferSize, maxBufferSize, scrollSize: actualScrollSize, snap, enabledBufferOptimization,
        };

        if (snapScrollToBottom && !prepared) {
          const { displayItems: calculatedDisplayItems, totalSize: calculatedTotalSize1 } =
            this._trackBox.updateCollection(items, itemConfigMap, { ...opts, scrollSize: actualScrollSize });
          displayItems = calculatedDisplayItems;
          totalSize = calculatedTotalSize1;
          scrollLength = Math.round(totalSize) ?? 0;
          actualScrollLength = Math.round(scrollLength === 0 ? 0 : scrollLength > viewportSize ? scrollLength - viewportSize : scrollLength);
          roundedMaxPosition = Math.round(actualScrollLength);
          scrollPosition = Math.round(actualScrollSize);
        } else {
          const { displayItems: calculatedDisplayItems, totalSize: calculatedTotalSize } = this._trackBox.updateCollection(items, itemConfigMap, opts);
          displayItems = calculatedDisplayItems;
          totalSize = calculatedTotalSize;
        }

        scroller.totalSize = totalSize;

        this._totalSize.set(totalSize);

        this._service.collection = displayItems;

        this.resetBoundsSize(isVertical, totalSize);

        this.createDisplayComponentsIfNeed(displayItems);

        this.tracking();

        if (actualScrollLength > 0) {
          const isScrollStart = isUserScrolling && scrollPosition < MIN_SCROLL_TO_START_PIXELS;
          this._isScrollStart.set(isScrollStart);
          if (isScrollStart) {
            this._isScrollFinished.set(false);
          } else {
            this._isScrollFinished.set(scrollPosition >= roundedMaxPosition);
          }
        }

        actualScrollSize = (isVertical ? scroller.scrollTop ?? 0 : scroller.scrollLeft ?? 0);
        const delta = this._trackBox.delta,
          roundedActualScrollSize = Math.round(actualScrollSize),
          scrollPositionAfterUpdate = actualScrollSize + delta,
          roundedScrollPositionAfterUpdate = Math.round(scrollPositionAfterUpdate),
          roundedMaxPositionAfterUpdate = Math.round(totalSize - viewportSize);

        if (this._isSnappingMethodAdvanced) {
          this.updateRegularRenderer();
        }

        this._trackBox.clearDelta();

        if ((snapScrollToBottom && this._trackBox.isSnappedToEnd) || (!!snapScrollToBottom && !prepared) ||
          (snapScrollToBottom && actualScrollSize > 0 &&
            ((roundedScrollPositionAfterUpdate >= scrollPosition) &&
              (scrollPosition >= roundedMaxPosition) &&
              (roundedMaxPositionAfterUpdate >= roundedMaxPosition)))) {
          if (!this._trackBox.isSnappedToEnd) {
            this._isScrollFinished.set(true);
          }
          this._trackBox.isScrollEnd = true;
          if (roundedMaxPositionAfterUpdate > 0) {
            const diff = roundedMaxPositionAfterUpdate - roundedScrollPositionAfterUpdate,
              snapToEndTransitionInstantOffset = this.snapToEndTransitionInstantOffset() || viewportSize,
              animated = prepared && readyToStart && diff >= 0 && diff <= snapToEndTransitionInstantOffset,
              params: IScrollToParams = {
                [isVertical ? TOP_PROP_NAME : LEFT_PROP_NAME]: roundedMaxPositionAfterUpdate,
                fireUpdate: !(prepared && readyToStart), behavior: animated ? this.scrollBehavior() : BEHAVIOR_INSTANT,
                blending: false, duration: this.animationParams().scrollToItem,
              };
            scroller?.scrollTo?.(params);
          }
        } else if (roundedActualScrollSize !== roundedScrollPositionAfterUpdate && scrollPositionAfterUpdate > 0) {
          if (!snapScrollToBottom && scrollPositionAfterUpdate >= roundedMaxPosition) {
            if (!this._trackBox.isSnappedToEnd) {
              this._isScrollFinished.set(true);
            }
          }
          if (this._scrollSize() !== scrollPositionAfterUpdate) {
            const params: IScrollToParams = {
              [isVertical ? TOP_PROP_NAME : LEFT_PROP_NAME]: scrollPositionAfterUpdate, blending: prepared && readyToStart,
              fireUpdate: !(prepared && readyToStart), behavior: BEHAVIOR_INSTANT, duration: this.animationParams().scrollToItem,
            };
            scroller.scrollTo(params);
          }
        }
        if (!prepared || !readyToStart) {
          this._$update.next();
        }
      }
    };

    combineLatest([$snapScrollToBottom, $bounds, $listBounds, $scrollEndOffset, $actualItems, $itemConfigMap, $scrollSize, $itemSize,
      $bufferSize, $maxBufferSize, $snap, $isVertical, $dynamicSize, $enabledBufferOptimization, $cacheVersion, this.$userScroll,
    ]).pipe(
      takeUntilDestroyed(),
      distinctUntilChanged(),
      tap(([
        snapScrollToBottom, bounds, listBounds, scrollEndOffset, items, itemConfigMap, scrollSize, itemSize,
        bufferSize, maxBufferSize, snap, isVertical, dynamicSize, enabledBufferOptimization, cacheVersion,
      ]) => {
        update({
          snapScrollToBottom, bounds, listBounds, scrollEndOffset, items, itemConfigMap, scrollSize, itemSize,
          bufferSize, maxBufferSize, snap, isVertical, dynamicSize, enabledBufferOptimization, cacheVersion,
        });
      }),
    ).subscribe();

    combineLatest([$items, $dynamicSize]).pipe(
      takeUntilDestroyed(),
      filter(([, dynamic]) => !dynamic),
      delay(0),
      takeUntilDestroyed(),
      tap(() => {
        this._scrollerComponent()?.refresh(true);
      }),
    ).subscribe();

    const $scroller = toObservable(this._scroller).pipe(
      takeUntilDestroyed(),
      filter(v => !!v),
      map(v => v.nativeElement),
      take(1),
    ),
      $scrollerScroll = toObservable(this._scrollerComponent).pipe(
        takeUntilDestroyed(),
        filter(v => !!v),
        take(1),
        switchMap(scroller => scroller.$scroll),
      ),
      $scrollerScrollEnd = toObservable(this._scrollerComponent).pipe(
        takeUntilDestroyed(),
        filter(v => !!v),
        take(1),
        switchMap(scroller => scroller.$scrollEnd),
      ),
      $list = toObservable(this._list).pipe(
        takeUntilDestroyed(),
        filter(v => !!v),
        map(v => v.nativeElement),
        take(1),
      );

    $scroller.pipe(
      takeUntilDestroyed(),
      distinctUntilChanged(),
      switchMap(scroller => {
        return fromEvent(scroller, SCROLLER_WHEEL, { passive: true }).pipe(
          takeUntilDestroyed(this._destroyRef),
          filter(() => {
            return !!this._trackBox.isSnappedToEnd;
          }),
          tap(() => {
            _$scrollToEndDuringUpdateCanceller.next(1);
          }),
        );
      }),
    ).subscribe();

    $scroller.pipe(
      takeUntilDestroyed(),
      distinctUntilChanged(),
      switchMap(scroller => {
        return fromEvent(scroller, SCROLLER_SCROLLBAR_SCROLL, { passive: true }).pipe(
          takeUntilDestroyed(this._destroyRef),
          filter(() => {
            return !!this._trackBox.isSnappedToEnd;
          }),
          tap(() => {
            _$scrollToEndDuringUpdateCanceller.next(1);
          }),
        );
      }),
    ).subscribe();

    const $docPointerUp = fromEvent(document, MOUSE_UP, { passive: true }).pipe(
      take(1),
    ),
      $docPointerLeave = fromEvent(document, MOUSE_LEAVE, { passive: true }).pipe(
        take(1),
      ),
      $docPointerOut = fromEvent(document, MOUSE_OUT, { passive: true }).pipe(
        take(1),
      ),
      $pointerMoveTakeUntil = race([$docPointerUp, $docPointerLeave, $docPointerOut]).pipe(
        takeUntilDestroyed(),
        take(1),
      );

    $scroller.pipe(
      takeUntilDestroyed(),
      distinctUntilChanged(),
      switchMap(scroller => {
        return fromEvent(scroller, MOUSE_DOWN, { passive: true }).pipe(
          takeUntilDestroyed(this._destroyRef),
          switchMap(e => {
            return $scrollerScroll.pipe(
              takeUntilDestroyed(this._destroyRef),
              takeUntil($pointerMoveTakeUntil),
              filter(() => {
                return !!this._trackBox.isSnappedToEnd;
              }),
            );
          }),
          map(e => {
            const scroller = this._scrollerComponent();
            if (scroller) {
              const isVertical = this._isVertical, scrollSize = isVertical ? scroller.scrollTop : scroller.scrollLeft;
              return scrollSize;
            }
            return 0;
          }),
          tap(() => {
            _$scrollToEndDuringUpdateCanceller.next(1);
          }),
        );
      }),
    ).subscribe();

    const $docTouchUp = fromEvent(document, TOUCH_END, { passive: true }).pipe(
      take(1),
    ),
      $docTouchLeave = fromEvent(document, TOUCH_LEAVE, { passive: true }).pipe(
        take(1),
      ),
      $docTouchOut = fromEvent(document, TOUCH_OUT, { passive: true }).pipe(
        take(1),
      ),
      $touchMoveTakeUntil = race([$docTouchUp, $docTouchLeave, $docTouchOut]).pipe(
        takeUntilDestroyed(),
        take(1),
      );

    $scroller.pipe(
      takeUntilDestroyed(),
      distinctUntilChanged(),
      switchMap(scroller => {
        return fromEvent(scroller, TOUCH_START, { passive: true }).pipe(
          takeUntilDestroyed(this._destroyRef),
          switchMap(e => {
            return $scrollerScroll.pipe(
              takeUntilDestroyed(this._destroyRef),
              takeUntil($touchMoveTakeUntil),
              filter(() => {
                return !!this._trackBox.isSnappedToEnd;
              }),
            );
          }),
          map(e => {
            const scroller = this._scrollerComponent();
            if (scroller) {
              const isVertical = this._isVertical, scrollSize = isVertical ? scroller.scrollTop : scroller.scrollLeft;
              return scrollSize;
            }
            return 0;
          }),
          tap(() => {
            _$scrollToEndDuringUpdateCanceller.next(1);
          }),
        );
      }),
    ).subscribe();

    $scroller.pipe(
      takeUntilDestroyed(),
      distinctUntilChanged(),
      switchMap(scroller => {
        return $scrollerScroll.pipe(
          takeUntilDestroyed(this._destroyRef),
        );
      }),
      tap(userAction => {
        isUserScrolling = userAction;
        const scrollerEl = this._scroller()?.nativeElement, scrollerComponent = this._scrollerComponent();
        if (scrollerEl && scrollerComponent) {
          const isVertical = this._isVertical, scrollSize = (isVertical ? scrollerComponent.scrollTop : scrollerComponent.scrollLeft),
            bounds = this._bounds() || { x: 0, y: 0, width: DEFAULT_LIST_SIZE, height: DEFAULT_LIST_SIZE },
            currentScollSize = this._scrollSize();
          this._trackBox.deltaDirection = currentScollSize > scrollSize ? -1 : currentScollSize < scrollSize ? 1 : 0;
          const itemsRange = formatActualDisplayItems(this._service.displayItems, this.scrollStartOffset(), this.scrollEndOffset(),
            scrollSize, isVertical, bounds),
            event = new ScrollEvent({
              direction: this._trackBox.scrollDirection, container: scrollerEl,
              list: this._list()!.nativeElement, delta: this._trackBox.delta,
              scrollDelta: this._trackBox.scrollDelta, isVertical,
              scrollSize,
              itemsRange,
            });

          this.onScroll.emit(event);
          this._$scroll.next(event);

          if (userAction && !this.dynamicSize()) {
            this._$userScroll.next(event);
          }
        }
      }),
    ).subscribe();

    $scroller.pipe(
      takeUntilDestroyed(),
      distinctUntilChanged(),
      switchMap(scroller => {
        return $scrollerScrollEnd.pipe(
          takeUntilDestroyed(this._destroyRef),
        );
      }),
      tap(userAction => {
        isUserScrolling = userAction;
        const scrollerEl = this._scroller()?.nativeElement, scrollerComponent = this._scrollerComponent();
        if (scrollerEl && scrollerComponent) {
          const isVertical = this._isVertical, scrollSize = (isVertical ? scrollerComponent.scrollTop : scrollerComponent.scrollLeft),
            bounds = this._bounds() || { x: 0, y: 0, width: DEFAULT_LIST_SIZE, height: DEFAULT_LIST_SIZE },
            currentScollSize = this._scrollSize();
          this._trackBox.deltaDirection = currentScollSize > scrollSize ? -1 : currentScollSize < scrollSize ? 1 : 0;
          const itemsRange = formatActualDisplayItems(this._service.displayItems, this.scrollStartOffset(), this.scrollEndOffset(),
            scrollSize, isVertical, bounds),
            event = new ScrollEvent({
              direction: this._trackBox.scrollDirection, container: scrollerEl,
              list: this._list()!.nativeElement, delta: this._trackBox.delta,
              scrollDelta: this._trackBox.scrollDelta, isVertical,
              scrollSize,
              itemsRange,
            });

          this.onScrollEnd.emit(event);
          this._$scroll.next(event);

          if (userAction && !this.dynamicSize()) {
            this._$userScroll.next(event);
          }
        }
      }),
    ).subscribe();

    $scroller.pipe(
      takeUntilDestroyed(),
      distinctUntilChanged(),
      switchMap(scroller => {
        return $scrollerScroll.pipe(
          takeUntilDestroyed(this._destroyRef),
        );
      }),
      tap(e => {
        const scroller = this._scrollerComponent();
        if (scroller) {
          const isVertical = this._isVertical, bounds = this._bounds(), listBounds = this._listBounds(),
            scrollSize = (isVertical ? scroller.scrollTop : scroller.scrollLeft),
            scrollLength = isVertical ? (listBounds?.height ?? 0) - (bounds?.height ?? 0) : (listBounds?.width ?? 0) - (bounds?.width ?? 0),
            actualScrollSize = scrollSize;

          if (this._trackBox.isSnappedToEnd) {
            if (scrollSize < scrollLength) {
              this._trackBox.cancelScrollSnappingToEnd();
            }
          }

          this._scrollSize.set(actualScrollSize);
        }
      }),
    ).subscribe();

    $scroller.pipe(
      takeUntilDestroyed(),
      distinctUntilChanged(),
      tap(scroller => {
        if (this._resizeObserver) {
          this._resizeObserver.disconnect();
        }

        this._resizeObserver = new ResizeObserver(this._onResizeHandler);
        this._resizeObserver.observe(scroller);

        this._onResizeHandler();
      }),
    ).subscribe();

    $list.pipe(
      takeUntilDestroyed(),
      distinctUntilChanged(),
      tap(list => {
        if (this._listResizeObserver) {
          this._listResizeObserver.disconnect();
        }

        this._listResizeObserver = new ResizeObserver(this._onListResizeHandler);
        this._listResizeObserver.observe(list);

        this._onResizeHandler();
      }),
    ).subscribe();

    const $scrollTo = this.$scrollTo;

    combineLatest([$scroller, $trackBy, $scrollTo]).pipe(
      takeUntilDestroyed(),
      filter(([scroller]) => scroller !== undefined),
      map(([scroller, trackBy, event]) => ({ scroller: scroller, trackBy, event })),
      switchMap(({ scroller, trackBy, event }) => {
        const scrollerComponent = this._scrollerComponent(),
          {
            id, iteration = 0, blending = false,
            isLastIteration = false, scrollCalled = false, cb,
          } = event;
        if (scrollerComponent) {
          const items = this._actualItems();
          if (items && items.length) {
            const dynamicSize = this.dynamicSize(), itemSize = this.itemSize();

            if (dynamicSize) {
              const { width, height, x, y } = this._bounds() || { x: 0, y: 0, width: DEFAULT_LIST_SIZE, height: DEFAULT_LIST_SIZE },
                itemConfigMap = this.itemConfigMap(), items = this._actualItems(), isVertical = this._isVertical,
                currentScollSize = (isVertical ? scrollerComponent.scrollTop : scrollerComponent.scrollLeft), delta = this._trackBox.delta,
                opts: IGetItemPositionOptions<IVirtualListItem, IVirtualListCollection> = {
                  bounds: { width, height, x, y }, collection: items, dynamicSize, isVertical: this._isVertical, itemSize,
                  bufferSize: this.bufferSize(), maxBufferSize: this.maxBufferSize(),
                  scrollSize: (isVertical ? scrollerComponent.scrollTop : scrollerComponent.scrollLeft) + delta,
                  snap: this.snap(), fromItemId: id, enabledBufferOptimization: this.enabledBufferOptimization(),
                },
                scrollSize = this._trackBox.getItemPosition(id, itemConfigMap, opts),
                params: IScrollToParams = {
                  [isVertical ? TOP_PROP_NAME : LEFT_PROP_NAME]: scrollSize, behavior: BEHAVIOR_INSTANT as ScrollBehavior,
                  fireUpdate: false, blending,
                };

              if (scrollSize === -1) {
                return of([true, { id, blending, scroller: scrollerComponent, scrollCalled, cb }]);
              }

              this._trackBox.clearDelta();

              const { displayItems, totalSize } = this._trackBox.updateCollection(items, itemConfigMap, {
                ...opts, scrollSize, fromItemId: isLastIteration ? undefined : id,
              }), delta1 = this._trackBox.delta;

              scrollerComponent.totalSize = totalSize;

              this._service.collection = displayItems;

              this._trackBox.clearDelta();

              let actualScrollSize = scrollSize + delta1;

              this.resetBoundsSize(isVertical, totalSize);

              this.createDisplayComponentsIfNeed(displayItems);

              this.tracking();

              const _scrollSize = this._trackBox.getItemPosition(id, itemConfigMap, { ...opts, scrollSize: actualScrollSize, fromItemId: id });

              if (_scrollSize === -1) {
                return of([true, { id, blending, scroller: scrollerComponent, scrollCalled, cb }]);
              }
              _$scrollToEndDuringUpdateCanceller.next(1);
              const notChanged = actualScrollSize === currentScollSize;
              scrollerComponent?.scrollTo?.(params);
              if ((!notChanged && iteration < MAX_SCROLL_TO_ITERATIONS) || iteration < MAX_SCROLL_TO_ITERATIONS) {
                this._$scrollTo.next(params as IScrollParams);
                return of([false, {
                  id, scroller: scrollerComponent, iteration: iteration + 1, blending,
                  isLastIteration: notChanged, scrollCalled: true, cb
                }]).pipe(
                  delay(1),
                );
              } else {
                this._scrollSize.set(actualScrollSize);
                return of([true, { id, blending, scroller: scrollerComponent, scrollCalled, cb }]);
              }
            } else {
              const index = items.findIndex(item => item[trackBy] === id);
              if (index > -1) {
                const isVertical = this._isVertical,
                  currentScollSize = (isVertical ? scrollerComponent.scrollTop : scrollerComponent.scrollLeft), scrollSize = index * this.itemSize();
                if (currentScollSize !== scrollSize) {
                  _$scrollToEndDuringUpdateCanceller.next(1);
                  const params: IScrollToParams = {
                    [this._isVertical ? TOP_PROP_NAME : LEFT_PROP_NAME]: scrollSize,
                    behavior: BEHAVIOR_INSTANT as ScrollBehavior, blending,
                  };
                  scrollerComponent?.scrollTo?.(params);
                  return of([true, { id, blending, scroller: scrollerComponent, cb }]).pipe(delay(1));
                }
              }
            }
          }
        }
        return of([true, { id, scroller: scrollerComponent, cb }]);
      }),
      takeUntilDestroyed(),
      filter(params => !!params),
      tap(([finished, params]) => {
        if (!finished) {
          if (params) {
            this._$scrollTo.next(params as IScrollParams);
          }
          return;
        }

        this._trackBox.cancelScrollSnappingToEnd(true);

        const p = params as Pick<IScrollParams, 'cb' | 'scrollCalled' | 'scroller'>;
        if (p.scrollCalled && p.scroller) {
          this._scrollerComponent()?.refresh();
          p.cb?.();
          return;
        }

        if (p) {
          this._scrollerComponent()?.refresh();
          const { cb } = p;
          cb?.();
        }
      }),
    ).subscribe();

    const $itemRenderer = toObservable(this.itemRenderer);

    $itemRenderer.pipe(
      takeUntilDestroyed(),
      distinctUntilChanged(),
      filter(v => !!v),
      tap(v => {
        this._itemRenderer.set(v);
      }),
    ).subscribe();

    $bounds.pipe(
      takeUntilDestroyed(),
      distinctUntilChanged(),
      tap(value => {
        const size: ISize = { width: value.width, height: value.height };
        this.onViewportChange.emit(objectAsReadonly(size));
      }),
    ).subscribe();

    this._service.$itemClick.pipe(
      takeUntilDestroyed(),
      tap(v => {
        this.onItemClick.emit(objectAsReadonly(v));
      }),
    ).subscribe();

    let isSelectedIdsFirstEmit = 0;

    this._service.$selectedIds.pipe(
      takeUntilDestroyed(),
      distinctUntilChanged(),
      tap(v => {
        if (this.isSingleSelecting || (this.isMultiSelecting && isSelectedIdsFirstEmit >= 2)) {
          const curr = this.selectedIds();
          if ((this.isSingleSelecting && JSON.stringify(v) !== JSON.stringify(curr)) ||
            (isSelectedIdsFirstEmit === 2 && JSON.stringify(v) !== JSON.stringify(curr)) || isSelectedIdsFirstEmit > 2) {
            this.onSelect.emit(copyValueAsReadonly(v));
          }
        }
        if (isSelectedIdsFirstEmit < 3) {
          isSelectedIdsFirstEmit++;
        }
      }),
    ).subscribe();

    $selectedIds.pipe(
      takeUntilDestroyed(),
      distinctUntilChanged(),
      tap(v => {
        this._service.setSelectedIds(v);
      }),
    ).subscribe();

    let isCollapsedIdsFirstEmit = 0;

    this._service.$collapsedIds.pipe(
      takeUntilDestroyed(),
      distinctUntilChanged(),
      tap(v => {
        this._collapsedItemIds.set(v);

        if (isCollapsedIdsFirstEmit >= 2) {
          const curr = this.collapsedIds();
          if ((isCollapsedIdsFirstEmit === 2 && JSON.stringify(v) !== JSON.stringify(curr)) || isCollapsedIdsFirstEmit > 2) {
            this.onCollapse.emit(copyValueAsReadonly(v));
          }
        }
        if (isCollapsedIdsFirstEmit < 3) {
          isCollapsedIdsFirstEmit++;
        }
      }),
    ).subscribe();

    $collapsedIds.pipe(
      takeUntilDestroyed(),
      distinctUntilChanged(),
      tap(v => {
        this._service.setCollapsedIds(v);
      }),
    ).subscribe();

    this._$userScroll.next({
      scrollSize: 0,
      scrollWeight: 0,
      size: 0,
      listSize: 0,
      isVertical: false,
      direction: 0,
      isStart: false,
      isEnd: false,
      delta: 0,
      scrollDelta: 0,
      itemsRange: undefined,
    });
  }

  private listenCacheChangesIfNeed(value: boolean) {
    if (value) {
      if (!this._trackBox.hasEventListener(TrackBoxEvents.CHANGE, this._onTrackBoxChangeHandler)) {
        this._trackBox.addEventListener(TrackBoxEvents.CHANGE, this._onTrackBoxChangeHandler);
      }
    } else {
      if (this._trackBox.hasEventListener(TrackBoxEvents.CHANGE, this._onTrackBoxChangeHandler)) {
        this._trackBox.removeEventListener(TrackBoxEvents.CHANGE, this._onTrackBoxChangeHandler);
      }
    }
  }

  private getIsSnappingMethodAdvanced(m?: SnappingMethod) {
    const method = m || this.snappingMethod();
    return isSnappingMethodAdvenced(method);
  }

  private getIsNotSelecting(m?: MethodForSelecting) {
    const method = m || this.methodForSelecting();
    return isMethodForSelecting(method, MethodsForSelecting.NONE);
  }

  private getIsSingleSelecting(m?: MethodForSelecting) {
    const method = m || this.methodForSelecting();
    return isMethodForSelecting(method, MethodsForSelecting.SELECT);
  }

  private getIsMultiSelecting(m?: MethodForSelecting) {
    const method = m || this.methodForSelecting();
    return isMethodForSelecting(method, MethodsForSelecting.MULTI_SELECT);
  }

  private getIsVertical(d?: Direction) {
    const dir = d || this.direction();
    return isDirection(dir, Directions.VERTICAL);
  }

  private getIsLazy(m?: CollectionMode) {
    const mode = m || this.collectionMode();
    return isCollectionMode(mode, CollectionModes.LAZY);
  }

  private createDisplayComponentsIfNeed(displayItems: IRenderVirtualListCollection | null) {
    if (!displayItems || !this._listContainerRef) {
      this._trackBox.setDisplayObjectIndexMapById({});
      return;
    }

    if (this._isSnappingMethodAdvanced && this.snap()) {
      if (!this._snapedDisplayComponent && this._snapContainerRef) {
        const comp = this._snapContainerRef.createComponent(this._itemComponentClass);
        comp.instance.regular = true;
        this._snapedDisplayComponent = comp;
        this._trackBox.snapedDisplayComponent = this._snapedDisplayComponent;
        this._resizeSnappedObserver = new ResizeObserver(this._resizeSnappedComponentHandler);
        this._resizeSnappedObserver.observe(comp.instance.element);
      }
    }

    this._trackBox.items = displayItems;

    const _listContainerRef = this._listContainerRef;

    const maxLength = displayItems.length, components = this._displayComponents;

    if (_listContainerRef) {
      while (components.length < maxLength) {
        const comp = _listContainerRef.createComponent(this._itemComponentClass);
        components.push(comp);
        this._componentsResizeObserver.observe(comp.instance.element);
      }
    }
    this.resetRenderers();
  }

  private updateRegularRenderer() {
    this._resizeSnappedComponentHandler();
  }

  private resetRenderers(itemRenderer?: TemplateRef<HTMLElement>) {
    const doMap: { [id: number]: number } = {}, components = this._displayComponents;
    for (let i = 0, l = components.length; i < l; i++) {
      const item = components[i];
      if (item) {
        const id = item.instance.id;
        item.instance.renderer = itemRenderer || this._itemRenderer();
        doMap[id] = i;
      }
    }

    if (this._isSnappingMethodAdvanced && this.snap() && this._snapedDisplayComponent && this._snapContainerRef) {
      const comp = this._snapedDisplayComponent;
      comp.instance.renderer = itemRenderer || this._itemRenderer();
    }

    this._trackBox.setDisplayObjectIndexMapById(doMap);
  }

  /**
   * Tracking by id
   */
  private tracking() {
    this._trackBox.track();
  }

  private resetBoundsSize(isVertical: boolean, totalSize: number) {
    const l = this._list(), prop = isVertical ? HEIGHT_PROP_NAME : WIDTH_PROP_NAME,
      size = totalSize;
    if (l && parseInt(l.nativeElement.style[prop]) !== size) {
      l.nativeElement.style[prop] = `${size}${PX}`;
    }
  }

  /**
   * Returns the bounds of an element with a given id
   */
  getItemBounds(id: Id): ISize | undefined {
    validateId(id);
    return this._trackBox.getItemBounds(id);
  }

  /**
   * Focus an list item by a given id.
   */
  focus(id: Id, align: FocusAlignment = FocusAlignments.NONE) {
    this._elementRef.nativeElement.focus();
    validateId(id);
    validateFocusAlignment(align);
    const el = this._list()?.nativeElement.querySelector<HTMLDivElement>(`[${ITEM_ID}="${id}"]`);
    if (el) {
      const focusedEl = el.querySelector<HTMLDivElement>(`.${ITEM_CONTAINER}`);
      if (focusedEl) {
        this._service.focus(focusedEl, align, this.scrollBehavior());
      }
    }
  }

  /**
   * The method scrolls the list to the element with the given `id` and returns the value of the scrolled area.
   */
  scrollTo(id: Id, cb?: () => void, options?: IScrollOptions) {
    const behavior = options?.behavior ?? BEHAVIOR_INSTANT,
      blending = options?.blending ?? false,
      iteration = options?.iteration ?? 0;
    validateId(id);
    validateScrollBehavior(behavior);
    validateIteration(iteration);
    const actualIteration = validateScrollIteration(iteration);
    this._$scrollTo.next({ id, behavior, blending, iteration: actualIteration, isLastIteration: actualIteration === MAX_SCROLL_TO_ITERATIONS, cb });
    this._elementRef.nativeElement.focus();
  }

  /**
   * Scrolls the scroll area to the first item in the collection.
   */
  scrollToStart(cb?: () => void, options?: IScrollOptions) {
    const scroller = this._scrollerComponent();
    if (scroller) {
      scroller.stopScrolling();
    }
    const behavior = options?.behavior ?? BEHAVIOR_INSTANT,
      blending = options?.blending ?? false,
      iteration = options?.iteration ?? 0;
    validateScrollBehavior(behavior);
    validateIteration(iteration);
    const trackBy = this.trackBy(), items = this.items(), firsItem = items.length > 0 ? items[0] : undefined, id = firsItem?.[trackBy],
      actualIteration = validateScrollIteration(iteration);
    if (!!firsItem) {
      this._$scrollTo.next({ id, behavior, blending, iteration: actualIteration, isLastIteration: actualIteration === MAX_SCROLL_TO_ITERATIONS, cb });
      this._elementRef.nativeElement.focus();
    }
  }

  /**
   * Scrolls the scroll area to the last item in the collection.
   */
  scrollToEndItem(cb?: () => void, options?: IScrollOptions) {
    const scroller = this._scrollerComponent();
    if (scroller) {
      scroller.stopScrolling();
    }
    const behavior = options?.behavior ?? BEHAVIOR_INSTANT,
      blending = options?.blending ?? false,
      iteration = options?.iteration ?? 0;
    validateScrollBehavior(behavior);
    validateIteration(iteration);
    const trackBy = this.trackBy(), items = this.items(), latItem = items[items.length > 0 ? items.length - 1 : 0], id = latItem[trackBy],
      actualIteration = validateScrollIteration(iteration);
    this._$scrollTo.next({ id, behavior, blending, iteration: actualIteration, isLastIteration: actualIteration === MAX_SCROLL_TO_ITERATIONS, cb });
    this._elementRef.nativeElement.focus();
  }

  /**
   * Scrolls the list to the end of the content height.
   */
  scrollToEnd() {
    this._isScrollFinished.set(true);
    this._trackBox.isScrollEnd = true;
    const scroller = this._scrollerComponent();
    if (scroller) {
      scroller.stopScrolling();
      const isVertical = this._isVertical, scrollSize = isVertical ? scroller.actualScrollHeight : scroller.actualScrollWidth;
      this._scrollSize.set(scrollSize);
      this._trackBox.changes();
      this._elementRef.nativeElement.focus();
    }
  }

  /**
   * Force clearing the cache.
   */
  cacheClean() {
    this._trackBox.cacheClean();
    this._collapsedItemIds.set([]);
    this._isScrollStart.set(true);
    this._isScrollFinished.set(false);
    this._totalSize.set(0);
    this._scrollSize.set(0);
    const scrollerComponent = this._scrollerComponent();
    if (scrollerComponent) {
      scrollerComponent.reset();
    }
    this._$prepared.next(false);
  }

  /**
   * Stops the list from snapping to the bottom edge.
   */
  stopSnappingScrollToEnd() {
    const scroller = this._scrollerComponent();
    this._isScrollFinished.set(false);
    this._trackBox.cancelScrollSnappingToEnd(true);
    if (scroller) {
      scroller.stopScrolling();
    }
  }

  ngOnDestroy(): void {
    this.dispose();
  }

  private dispose() {
    const updateId = this._updateId;
    if (updateId !== undefined) {
      cancelAnimationFrame(updateId);
      this._updateId = undefined;
    }

    if (this._trackBox) {
      this._trackBox.dispose();
    }

    if (this._componentsResizeObserver) {
      this._componentsResizeObserver.disconnect();
    }

    if (this._resizeSnappedObserver) {
      this._resizeSnappedObserver.disconnect();
    }

    if (this._resizeObserver) {
      this._resizeObserver.disconnect();
    }

    if (this._listResizeObserver) {
      this._listResizeObserver.disconnect();
    }

    if (this._snapedDisplayComponent) {
      this._snapedDisplayComponent.destroy();
    }

    if (this._displayComponents) {
      while (this._displayComponents.length > 0) {
        const comp = this._displayComponents.shift();
        comp?.destroy();
      }
    }
  }
}
