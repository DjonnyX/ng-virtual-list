import {
  ChangeDetectionStrategy, Component, ComponentRef, computed, DestroyRef, effect, ElementRef, inject, input,
  OnDestroy, output, Signal, signal, TemplateRef, ViewChild, viewChild, ViewContainerRef, ViewEncapsulation,
} from '@angular/core';
import { takeUntilDestroyed, toObservable } from '@angular/core/rxjs-interop';
import {
  BehaviorSubject, combineLatest, debounceTime, delay, distinctUntilChanged, filter, fromEvent, map,
  of, skip, Subject, switchMap, take, takeUntil, tap,
} from 'rxjs';
import { NgVirtualListItemComponent } from './components/list-item/ng-virtual-list-item.component';
import {
  BEHAVIOR_INSTANT, CLASS_LIST_HORIZONTAL, CLASS_LIST_VERTICAL, DEFAULT_DIRECTION, DEFAULT_DYNAMIC_SIZE, ITEM_CONTAINER,
  DEFAULT_ENABLED_BUFFER_OPTIMIZATION, DEFAULT_ITEM_SIZE, DEFAULT_BUFFER_SIZE, DEFAULT_LIST_SIZE, DEFAULT_SNAP, DEFAULT_SNAPPING_METHOD,
  HEIGHT_PROP_NAME, LEFT_PROP_NAME, MAX_SCROLL_TO_ITERATIONS, PX, FOCUS, TOP_PROP_NAME, TRACK_BY_PROPERTY_NAME, WIDTH_PROP_NAME,
  DEFAULT_MAX_BUFFER_SIZE, DEFAULT_SELECT_METHOD, DEFAULT_SELECT_BY_CLICK, DEFAULT_COLLAPSE_BY_CLICK, DEFAULT_COLLECTION_MODE,
  DEFAULT_SCREEN_READER_MESSAGE, DEFAULT_SNAP_TO_END_TRANSITION_INSTANT_OFFSET, DEFAULT_SNAP_SCROLLTO_END, MIN_PIXELS_FOR_PREVENT_SNAPPING,
  MOUSE_DOWN, TOUCH_START, DEFAULT_LANG_TEXT_DIR, DEFAULT_SCROLLBAR_THEME, DEFAULT_CLICK_DISTANCE, DEFAULT_WAIT_FOR_PREPARATION,
  DEFAULT_SCROLLBAR_MIN_SIZE, KEY_DOWN, BEHAVIOR_AUTO, DEFAULT_SCROLLBAR_ENABLED, DEFAULT_SCROLLBAR_INTERACTIVE, DEFAULT_OVERSCROLL_ENABLED,
  DEFAULT_ANIMATION_PARAMS, DEFAULT_SCROLL_BEHAVIOR, DEFAULT_SNAP_SCROLLTO_START, EMPTY_SCROLL_STATE_VERSION, MAX_REGULAR_SNAPED_COMPONENTS,
  PREPARE_ITERATIONS, PREPARATION_REUPDATE_LENGTH, READY_TO_START, WAIT_FOR_PREPARATION, ROLE_LIST_BOX, ROLE_LIST, KEY_TAB,
  MAX_VELOCITY_FOR_SCROLL_QUALITY_OPTIMIZATION_LVL1, MAX_VELOCITY_FOR_SCROLL_QUALITY_OPTIMIZATION_LVL2,
} from './const';
import {
  IRenderVirtualListItem, IScrollEvent, IScrollOptions, IVirtualListCollection, IVirtualListItem, IVirtualListItemConfigMap,
} from './models';
import { FocusAlignment, IAnimationParams, Id, IRect, ISize, ScrollBarTheme } from './types';
import { IRenderVirtualListCollection } from './models/render-collection.model';
import {
  CollectionMode, CollectionModes, Direction, Directions, FocusAlignments, MethodForSelecting, MethodsForSelecting,
  SnappingMethod, SnappingMethods, TextDirection, TextDirections,
} from './enums';
import { debounce, ScrollEvent, toggleClassName } from './utils';
import { IGetItemPositionOptions, IUpdateCollectionOptions, TrackBoxEvents, TrackBox } from './utils/track-box';
import { isSnappingMethodAdvenced } from './utils/snapping-method';
import { BaseVirtualListItemComponent } from './components/list-item/base';
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
import { PrerenderContainer } from './components/prerender-container/prerender-container.component';
import { IScrollParams } from './interfaces';
import { formatActualDisplayItems, formatScreenReaderMessage } from './utils/screen-reader-formatter';
import { validateFocusAlignment, validateId, validateIteration, validateScrollBehavior, validateScrollIteration } from './utils/list-validators';
import { getSelectorByItemId } from './utils/get-selector-by-item-id';

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
  templateUrl: './ng-virtual-list.component.html',
  styleUrl: './ng-virtual-list.component.scss',
  host: {
    'style': 'position: relative;'
  },
  standalone: false,
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

  private _prerender = viewChild<PrerenderContainer>('prerender');

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
  onItemClick = output<IRenderVirtualListItem<any> | null>();

  /**
   * Fires when elements are selected.
   */
  onSelect = output<Array<Id> | Id | null>();

  /**
   * Fires when elements are collapsed.
   */
  onCollapse = output<Array<Id> | Id | null>();

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
      let valid = validateArray(v, true, true);
      if (valid) {
        if (v) {
          const trackBy = this.trackBy();
          for (let i = 0, l = v.length; i < l; i++) {
            const item = v[i];
            valid = validateObject(item, true, true);
            if (valid) {
              if (item && !(validateFloat(item?.[trackBy] as number, true) || validateString(item?.[trackBy] as string, true, true))) {
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
      let valid = validateArray(v as any, true, true) || validateString(v as any, true, true) || validateFloat(v as any, true);
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
        console.error('The "selectedIds" parameter must be of type `Array<Id> | Id` or `null`.');
        return this._isMultiSelecting ? [] : undefined;
      }
      return v;
    },
  } as any;

  defaultItemValue = input<IVirtualListItem | null>(null);

  /**
   * Sets the selected items.
   */
  selectedIds = input<Array<Id> | Id | null>(null, { ...this._selectedIdsOptions });

  private _collapsedIdsOptions = {
    transform: (v: Array<Id>) => {
      let valid = validateArray(v as any, true, true);
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

  private _snapScrollToStartOptions = {
    transform: (v: boolean) => {
      const valid = validateBoolean(v, true);

      if (!valid) {
        console.error('The "snapScrollToStart" parameter must be of type `boolean`.');
        return DEFAULT_SNAP_SCROLLTO_START;
      }
      return v;
    },
  } as any;

  /**
   * Determines whether the scroll will be anchored to the start of the list. Default value is "true".
   * This property takes precedence over the snapScrollToEnd property.
   * That is, if snapScrollToStart and snapScrollToEnd are enabled, the list will initially snap 
   * to the beginning; if you move the scroll bar to the end, the list will snap to the end. 
   * If snapScrollToStart is disabled and snapScrollToEnd is enabled, the list will snap to the end; 
   * if you move the scroll bar to the beginning, the list will snap to the beginning. 
   * If both snapScrollToStart and snapScrollToEnd are disabled, the list will never snap to the beginning or end.
   */
  snapScrollToStart = input<boolean>(DEFAULT_SNAP_SCROLLTO_START, { ...this._snapScrollToStartOptions });

  private _snapScrollToEndOptions = {
    transform: (v: boolean) => {
      const valid = validateBoolean(v, true);

      if (!valid) {
        console.error('The "snapScrollToEnd" parameter must be of type `boolean`.');
        return DEFAULT_SNAP_SCROLLTO_END;
      }
      return v;
    },
  } as any;

  /**
   * Determines whether the scroll will be anchored to the утв of the list. Default value is "true".
   * That is, if snapScrollToStart and snapScrollToEnd are enabled, the list will initially snap 
   * to the beginning; if you move the scroll bar to the end, the list will snap to the end. 
   * If snapScrollToStart is disabled and snapScrollToEnd is enabled, the list will snap to the end; 
   * if you move the scroll bar to the beginning, the list will snap to the beginning. 
   * If both snapScrollToStart and snapScrollToEnd are disabled, the list will never snap to the beginning or end.
   */
  snapScrollToEnd = input<boolean>(DEFAULT_SNAP_SCROLLTO_END, { ...this._snapScrollToEndOptions });

  private _snapScrollToBottomOptions = {
    transform: () => {
      throw Error('The stopSnappingScrollToEnd property is deprecated. Use the snapScrollToEnd property.');
    },
  } as any;

  /**
   * @deprecated
   * The stopSnappingScrollToEnd property is deprecated. Use the snapScrollToEnd property.
   */
  snapScrollToBottom = input<boolean>('deprecated' as any, { ...this._snapScrollToBottomOptions });

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
      const valid = validateString(v, true, true);

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
      const valid = validateObject(v, true, true);

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
   * If the dynamicSize property is true, the items in the list can have different sizes, and you must specify the itemSize property 
   * to adjust the sizes of the items in the unallocated area.
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
   * If true, items in the list may have different sizes, and the itemSize property must be specified to adjust
   * the sizes of items in the unallocated area.
   * If false then the items in the list have a fixed size specified by the itemSize property. The default value is true.
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
      const valid = validateString(v) && (v === SnappingMethods.NORMAL || v === SnappingMethods.ADVANCED || v === SnappingMethods.STANDART);
      if (!valid) {
        console.error(`The "snappingMethod" parameter must have the value '${SnappingMethods.NORMAL}', '${SnappingMethods.ADVANCED}' or '${SnappingMethods.STANDART}'.`);
        return DEFAULT_SNAPPING_METHOD;
      }
      return v;
    },
  } as any;

  /**
   * Snapping method. Default value is 'standart'.
   * STANDART - The group is rendered on a background.
   */
  snappingMethod = input<SnappingMethod>(DEFAULT_SNAPPING_METHOD, { ...this._snappingMethodOptions });

  private _methodForSelectingOptions = {
    transform: (v: MethodForSelecting) => {
      const valid = validateString(v) && (v === 'none' || v === 'select' || v === 'multi-select');
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

  protected readonly screenReaderFormattedMessage = signal<string>(this.screenReaderMessage());

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

  private _isNotSelecting = this.getIsNotSelecting();

  private _isSingleSelecting = this.getIsSingleSelecting();

  private _isMultiSelecting = this.getIsMultiSelecting();

  private _isSnappingMethodAdvanced: boolean = this.getIsSnappingMethodAdvanced();

  private _isVertical = this.getIsVertical();
  protected get isVertical() {
    return this._isVertical;
  }

  protected readonly focusedElement = signal<Id | null>(null);

  protected readonly classes = signal<{ [cName: string]: boolean }>({});

  private _actualItems = signal<IVirtualListCollection>([]);

  private _collapsedItemIds = signal<Array<Id>>([]);

  private _displayComponents: Array<ComponentRef<BaseVirtualListItemComponent>> = [];

  private _snapedDisplayComponents: Array<ComponentRef<BaseVirtualListItemComponent>> = [];

  private _bounds = signal<IRect | null>(null);
  protected get bounds() { return this._bounds; }

  private _totalSize = signal<number>(0);

  private _listBounds = signal<IRect | null>(null);

  private _scrollSize = signal<number>(0);

  private _isScrollStart = signal<boolean>(true);

  private _isScrollEnd = signal<boolean>(false);

  private _resizeObserver: ResizeObserver | null = null;

  private _listResizeObserver: ResizeObserver | null = null;

  private _resizeSnappedComponentHandler = () => {
    const list = this._list(), scroller = this._scroller(), bounds = this._bounds(), snappedComponents = this._snapedDisplayComponents;
    if (list && scroller && snappedComponents.length > 0) {
      const isVertical = this._isVertical, listBounds = list.nativeElement.getBoundingClientRect();/*, listElement = list?.nativeElement,
        { width: lWidth, height: lHeight } = listElement?.getBoundingClientRect() ?? { width: 0, height: 0 },
        { width, height } = bounds ?? { width: 0, height: 0 },
        isScrollable = isVertical ? scroller.nativeElement.scrollHeight > 0 : scroller.nativeElement.scrollWidth > 0*/;

      // const langTextDir = this.langTextDir();

      // const snappingMethod = this.snappingMethod();
      // if (snappingMethod === SnappingMethods.NORMAL || snappingMethod === SnappingMethods.ADVANCED) {
      //   // snappedComponent.element.style.clipPath = `path("M 0 0 L 0 ${snappedComponent.element.offsetHeight} L ${snappedComponent.element.offsetWidth} ${snappedComponent.element.offsetHeight} L ${snappedComponent.element.offsetWidth} 0 Z")`;
      // }

      for (const comp of snappedComponents) {
        if (!!comp) {
          comp.instance.regularLength = `${isVertical ? listBounds.width : listBounds.height}${PX}`;
        }
      }
      // const { width: sWidth, height: sHeight } = snappedComponent.getBounds() ?? { width: 0, height: 0 },
      //   scrollerElement = scroller.nativeElement, delta = snappedComponent.item?.measures.delta ?? 0;

      // let left: number, right: number, top: number, bottom: number;
      // if (isVertical) {
      //   left = 0;
      //   right = width - scrollBarSize;
      //   top = sHeight;
      //   bottom = height;
      //   if (snappingMethod === SnappingMethods.NORMAL || snappingMethod === SnappingMethods.ADVANCED) {
      //     if (langTextDir === TextDirections.RTL) {
      //       scrollerElement.style.clipPath = `path("M 0 0 L 0 ${height} L ${width} ${height} L ${width} ${top + delta} L ${scrollBarSize} ${top + delta} L ${scrollBarSize} 0 Z")`;
      //     } else {
      //       scrollerElement.style.clipPath = `path("M 0 ${top + delta} L 0 ${height} L ${width} ${height} L ${width} 0 L ${right} 0 L ${right} ${top + delta} Z")`;
      //     }
      //   }
      // } else {
      //   left = sWidth;
      //   right = width;
      //   top = 0;
      //   bottom = height - scrollBarSize;
      //   if (snappingMethod === SnappingMethods.NORMAL || snappingMethod === SnappingMethods.ADVANCED) {
      //     scrollerElement.style.clipPath = `path("M ${width} 0 L ${width} ${bottom} L 0 ${bottom} L 0 0 L ${width} 0 Z")`;
      //   }
      // }
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

    const scroller = this._scrollerComponent();
    if (!!scroller) {
      const updatebale = this._readyToShow;
      scroller.refresh(updatebale, updatebale);
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
    if (!this._readyToShow) {
      return;
    }
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

        this._trackBox.preventScrollSnapping(true);
        const params: IScrollToParams = {
          [this._isVertical ? TOP_PROP_NAME : LEFT_PROP_NAME]: pos, behavior,
          fireUpdate: true, blending: true, userAction: true, duration: this.animationParams().navigateToItem,
        };
        scroller.refresh(false);
        scroller.scrollTo(params);
      }
    }
  }

  private _elementRef = inject<ElementRef<HTMLElement>>(ElementRef);

  /**
   * Base class of the element component
   */
  private _itemComponentClass: Component$1<BaseVirtualListItemComponent> = NgVirtualListItemComponent;
  protected get itemComponentClass() { return this._itemComponentClass; }

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

  private _$update = new Subject<string>();
  protected readonly $update = this._$update.asObservable();

  private _$scrollTo = new Subject<IScrollParams>();
  protected $scrollTo = this._$scrollTo.asObservable();

  private _$scrollToExecutor = new Subject<IScrollParams>();
  protected readonly $scrollToExecutor = this._$scrollToExecutor.asObservable();

  private _$scrollingTo = new BehaviorSubject<boolean>(false);

  private _$scroll = new Subject<IScrollEvent>();
  readonly $scroll = this._$scroll.asObservable();

  private _$fireUpdate = new Subject<boolean>();
  protected readonly $fireUpdate = this._$fireUpdate.asObservable();

  private _$fireUpdateNextFrame = new Subject<boolean>();
  protected readonly $fireUpdateNextFrame = this._$fireUpdateNextFrame.asObservable();

  private _$preventScrollSnapping = new BehaviorSubject<boolean>(false);
  protected readonly $preventScrollSnapping = this._$preventScrollSnapping.asObservable();

  private _destroyRef = inject(DestroyRef);

  private _updateId: number | undefined;

  private _scrollStateUpdateIndex: number = 0;

  private _readyToShow = false;

  private _isUserScrolling = false;

  private _prevScrollStateVersion = EMPTY_SCROLL_STATE_VERSION;

  private _updateIterations = 0;

  private _cached = false;

  protected get cachable() {
    return this._prerender()?.active ?? false;
  }

  protected get prerenderable() {
    return this.dynamicSize() && (this._trackBox?.isSnappedToEnd ?? false);
  }

  private _$viewInit = new BehaviorSubject<boolean>(false);
  private readonly $viewInit = this._$viewInit.asObservable();

  private _$destroy = new Subject<void>();
  private readonly $destroy = this._$destroy.asObservable();

  protected getScrollStateVersion(totalSize: number, scrollSize: number, cacheVersion: number): string {
    if (totalSize === -1) {
      return EMPTY_SCROLL_STATE_VERSION;
    }
    if (totalSize < scrollSize) {
      this._scrollStateUpdateIndex = this._scrollStateUpdateIndex === Number.MAX_SAFE_INTEGER ? 0 : this._scrollStateUpdateIndex + 1;
    }
    return `${this._scrollStateUpdateIndex}_${totalSize}_${scrollSize}_${cacheVersion}`;
  };

  constructor() {
    NgVirtualListComponent.__nextId = NgVirtualListComponent.__nextId + 1 === Number.MAX_SAFE_INTEGER
      ? 0 : NgVirtualListComponent.__nextId + 1;
    this._id = NgVirtualListComponent.__nextId;

    this._service.initialize(this._id, this._trackBox);
    this._service.itemToFocus = this.itemToFocus;

    this._trackBox.displayComponents = this._displayComponents;

    let hasUserAction = false, hasScrollbarUserAction = false;

    const $scrollbarTheme = toObservable(this.scrollbarTheme);
    $scrollbarTheme.pipe(
      takeUntilDestroyed(),
      filter(v => !!v),
      tap(theme => {
        const { thickness = 0 } = theme;
        this._service.scrollBarSize = thickness;
      }),
    ).subscribe();

    this.$fireUpdateNextFrame.pipe(
      takeUntilDestroyed(),
      debounceTime(0),
      tap(userAction => {
        this._$fireUpdate.next(userAction);
      }),
    ).subscribe();

    const $scrollToItem = this.$scrollTo.pipe(takeUntilDestroyed()),
      $mouseDown = fromEvent(this._elementRef.nativeElement, MOUSE_DOWN).pipe(takeUntilDestroyed()),
      $touchStart = fromEvent(this._elementRef.nativeElement, TOUCH_START).pipe(takeUntilDestroyed());

    fromEvent<KeyboardEvent>(document, KEY_DOWN).pipe(
      takeUntilDestroyed(),
      filter(e => e.key === KEY_TAB),
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
        );
      }),
    ).subscribe();

    this._service.$scrollToStart.pipe(
      takeUntilDestroyed(),
      tap(options => {
        this.scrollToStart(null, options);
      }),
    ).subscribe();

    this._service.$scrollToEnd.pipe(
      takeUntilDestroyed(),
      tap(options => {
        this.scrollToEnd(null, options);
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

    const $viewInit = this.$viewInit,
      $prerenderContainer = toObservable(this._prerender);

    const $prerender = $viewInit.pipe(
      takeUntilDestroyed(),
      filter(v => !!v),
      switchMap(v => {
        return $prerenderContainer.pipe(
          takeUntilDestroyed(this._destroyRef),
          filter(v => !!v),
          switchMap(v => v.$render),
        );
      }),
    );

    const $fireUpdate = this.$fireUpdate;
    $fireUpdate.pipe(
      takeUntilDestroyed(),
      tap(userAction => {
        hasUserAction = userAction;
      }),
    ).subscribe();

    const $update = this.$update;
    const $updateComplete = $update.pipe(
      takeUntilDestroyed(),
      debounceTime(0),
      switchMap((v) => {
        if (((this._prevScrollStateVersion === EMPTY_SCROLL_STATE_VERSION) || (this._prevScrollStateVersion !== v)) &&
          (this._updateIterations < PREPARE_ITERATIONS)) {
          if (v !== EMPTY_SCROLL_STATE_VERSION) {
            this._prevScrollStateVersion = v;
          }
          this._$fireUpdate.next(false);
          return of(false);
        }
        if (this._prevScrollStateVersion === v) {
          if (this._updateIterations < PREPARATION_REUPDATE_LENGTH) {
            this._updateIterations++;
            this._$fireUpdate.next(false);
            return of(false);
          }
        }
        this._prevScrollStateVersion = v;
        return of(true);
      }),
      filter(v => !!v),
      distinctUntilChanged(),
    ),
      $items = toObservable(this.items),
      $dynamicSize = toObservable(this.dynamicSize),
      $snapScrollToStart = toObservable(this.snapScrollToStart),
      $snapScrollToEnd = toObservable(this.snapScrollToEnd),
      $waitForPreparation = toObservable(this.waitForPreparation);

    combineLatest([$viewInit, $prerenderContainer, $dynamicSize, $snapScrollToStart, $snapScrollToEnd, $waitForPreparation]).pipe(
      takeUntilDestroyed(this._destroyRef),
      distinctUntilChanged(),
      filter(([init, prerenderContainer]) => !!init && !!prerenderContainer),
      delay(0),
      switchMap(([, prerenderContainer, dynamicSize, snapScrollToStart, snapScrollToEnd, waitForPreparation]) => {
        if (!!dynamicSize && !snapScrollToStart && !!snapScrollToEnd && !!waitForPreparation) {
          prerenderContainer!.on();
          this._$show.next(false);
          this.cacheClean();
          this._readyToShow = this._isUserScrolling = false;
          const scrollerComponent = this._scrollerComponent();
          if (scrollerComponent) {
            scrollerComponent.prepared = false;
            scrollerComponent.stopScrolling();
          }
          this.classes.set({ prepared: false, [READY_TO_START]: false, [WAIT_FOR_PREPARATION]: false });
          return $items.pipe(
            takeUntilDestroyed(this._destroyRef),
            tap(items => {
              if (!items || items.length === 0) {
                this.cacheClean();
                this._readyToShow = this._isUserScrolling = false;
                if (snapScrollToEnd) {
                  this._trackBox.isScrollEnd = true;
                }
                this._updateIterations = 0;
                this._prevScrollStateVersion = EMPTY_SCROLL_STATE_VERSION;
                const scrollerComponent = this._scrollerComponent();
                if (scrollerComponent) {
                  scrollerComponent.prepared = false;
                  scrollerComponent.stopScrolling();
                }
                this.classes.set({ prepared: false, [READY_TO_START]: false, [WAIT_FOR_PREPARATION]: false });
                this._$show.next(false);
              }
            }),
            tap(items => {
              this._trackBox.resetCollection(items, this.itemSize());
            }),
            switchMap(i => of((i ?? []).length > 0)),
            distinctUntilChanged(),
            switchMap(v => {
              if (!v) {
                if (this.prerenderable) {
                  prerenderContainer!.off();
                }
                return of(false);
              }
              const waitForPreparation = this.waitForPreparation();
              if (waitForPreparation) {
                if (this.prerenderable) {
                  prerenderContainer!.on();
                }
                this._$fireUpdateNextFrame.next(false);
                return $updateComplete.pipe(
                  takeUntilDestroyed(this._destroyRef),
                  take(1),
                  tap(() => {
                    if (this.prerenderable) {
                      prerenderContainer!.off();
                    }
                    this._readyToShow = true;
                    const waitForPreparation = this.waitForPreparation(), scrollerComponent = this._scrollerComponent();
                    if (scrollerComponent) {
                      scrollerComponent.prepared = true;
                    }
                    this.classes.set({ prepared: true, [READY_TO_START]: true, [WAIT_FOR_PREPARATION]: waitForPreparation });
                    this._$show.next(true);
                  }),
                );
              }
              if (this.prerenderable) {
                prerenderContainer!.off();
              }
              this._readyToShow = true;
              const scrollerComponent = this._scrollerComponent();
              if (scrollerComponent) {
                scrollerComponent.prepared = true;
              }
              this.classes.set({ prepared: true, [READY_TO_START]: true, [WAIT_FOR_PREPARATION]: waitForPreparation });
              this._$show.next(true);
              return of(false);
            }),
          );
        } else {
          prerenderContainer!.off();
          return $items.pipe(
            takeUntilDestroyed(this._destroyRef),
            tap(items => {
              if (!items || items.length === 0) {
                this.cacheClean();
                const scrollerComponent = this._scrollerComponent();
                if (scrollerComponent) {
                  scrollerComponent.prepared = false;
                }
                this.classes.set({ prepared: false, [READY_TO_START]: false, [WAIT_FOR_PREPARATION]: false });
                this._$show.next(false);
              }
              this._trackBox.resetCollection(items, this.itemSize());
            }),
            switchMap(i => of((i ?? []).length > 0)),
            distinctUntilChanged(),
            filter(v => !!v),
            tap(() => {
              this._readyToShow = true;
              if (snapScrollToStart) {
                this._trackBox.isScrollStart = true;
              } else if (snapScrollToEnd) {
                this._trackBox.isScrollEnd = true;
              }
              const scrollerComponent = this._scrollerComponent();
              if (scrollerComponent) {
                scrollerComponent.prepared = true;
              }
              this.classes.set({ prepared: true, [READY_TO_START]: true, [WAIT_FOR_PREPARATION]: true });
              this._$show.next(true);
              this._$fireUpdate.next(false);
            }),
          );
        }
      }),
    ).subscribe();

    combineLatest([$dynamicSize, $snapScrollToStart, $snapScrollToEnd]).pipe(
      takeUntilDestroyed(),
      filter(([dynamicSize, snapScrollToStart, snapScrollToEnd]) => !!dynamicSize && !snapScrollToStart && !!snapScrollToEnd),
      switchMap(() => {
        return $items.pipe(
          takeUntilDestroyed(this._destroyRef),
          tap(() => {
            this._cached = false;
          }),
          switchMap(() => {
            return $prerender.pipe(
              takeUntilDestroyed(this._destroyRef),
              take(1),
              tap(cache => {
                if (!this._readyToShow) {
                  this._cached = true;
                  this._trackBox.refreshCache(cache);
                }
              }),
            );
          }),
        );
      }),
    ).subscribe();

    this._service.$focusedId.pipe(
      takeUntilDestroyed(),
      tap(v => {
        this.focusedElement.set(v ?? null);
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
      $trackBy = toObservable(this.trackBy),
      $selectByClick = toObservable(this.selectByClick),
      $collapseByClick = toObservable(this.collapseByClick),
      $isScrollStart = toObservable(this._isScrollStart),
      $isScrollFinished = toObservable(this._isScrollEnd),
      $scrollStartOffset = toObservable(this.scrollStartOffset),
      $scrollEndOffset = toObservable(this.scrollEndOffset),
      $isVertical = toObservable(this.direction).pipe(
        map(v => this.getIsVertical(v || DEFAULT_DIRECTION)),
      );

    $snapScrollToStart.pipe(
      takeUntilDestroyed(),
      tap(v => {
        this._service.snapScrollToStart = v;
      }),
    ).subscribe();

    $snapScrollToEnd.pipe(
      takeUntilDestroyed(),
      tap(v => {
        this._service.snapScrollToEnd = v;
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

    $isScrollStart.pipe(
      takeUntilDestroyed(),
      skip(1),
      distinctUntilChanged(),
      debounceTime(0),
      filter(v => !!v && this._readyToShow),
      tap(() => {
        if (this._scrollerComponent()?.scrollable) {
          this.onScrollReachStart.emit();
        }
      }),
    ).subscribe();

    $isScrollFinished.pipe(
      takeUntilDestroyed(),
      skip(1),
      distinctUntilChanged(),
      debounceTime(0),
      filter(v => !!v && this._readyToShow),
      tap(v => {
        if (this._scrollerComponent()?.scrollable) {
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
      $actualItems = toObservable(this._actualItems).pipe(
        takeUntilDestroyed(),
        distinctUntilChanged(),
        debounceTime(0),
      ),
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

    const $itemsComposition = $items.pipe(
      takeUntilDestroyed(),
      distinctUntilChanged(),
      switchMap(items => {
        return combineLatest([$collapsedItemIds, $itemConfigMap, $trackBy]).pipe(
          takeUntilDestroyed(this._destroyRef),
          debounceTime(0),
          switchMap(([collapsedIds, itemConfigMap, trackBy]) => {
            return of({ items, collapsedIds, itemConfigMap, trackBy });
          }),
        );
      }),
    );

    $itemsComposition.pipe(
      takeUntilDestroyed(),
      switchMap(({ items, collapsedIds, itemConfigMap, trackBy }) => {
        if (items.length === 0 || !this._readyToShow || !(this.cachable && !this._cached &&
          !this._trackBox.isSnappedToStart && this._trackBox.isSnappedToEnd)) {
          return of({ items, collapsedIds, itemConfigMap, trackBy });
        }
        this._updateIterations = 0;
        this._prevScrollStateVersion = EMPTY_SCROLL_STATE_VERSION;
        this._$fireUpdateNextFrame.next(false);
        return $updateComplete.pipe(
          takeUntilDestroyed(this._destroyRef),
          take(1),
          debounceTime(0),
          switchMap(() => {
            return of({ items, collapsedIds, itemConfigMap, trackBy });
          }),
        );
      }),
      tap(({ items, collapsedIds, itemConfigMap, trackBy }) => {
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

    const $preventScrollSnapping = this.$preventScrollSnapping;

    $preventScrollSnapping.pipe(
      takeUntilDestroyed(),
      filter(v => !!v),
      tap((v) => {
        if (this._readyToShow) {
          this._trackBox.isScrollStart = this._trackBox.isScrollEnd = false;
          this._isScrollStart.set(false);
          this._isScrollEnd.set(false);
          const scroller = this._scrollerComponent();
          if (scroller) {
            this._trackBox.preventScrollSnapping(true);
          }
        }
      }),
      tap(() => {
        if (this._readyToShow && this.prerenderable) {
          this._$preventScrollSnapping.next(false);
        }
      }),
    ).subscribe();

    const snappingHandler = (delta: number) => {
      const scroller = this._scrollerComponent();
      if (!!scroller) {
        const isVertical = this.isVertical, loading = this.loading(),
          maxScrollSize = Math.round(isVertical ? scroller.scrollHeight ?? 0 : scroller.scrollWidth ?? 0),
          scrollSize = isVertical ? scroller.scrollTop ?? 0 : scroller.scrollLeft ?? 0,
          actualScrollSize = Math.round(scrollSize + delta);
        if (this._readyToShow && !loading) {
          if (maxScrollSize >= 0) {
            const isScrollStart = actualScrollSize <= MIN_PIXELS_FOR_PREVENT_SNAPPING;
            if (isScrollStart) {
              this._trackBox.isScrollStart = true;
              this._isScrollStart.set(true);
              this._trackBox.isScrollEnd = false;
              this._isScrollEnd.set(false);
            } else {
              const isScrollEnd = actualScrollSize >= (maxScrollSize - MIN_PIXELS_FOR_PREVENT_SNAPPING);
              this._trackBox.isScrollStart = false;
              this._isScrollStart.set(false);
              this._trackBox.isScrollEnd = isScrollEnd;
              this._isScrollEnd.set(isScrollEnd);
            }
          }
        }
      }
    };

    const update = (params: {
      snapScrollToStart: boolean, snapScrollToEnd: boolean; bounds: IRect; listBounds: IRect; scrollEndOffset: number;
      items: IVirtualListCollection<Object>; itemConfigMap: IVirtualListItemConfigMap; scrollSize: number; itemSize: number;
      bufferSize: number; maxBufferSize: number; snap: boolean; isVertical: boolean; dynamicSize: boolean;
      enabledBufferOptimization: boolean; cacheVersion: number; userAction: boolean;
    }, optimization: boolean = false) => {
      const {
        snapScrollToStart, snapScrollToEnd, bounds, listBounds, scrollEndOffset, items, itemConfigMap, scrollSize, itemSize,
        bufferSize, maxBufferSize, snap, isVertical, dynamicSize, enabledBufferOptimization, cacheVersion, userAction,
      } = params;

      const scroller = this._scrollerComponent();
      let totalSize = -1;
      if (scroller) {
        const emitUpdate = !this._readyToShow || (this.cachable && !this._cached),
          currentScrollSize = (isVertical ? scroller.scrollTop ?? 0 : scroller.scrollLeft ?? 0),
          fireUpdate = emitUpdate || (!optimization && !userAction) || this._$scrollingTo.getValue();
        let actualScrollSize = !this._readyToShow && snapScrollToEnd ? (isVertical ? scroller.scrollHeight ?? 0 : scroller.scrollWidth ?? 0) :
          (isVertical ? scroller.scrollTop ?? 0 : scroller.scrollLeft ?? 0),
          displayItems: IRenderVirtualListCollection;

        const { width, height, x, y } = bounds, viewportSize = (isVertical ? height : width);

        let maxScrollSize = Math.round(this._totalSize()) ?? 0,
          actualScrollLength = Math.round(maxScrollSize === 0 ? 0 : maxScrollSize > viewportSize ? maxScrollSize - viewportSize : maxScrollSize),
          roundedMaxPosition = Math.round(actualScrollLength),
          scrollPosition = Math.round(actualScrollSize);

        const opts: IUpdateCollectionOptions<IVirtualListItem, IVirtualListCollection> = {
          bounds: { width, height, x, y }, dynamicSize, isVertical, itemSize,
          bufferSize, maxBufferSize, scrollSize: actualScrollSize, snap, enabledBufferOptimization,
        };

        if (snapScrollToEnd && !this._readyToShow) {
          const { displayItems: calculatedDisplayItems, totalSize: calculatedTotalSize1 } =
            this._trackBox.updateCollection(items, itemConfigMap, { ...opts, scrollSize: actualScrollSize });
          displayItems = calculatedDisplayItems;
          totalSize = calculatedTotalSize1;
          maxScrollSize = Math.round(totalSize) ?? 0;
          actualScrollLength = Math.round(maxScrollSize === 0 ? 0 : maxScrollSize > viewportSize ? maxScrollSize - viewportSize : maxScrollSize);
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

        const delta = this._trackBox.delta,
          scrollPositionAfterUpdate = Math.round(actualScrollSize + delta),
          roundedScrollPositionAfterUpdate = Math.round(scrollPositionAfterUpdate),
          roundedMaxPositionAfterUpdate = Math.round(totalSize - viewportSize);

        if (this._isSnappingMethodAdvanced) {
          this.updateRegularRenderer();
        }

        scroller.delta = delta;

        this._trackBox.clearDelta();

        snappingHandler(delta);

        if ((snapScrollToStart && this._trackBox.isSnappedToStart) ||
          (snapScrollToStart && currentScrollSize <= MIN_PIXELS_FOR_PREVENT_SNAPPING)) {
          if (currentScrollSize !== roundedScrollPositionAfterUpdate) {
            if (this._readyToShow) {
              this.emitScrollEvent(true, false, userAction);
            }
            const params: IScrollToParams = {
              [isVertical ? TOP_PROP_NAME : LEFT_PROP_NAME]: 0, userAction,
              fireUpdate, behavior: BEHAVIOR_INSTANT, useLimits: optimization,
              blending: false, duration: this.animationParams().scrollToItem,
            };
            scroller?.scrollTo?.(params);
            if (emitUpdate) {
              this._$update.next(this.getScrollStateVersion(totalSize, this._isVertical ? scroller.scrollTop : scroller.scrollLeft, cacheVersion));
            }
          }
          return;
        }

        if ((snapScrollToEnd && this._trackBox.isSnappedToEnd) ||
          (snapScrollToEnd && scrollPositionAfterUpdate > 0 &&
            ((roundedScrollPositionAfterUpdate >= scrollPositionAfterUpdate + MIN_PIXELS_FOR_PREVENT_SNAPPING) &&
              (scrollPositionAfterUpdate + MIN_PIXELS_FOR_PREVENT_SNAPPING >= roundedMaxPositionAfterUpdate)))) {
          if (!this._readyToShow || currentScrollSize !== roundedMaxPositionAfterUpdate) {
            if (this._readyToShow) {
              this.emitScrollEvent(true, false, userAction);
            }
            const params: IScrollToParams = {
              [isVertical ? TOP_PROP_NAME : LEFT_PROP_NAME]: roundedMaxPositionAfterUpdate,
              fireUpdate, behavior: BEHAVIOR_INSTANT, userAction, useLimits: optimization,
              blending: false, duration: this.animationParams().scrollToItem,
            };
            scroller?.scrollTo?.(params);
            if (emitUpdate) {
              this._$update.next(this.getScrollStateVersion(totalSize, this._isVertical ? scroller.scrollTop : scroller.scrollLeft, cacheVersion));
            }
          }
          return;
        }

        if (scrollPositionAfterUpdate >= 0 && scrollPositionAfterUpdate < roundedMaxPositionAfterUpdate) {
          if (currentScrollSize !== scrollPositionAfterUpdate) {
            if (this._readyToShow) {
              this.emitScrollEvent(true, false, userAction);
            }
            const params: IScrollToParams = {
              [isVertical ? TOP_PROP_NAME : LEFT_PROP_NAME]: scrollPositionAfterUpdate, blending: true, userAction,
              fireUpdate, behavior: BEHAVIOR_INSTANT, duration: this.animationParams().scrollToItem, useLimits: optimization
            };
            scroller.scrollTo(params);
            if (emitUpdate) {
              this._$update.next(this.getScrollStateVersion(totalSize, this._isVertical ? scroller.scrollTop : scroller.scrollLeft, cacheVersion));
            }
          }
          return;
        }
        if (emitUpdate) {
          this._$update.next(this.getScrollStateVersion(totalSize, this._isVertical ? scroller.scrollTop : scroller.scrollLeft, cacheVersion));
        }
      }
    };

    const debouncedUpdate = debounce(update, 0);
    $viewInit.pipe(
      takeUntilDestroyed(),
      filter(v => !!v),
      switchMap(() => {
        return combineLatest([$snapScrollToStart, $snapScrollToEnd, $bounds, $listBounds, $scrollEndOffset, $actualItems, $itemConfigMap, $scrollSize, $itemSize,
          $bufferSize, $maxBufferSize, $snap, $isVertical, $dynamicSize, $enabledBufferOptimization, $cacheVersion, this.$fireUpdate,
        ]).pipe(
          takeUntilDestroyed(this._destroyRef),
          tap(([
            snapScrollToStart, snapScrollToEnd, bounds, listBounds, scrollEndOffset, items, itemConfigMap, scrollSize, itemSize,
            bufferSize, maxBufferSize, snap, isVertical, dynamicSize, enabledBufferOptimization, cacheVersion,
          ]) => {
            const scroller = this._scrollerComponent(), velocity = this._scrollerComponent()?.averageVelocity ?? 0,
              maxScrollSize = isVertical ? (scroller?.scrollHeight || 0) : (scroller?.scrollWidth ?? 0),
              isEdges = scrollSize === 0 || scrollSize === maxScrollSize, isScrolling = this._$scrollingTo.getValue(),
              useDebouncedUpdate = dynamicSize && hasUserAction && !isScrolling && (velocity > 0 && velocity < MAX_VELOCITY_FOR_SCROLL_QUALITY_OPTIMIZATION_LVL1),
              rerenderOptimization = dynamicSize && (hasUserAction || hasScrollbarUserAction) && !isEdges && velocity > 0 &&
                (velocity > MAX_VELOCITY_FOR_SCROLL_QUALITY_OPTIMIZATION_LVL2 || hasUserAction);
            if (useDebouncedUpdate) {
              debouncedUpdate.execute({
                snapScrollToStart, snapScrollToEnd, bounds, listBounds, scrollEndOffset, items, itemConfigMap, scrollSize, itemSize,
                bufferSize, maxBufferSize, snap, isVertical, dynamicSize, enabledBufferOptimization, cacheVersion, userAction: hasUserAction,
              }, rerenderOptimization);
              return;
            }
            if (!debouncedUpdate.getIsDisposed()) {
              debouncedUpdate.dispose();
            }
            update({
              snapScrollToStart, snapScrollToEnd, bounds, listBounds, scrollEndOffset, items, itemConfigMap, scrollSize, itemSize,
              bufferSize, maxBufferSize, snap, isVertical, dynamicSize, enabledBufferOptimization, cacheVersion, userAction: hasUserAction,
            }, isScrolling || rerenderOptimization);
          }),
        );
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
      $scrollbarScroll = toObservable(this._scrollerComponent).pipe(
        takeUntilDestroyed(),
        filter(v => !!v),
        take(1),
        switchMap(scroller => scroller.$scrollbarScroll),
      ),
      $list = toObservable(this._list).pipe(
        takeUntilDestroyed(),
        filter(v => !!v),
        map(v => v.nativeElement),
        take(1),
      );

    const scrollHandler = (userAction: boolean = false) => {
      const scroller = this._scrollerComponent();
      if (!!scroller) {
        const isVertical = this._isVertical, bounds = this._bounds(), listBounds = this._listBounds(),
          scrollSize = (isVertical ? scroller.scrollTop : scroller.scrollLeft),
          maxScrollSize = isVertical ? (listBounds?.height ?? 0) - (bounds?.height ?? 0) : (listBounds?.width ?? 0) - (bounds?.width ?? 0),
          actualScrollSize = scrollSize;

        if (this._readyToShow) {
          if (userAction) {
            if (this._trackBox.isSnappedToStart) {
              if (scrollSize > MIN_PIXELS_FOR_PREVENT_SNAPPING) {
                this._$preventScrollSnapping.next(true);
              }
            }
            if (this._trackBox.isSnappedToEnd) {
              if (scrollSize < (maxScrollSize - MIN_PIXELS_FOR_PREVENT_SNAPPING)) {
                this._$preventScrollSnapping.next(true);
              }
            }
          }
        }

        this._scrollSize.set(actualScrollSize);
      }
    };

    $scroller.pipe(
      takeUntilDestroyed(),
      distinctUntilChanged(),
      switchMap(scroller => {
        return $scrollbarScroll.pipe(
          takeUntilDestroyed(this._destroyRef),
          tap(userAction => {
            hasScrollbarUserAction = userAction;
            const scrollerEl = this._scroller()?.nativeElement, scrollerComponent = this._scrollerComponent();
            if (scrollerEl && scrollerComponent) {
              this.emitScrollEvent(false, this._readyToShow, hasUserAction);
            }
            if (this._readyToShow) {
              if (userAction) {
                if (this._trackBox.isSnappedToStart) {
                  this._$preventScrollSnapping.next(true);
                }
                if (this._trackBox.isSnappedToEnd) {
                  this._$preventScrollSnapping.next(true);
                }
              }
            }
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
        hasUserAction = userAction;
        const scrollerEl = this._scroller()?.nativeElement, scrollerComponent = this._scrollerComponent();
        if (scrollerEl && scrollerComponent) {
          this.emitScrollEvent(false, this._readyToShow, userAction);
        }
        scrollHandler(userAction);
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
        hasUserAction = userAction;
        const scrollerEl = this._scroller()?.nativeElement, scrollerComponent = this._scrollerComponent();
        if (scrollerEl && scrollerComponent) {
          this.emitScrollEvent(true, this._readyToShow, userAction);
        }
        scrollHandler(userAction);
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

    const $scrollTo = this.$scrollTo,
      $scrollToExecutor = this.$scrollToExecutor;

    combineLatest([$scroller, $trackBy, $scrollTo]).pipe(
      filter(([scroller]) => scroller !== undefined),
      map(([scroller, trackBy, event]) => ({ scroller: scroller, trackBy, event })),
      tap(({ event }) => {
        this._$scrollingTo.next(true);
        this._$scrollToExecutor.next(event);
      }),
    ).subscribe();

    $scrollToExecutor.pipe(
      takeUntilDestroyed(),
      switchMap(event => {
        const trackBy = this.trackBy(), scrollerComponent = this._scrollerComponent(),
          {
            id, iteration = 0, blending = false,
            isLastIteration = false, scrollCalled = false, cb,
          } = event;
        const nextIteration = iteration + 1, finished = nextIteration >= MAX_SCROLL_TO_ITERATIONS, fireUpdate = false;

        if (!this._readyToShow) {
          return of([finished, { iteration: nextIteration, blending, scrollCalled, cb }]).pipe(delay(0));
        }

        if (scrollerComponent) {
          const items = this._actualItems();
          if (items && items.length) {
            const dynamicSize = this.dynamicSize(), itemSize = this.itemSize(), snapScrollToEnd = this.snapScrollToEnd();

            if (dynamicSize) {
              const { width, height, x, y } = this._bounds() || { x: 0, y: 0, width: DEFAULT_LIST_SIZE, height: DEFAULT_LIST_SIZE },
                itemConfigMap = this.itemConfigMap(), items = this._actualItems(), isVertical = this._isVertical,
                currentScrollSize = isVertical ? scrollerComponent.scrollTop : scrollerComponent.scrollLeft,
                delta = this._trackBox.delta,
                opts: IGetItemPositionOptions<IVirtualListItem, IVirtualListCollection> = {
                  bounds: { width, height, x, y }, collection: items, dynamicSize, isVertical: this._isVertical, itemSize,
                  bufferSize: this.bufferSize(), maxBufferSize: this.maxBufferSize(),
                  scrollSize: (isVertical ? scrollerComponent.scrollTop : scrollerComponent.scrollLeft) + delta,
                  snap: this.snap(), fromItemId: id, enabledBufferOptimization: this.enabledBufferOptimization(),
                };

              let scrollSize = snapScrollToEnd && this._trackBox.isSnappedToEnd ?
                (isVertical ? scrollerComponent.scrollHeight : scrollerComponent.scrollWidth) :
                this._trackBox.getItemPosition(id, itemConfigMap, opts);

              if (scrollSize === -1) {
                return of([finished, { id, blending, iteration: nextIteration, scrollCalled, cb }]).pipe(delay(0));
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

              scrollSize = snapScrollToEnd && this._trackBox.isSnappedToEnd ?
                (isVertical ? scrollerComponent.scrollHeight : scrollerComponent.scrollWidth) :
                this._trackBox.getItemPosition(id, itemConfigMap, { ...opts, scrollSize: actualScrollSize, fromItemId: id });
              if (scrollSize === -1) {
                return of([finished, { id, blending, iteration: nextIteration, scrollCalled, cb }]).pipe(delay(0));
              }
              this._$preventScrollSnapping.next(true);
              const notChanged = scrollSize === currentScrollSize;
              if (!notChanged && iteration < MAX_SCROLL_TO_ITERATIONS) {
                const params: IScrollToParams = {
                  [isVertical ? TOP_PROP_NAME : LEFT_PROP_NAME]: scrollSize, behavior: BEHAVIOR_INSTANT as ScrollBehavior,
                  fireUpdate, blending, useLimits: true,
                };
                scrollerComponent?.scrollTo?.(params);
                return of([finished, {
                  id, iteration: nextIteration, blending,
                  isLastIteration: nextIteration < MAX_SCROLL_TO_ITERATIONS, scrollCalled, cb
                }]).pipe(delay(0));
              } else {
                this._scrollSize.set(actualScrollSize);
                return of([finished, { id, blending, iteration: nextIteration, scrollCalled, cb }]).pipe(delay(0));
              }
            } else {
              const index = items.findIndex(item => item[trackBy] === id);
              if (index > -1) {
                const isVertical = this._isVertical,
                  currentScrollSize = (isVertical ? scrollerComponent.scrollTop : scrollerComponent.scrollLeft),
                  scrollSize = index * this.itemSize();
                if (currentScrollSize !== scrollSize) {
                  this._$preventScrollSnapping.next(true);
                  const params: IScrollToParams = {
                    [this._isVertical ? TOP_PROP_NAME : LEFT_PROP_NAME]: scrollSize, fireUpdate,
                    behavior: BEHAVIOR_INSTANT as ScrollBehavior, blending, useLimits: true,
                  };
                  scrollerComponent?.scrollTo?.(params);
                  return of([true, { id, blending, iteration: nextIteration, scrollCalled, cb }]).pipe(delay(0));
                }
              }
            }
          }
        }
        return of([finished, { id, iteration: nextIteration, scrollCalled, cb }]);
      }),
      takeUntilDestroyed(),
      tap(([finished, params]) => {
        const scrollParams = params as IScrollParams & { scrollCalled: boolean; };
        if (!finished && !scrollParams?.scrollCalled) {
          this._$scrollToExecutor.next(params as IScrollParams);
          return;
        }

        if (this._readyToShow) {
          this._trackBox.preventScrollSnapping(true);
        }

        this._$scrollingTo.next(false);
        this._scrollerComponent()?.refresh();
        this._$fireUpdate.next(true);
        this.emitScrollEvent(true, false, true);
        scrollParams?.cb?.();
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
        if (this._isSingleSelecting || (this._isMultiSelecting && isSelectedIdsFirstEmit >= 2)) {
          const curr = this.selectedIds();
          if ((this._isSingleSelecting && JSON.stringify(v) !== JSON.stringify(curr)) ||
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

    this.$destroy.pipe(
      takeUntilDestroyed(),
      tap(() => {
        debouncedUpdate.dispose();
      }),
    ).subscribe();
  }

  ngAfterViewInit() {
    this._$viewInit.next(true);

    this._$fireUpdate.next(false);
  }

  private emitScrollEvent(isScrollEnd: boolean = false, update: boolean = true, userAction: boolean = false) {
    const scrollerEl = this._scroller()?.nativeElement, scrollerComponent = this._scrollerComponent();
    if (scrollerEl && scrollerComponent) {
      const isVertical = this._isVertical, scrollSize = (isVertical ? scrollerComponent.scrollTop : scrollerComponent.scrollLeft),
        maxScrollSize = (isVertical ? scrollerComponent.scrollHeight : scrollerComponent.scrollWidth),
        bounds = this._bounds() || { x: 0, y: 0, width: DEFAULT_LIST_SIZE, height: DEFAULT_LIST_SIZE },
        currentScrollSize = this._scrollSize();
      this._trackBox.deltaDirection = currentScrollSize > scrollSize ? -1 : currentScrollSize < scrollSize ? 1 : 0;
      const itemsRange = formatActualDisplayItems(this._service.displayItems, this.scrollStartOffset(), this.scrollEndOffset(),
        scrollSize, isVertical, bounds),
        event = new ScrollEvent({
          direction: this._trackBox.scrollDirection, container: scrollerEl,
          list: this._list()!.nativeElement, delta: this._trackBox.delta,
          deltaOfNewItems: this._trackBox.deltaOfNewItems, isVertical,
          scrollSize,
          itemsRange,
          isEnd: this._trackBox.isSnappedToEnd || (Math.round(scrollSize) === Math.round(maxScrollSize)),
          userAction,
        });
      if (update) {
        this._$scroll.next(event);
      }

      if (isScrollEnd) {
        this.onScrollEnd.emit(event);
      } else {
        this.onScroll.emit(event);
      }
    }
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
      if (this._snapedDisplayComponents.length < MAX_REGULAR_SNAPED_COMPONENTS && this._snapContainerRef) {
        while (this._snapedDisplayComponents.length < MAX_REGULAR_SNAPED_COMPONENTS) {
          const comp = this._snapContainerRef.createComponent(this._itemComponentClass);
          comp.instance.renderer = this._itemRenderer();
          comp.instance.regular = true;
          this._snapedDisplayComponents.push(comp);
          this._trackBox.snapedDisplayComponents = this._snapedDisplayComponents;
          this._resizeSnappedObserver = new ResizeObserver(this._resizeSnappedComponentHandler);
          this._resizeSnappedObserver.observe(comp.instance.element);
        }
      }
    }

    this._trackBox.items = displayItems;

    const listContainerRef = this._listContainerRef;

    const maxLength = displayItems.length, components = this._displayComponents;

    if (!!listContainerRef) {
      const doMap: { [id: number]: number } = {};
      let i = 0;
      for (let l = components.length; i < l; i++) {
        const item = components[i];
        if (item) {
          const id = item.instance.id;
          item.instance.renderer = this._itemRenderer();
          doMap[id] = i;
        }
      }
      while (components.length < maxLength) {
        const comp = listContainerRef.createComponent(this._itemComponentClass);
        const id = comp.instance.id;
        comp.instance.renderer = this._itemRenderer();
        doMap[id] = i;
        components.push(comp);
        this._componentsResizeObserver.observe(comp.instance.element);
        i++;
      }
      this._trackBox.setDisplayObjectIndexMapById(doMap);
    }
  }

  private updateRegularRenderer() {
    this._resizeSnappedComponentHandler();
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
  getItemBounds(id: Id): ISize | null {
    validateId(id);
    return this._trackBox.getItemBounds(id) ?? null;
  }

  /**
   * Focus an list item by a given id.
   */
  focus(id: Id, align: FocusAlignment = FocusAlignments.NONE) {
    this._elementRef.nativeElement.focus();
    validateId(id);
    validateFocusAlignment(align);
    const el = this.getFocusedElementById(id);
    if (!!el) {
      this._service.focus(el, align, this.scrollBehavior());
    }
  }

  private getFocusedElementById(id: Id) {
    const el = this._list()?.nativeElement.querySelector<HTMLDivElement>(getSelectorByItemId(id));
    if (!!el) {
      const focusedEl = el.querySelector<HTMLDivElement>(`.${ITEM_CONTAINER}`);
      if (!!focusedEl) {
        return focusedEl;
      }
    }
    return null;
  }

  /**
   * The method scrolls the list to the element with the given `id` and returns the value of the scrolled area.
   */
  scrollTo(id: Id, cb: (() => void) | null = null, options: IScrollOptions | null = null) {
    const behavior = options?.behavior ?? BEHAVIOR_INSTANT,
      blending = options?.blending ?? false,
      focused = options?.focused ?? true,
      iteration = options?.iteration ?? 0;
    validateId(id);
    validateScrollBehavior(behavior);
    validateIteration(iteration);
    const actualIteration = validateScrollIteration(iteration);
    this._elementRef.nativeElement.focus();
    this._$scrollTo.next({
      id, behavior, blending, iteration: actualIteration, isLastIteration: actualIteration === MAX_SCROLL_TO_ITERATIONS, cb: () => {
        if (focused) {
          const el = this.getFocusedElementById(id);
          if (!!el) {
            this._service.focus(el, FocusAlignments.NONE);
          }
        }
        if (typeof cb === 'function') {
          cb?.();
        }
      }
    });
  }

  /**
   * Scrolls the scroll area to the first item in the collection.
   */
  scrollToStart(cb: (() => void) | null = null, options: IScrollOptions | null = null) {
    const scroller = this._scrollerComponent();
    if (scroller) {
      scroller.stopScrolling();
    }
    const behavior = options?.behavior ?? BEHAVIOR_INSTANT,
      blending = options?.blending ?? false,
      focused = options?.focused ?? true,
      iteration = options?.iteration ?? 0;
    validateScrollBehavior(behavior);
    validateIteration(iteration);
    const trackBy = this.trackBy(), items = this.items(), firsItem = items.length > 0 ? items[0] : undefined, id = firsItem?.[trackBy],
      actualIteration = validateScrollIteration(iteration);
    if (!!firsItem) {
      this._elementRef.nativeElement.focus();
      this._$scrollTo.next({
        id, behavior, blending, iteration: actualIteration, isLastIteration: actualIteration === MAX_SCROLL_TO_ITERATIONS, cb: () => {
          this._isScrollStart.set(true);
          this._trackBox.isScrollStart = true;
          this._trackBox.isScrollEnd = false;
          this._$fireUpdate.next(true);
          if (focused) {
            const el = this.getFocusedElementById(id);
            if (!!el) {
              this._service.focus(el, FocusAlignments.NONE);
            }
          }
          if (typeof cb === 'function') {
            cb?.();
          }
        }
      });
    }
  }

  /**
   * @deprecated
   * The scrollToEndItem method is deprecated. Use the scrollToEnd method.
   */
  scrollToEndItem(cb?: () => void, options?: IScrollOptions) {
    throw Error('The scrollToEndItem method is deprecated. Use the scrollToEnd method.');
  }

  /**
   * Scrolls the list to the end of the content size.
   */
  scrollToEnd(cb: (() => void) | null = null, options: IScrollOptions | null = null) {
    const scroller = this._scrollerComponent();
    if (scroller) {
      scroller.stopScrolling();
    }
    const behavior = options?.behavior ?? BEHAVIOR_INSTANT,
      blending = options?.blending ?? false,
      focused = options?.focused ?? true,
      iteration = options?.iteration ?? 0;
    validateScrollBehavior(behavior);
    validateIteration(iteration);
    const trackBy = this.trackBy(), items = this.items(), latItem = items[items.length > 0 ? items.length - 1 : 0], id = latItem[trackBy],
      actualIteration = validateScrollIteration(iteration);
    this._elementRef.nativeElement.focus();
    this._$scrollTo.next({
      id, behavior, blending, iteration: actualIteration, isLastIteration: actualIteration === MAX_SCROLL_TO_ITERATIONS, cb: () => {
        this._isScrollEnd.set(true);
        this._trackBox.isScrollStart = false;
        this._trackBox.isScrollEnd = true;
        this._$fireUpdate.next(true);
        if (focused) {
          const el = this.getFocusedElementById(id);
          if (!!el) {
            this._service.focus(el, FocusAlignments.NONE);
          }
        }
        if (typeof cb === 'function') {
          cb?.();
        }
      }
    });
  }

  /**
   * Force clearing the cache.
   */
  protected cacheClean() {
    this._cached = false;
    this._updateIterations = 0;
    if (this.dynamicSize()) {
      this._trackBox.cacheClean();
    }
    const prerenderContainer = this._prerender();
    if (!!prerenderContainer) {
      prerenderContainer.clear();
      prerenderContainer.off();
    }
    this._collapsedItemIds.set([]);
    this._isScrollStart.set(true);
    this._isScrollEnd.set(false);
    this._totalSize.set(0);
    this._scrollSize.set(0);
    const scrollerComponent = this._scrollerComponent();
    if (scrollerComponent) {
      scrollerComponent.reset();
    }
    // if (this._scrollerComponent()?.scrollable) {
    //   this._$isResetedReachStart.next(true);
    // }
  }

  /**
   * @deprecated
   * The stopSnappingScrollToEnd method is deprecated. Use the preventSnapping method.
   */
  stopSnappingScrollToEnd() {
    throw Error('The stopSnappingScrollToEnd method is deprecated. Use the preventSnapping method.');
  }

  /**
   * Prevents the list from snapping to its start or end edge.
   */
  preventSnapping() {
    const scroller = this._scrollerComponent();
    this._isScrollStart.set(false);
    this._isScrollEnd.set(false);
    this._trackBox.preventScrollSnapping(true);
    if (scroller) {
      scroller.stopScrolling();
    }
  }

  ngOnDestroy(): void {
    this.dispose();
  }

  private dispose() {
    this._$destroy.next();

    const updateId = this._updateId;
    if (updateId !== undefined) {
      cancelAnimationFrame(updateId);
      this._updateId = undefined;
    }

    if (!!this._trackBox) {
      this._trackBox.dispose();
    }

    if (!!this._componentsResizeObserver) {
      this._componentsResizeObserver.disconnect();
    }

    if (!!this._resizeSnappedObserver) {
      this._resizeSnappedObserver.disconnect();
    }

    if (!!this._resizeObserver) {
      this._resizeObserver.disconnect();
    }

    if (!!this._listResizeObserver) {
      this._listResizeObserver.disconnect();
    }

    if (!!this._snapedDisplayComponents) {
      while (this._snapedDisplayComponents.length > 0) {
        const comp = this._displayComponents.shift();
        comp?.destroy();
      }
    }

    if (this._displayComponents) {
      while (this._displayComponents.length > 0) {
        const comp = this._displayComponents.shift();
        comp?.destroy();
      }
    }
  }
}
