import {
  ChangeDetectionStrategy, Component, ComponentRef, computed, DestroyRef, effect, ElementRef, inject, input,
  OnDestroy, output, Signal, signal, TemplateRef, ViewChild, viewChild, ViewContainerRef, ViewEncapsulation,
} from '@angular/core';
import { takeUntilDestroyed, toObservable } from '@angular/core/rxjs-interop';
import {
  BehaviorSubject, combineLatest, debounceTime, delay, distinctUntilChanged, filter, fromEvent, map,
  of, skip, Subject, switchMap, take, takeUntil, tap,
} from 'rxjs';
import { NgVirtualListItemComponent } from './components/ng-list-item/ng-virtual-list-item.component';
import {
  BEHAVIOR_INSTANT, CLASS_LIST_HORIZONTAL, CLASS_LIST_VERTICAL, DEFAULT_DIRECTION, DEFAULT_DYNAMIC_SIZE,
  DEFAULT_ENABLED_BUFFER_OPTIMIZATION, DEFAULT_ITEM_SIZE, DEFAULT_BUFFER_SIZE, DEFAULT_LIST_SIZE, DEFAULT_STICKY_ENABLED, DEFAULT_SNAPPING_METHOD,
  HEIGHT_PROP_NAME, LEFT_PROP_NAME, MAX_SCROLL_TO_ITERATIONS, PX, FOCUS, TOP_PROP_NAME, TRACK_BY_PROPERTY_NAME, WIDTH_PROP_NAME,
  DEFAULT_MAX_BUFFER_SIZE, DEFAULT_SELECT_METHOD, DEFAULT_SELECT_BY_CLICK, DEFAULT_COLLAPSE_BY_CLICK, DEFAULT_COLLECTION_MODE,
  DEFAULT_SCREEN_READER_MESSAGE, DEFAULT_SNAP_TO_END_TRANSITION_INSTANT_OFFSET, DEFAULT_SNAP_SCROLLTO_END, MIN_PIXELS_FOR_PREVENT_SNAPPING,
  MOUSE_DOWN, TOUCH_START, DEFAULT_LANG_TEXT_DIR, DEFAULT_CLICK_DISTANCE, DEFAULT_WAIT_FOR_PREPARATION, DEFAULT_SCROLLBAR_THICKNESS,
  DEFAULT_SCROLLBAR_MIN_SIZE, KEY_DOWN, BEHAVIOR_AUTO, DEFAULT_SCROLLBAR_ENABLED, DEFAULT_SCROLLBAR_INTERACTIVE, DEFAULT_OVERSCROLL_ENABLED,
  DEFAULT_ANIMATION_PARAMS, DEFAULT_SCROLL_BEHAVIOR, DEFAULT_SNAP_SCROLLTO_START, EMPTY_SCROLL_STATE_VERSION, MAX_REGULAR_SNAPED_COMPONENTS,
  PREPARE_ITERATIONS, PREPARATION_REUPDATE_LENGTH, ROLE_LIST_BOX, ROLE_LIST, KEY_TAB, MAX_VELOCITY_FOR_SCROLL_QUALITY_OPTIMIZATION_LVL1,
  PREPARE_ITERATIONS_FOR_UPDATE_ITEMS, PREPARATION_REUPDATE_LENGTH_FOR_UPDATE_ITEMS, PREPARE_ITERATIONS_FOR_COLLAPSE_ITEMS,
  PREPARATION_REUPDATE_LENGTH_FOR_COLLAPSE_ITEMS, MAX_NUMBERS_OF_SKIPS_FOR_QUALITY_OPTIMIZATION_LVL1, DEFAULT_SCROLLING_SETTINGS,
  DEFAULT_SNAP_TO_ITEM, DEFAULT_SNAP_TO_ITEM_ALIGN, VIEWPORT, DEFAULT_MOTION_BLUR, DEFAULT_MAX_MOTION_BLUR, DEFAULT_SCROLLING_ONE_BY_ONE,
  DEFAULT_MOTION_BLUR_ENABLED, DEFAULT_DIVIDES, DEFAULT_SNAPPING_DISTANCE, DEFAULT_MAX_ITEM_SIZE, DEFAULT_MIN_ITEM_SIZE,
} from './const';
import {
  IRenderVirtualListItem, IVirtualListCollection, IVirtualListItem, IVirtualListItemConfigMap,
} from './models';
import {
  IScrollEvent, IScrollOptions, IAnimationParams, ISize, IRenderStabilizerOptions, IScrollingSettings,
} from './interfaces';
import { ArithmeticExpression, FocusAlignment, Id, ItemTransform, SnappingDistance } from './types';
import { IRenderVirtualListCollection } from './models/render-collection.model';
import {
  CollectionMode, CollectionModes, Direction, Directions, FocusAlignments, MethodForSelecting, MethodsForSelecting,
  ScrollAlignments, SnappingMethod, SnappingMethods, SnapToItemAlign, TextDirection, TextDirections,
} from './enums';
import { debounce, ScrollEvent, toggleClassName } from './utils';
import { IGetItemPositionOptions, IUpdateCollectionOptions, TrackBox } from './core/track-box';
import { isSnappingMethodAdvenced } from './utils/snapping-method';
import { BaseVirtualListItemComponent } from './components/ng-list-item/base';
import { Component$1 } from './models/component.model';
import { isDirection } from './utils/is-direction';
import { NgVirtualListService } from './ng-virtual-list.service';
import { isMethodForSelecting } from './utils/is-method-for-selecting';
import { MethodsForSelectingTypes } from './enums/method-for-selecting-types';
import { CMap } from './utils/cmap';
import { validateArray, validateBoolean, validateFloat, validateFunction, validateInt, validateObject, validateString } from './utils/validation';
import { copyValueAsReadonly, objectAsReadonly } from './utils/object';
import { isCollectionMode } from './utils/is-collection-mode';
import { NgScrollerComponent } from './components/ng-scroller/ng-scroller.component';
import { IScrollToParams } from './components/ng-scroll-view';
import { NgPrerenderContainer } from './components/ng-prerender-container/ng-prerender-container.component';
import { IScrollParams } from './interfaces';
import { formatActualDisplayItems, formatScreenReaderMessage } from './utils/screen-reader-formatter';
import { validateId, validateIteration, validateScrollBehavior, validateScrollIteration } from './utils/list-validators';
import { EVENT_KEY_DOWN, KEY_ARR_DOWN, KEY_ARR_LEFT, KEY_ARR_RIGHT, KEY_ARR_UP } from './components/ng-list-item/const';
import { NgVirtualListPublicService } from './ng-virtual-list-public.service';
import { isPercentageValue } from './utils/is-persentage-value';
import { parseFloatOrPersentageValue } from './utils/parse-float-or-persentage-value';
import { parseArithmeticExpression } from './utils/parse-arithmetic-expression';
import { normalizeCollection } from './utils/normalize-collection';

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
  providers: [NgVirtualListService, NgVirtualListPublicService],
})
export class NgVirtualListComponent implements OnDestroy {
  private static __nextId: number = 0;

  private _id: number = NgVirtualListComponent.__nextId;

  /**
   * Readonly. Returns the unique identifier of the component.
   */
  get id() { return this._id; }

  private _service = inject(NgVirtualListService);

  private _prerender = viewChild<NgPrerenderContainer>('prerender');

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
   * Emit the component ID when an element crosses the alignment line specified by the snapToItemAlign property.
   */
  onSnapItem = output<Id>();

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

  private _scrollbarThickness = {
    transform: (v: number) => {
      const valid = validateInt(v);

      if (!valid) {
        console.error('The "scrollbarThickness" parameter must be of type `number`.');
        return DEFAULT_SCROLLBAR_THICKNESS;
      }
      return v;
    },
  } as any;

  /**
   * Scrollbar thickness.
   */
  scrollbarThickness = input<number>(DEFAULT_SCROLLBAR_THICKNESS, { ...this._scrollbarThickness });

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

  private _scrollbarThumbRenderer = {
    transform: (v: TemplateRef<any> | null) => {
      const valid = validateObject(v, true, true);

      if (!valid) {
        console.error('The "scrollbarThumbRenderer" parameter must be of type `object`.');
        return null;
      }
      return v;
    },
  } as any;

  /**
   * Scrollbar customization template.
   */
  scrollbarThumbRenderer = input<TemplateRef<any> | null>(null, { ...this._scrollbarThumbRenderer });

  private _scrollbarThumbParams = {
    transform: (v: { [propName: string]: any } | null) => {
      const valid = validateObject(v, true, true);

      if (!valid) {
        console.error('The "scrollbarThumbParams" parameter must be of type `object`.');
        return null;
      }
      return v;
    },
  } as any;

  /**
   * Additional options for the scrollbar.
   */
  scrollbarThumbParams = input<{ [propName: string]: any } | null>({}, { ...this._scrollbarThumbParams });

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
      throw Error(`Property snap is deprecated. Use the \`stickyEnabled\` property instead.`);
    },
  } as any;

  /**
   * @deprecated
   * Use the `stickyEnabled` property instead.
   */
  snap = input<boolean>(false, { ...this._snapOptions });

  private _stickyEnabledOptions = {
    transform: (v: boolean) => {
      const valid = validateBoolean(v);

      if (!valid) {
        console.error('The "stickyEnabled" parameter must be of type `boolean`.');
        return DEFAULT_STICKY_ENABLED;
      }
      return v;
    },
  } as any;

  /**
   * Determines whether items with the given `sticky` in `itemConfigMap` will stick to the edges. Default value is "true".
   */
  stickyEnabled = input<boolean>(DEFAULT_STICKY_ENABLED, { ...this._stickyEnabledOptions });

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
      const valid = validateFloat(v, true) || isPercentageValue(v);

      if (!valid) {
        console.error('The "scrollStartOffset" parameter must be one of type `number` or `string`.');
        return 0;
      }
      return v;
    },
  } as any;

  /**
   * Sets the scroll start offset value. Can be specified in absolute or percentage values.
   * Supports arithmetic expressions of addition `50% + 25` or subtraction `50% - 25`. Default value is "0".
   */
  scrollStartOffset = input<ArithmeticExpression>(0, { ...this._scrollStartOffsetOptions });

  private _scrollEndOffsetOptions = {
    transform: (v: number) => {
      const valid = validateFloat(v, true) || isPercentageValue(v);

      if (!valid) {
        console.error('The "scrollEndOffset" parameter must be one of type `number` or `string`.');
        return 0;
      }
      return v;
    },
  } as any;

  /**
   * Sets the scroll end offset value. Can be specified in absolute or percentage values.
   * Supports arithmetic expressions of addition `50% + 25` or subtraction `50% - 25`. Default value is "0".
   */
  scrollEndOffset = input<ArithmeticExpression>(0, { ...this._scrollEndOffsetOptions });

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

  private _scrollingSettingsOptions = {
    transform: (v: IScrollingSettings): IScrollingSettings | null => {
      let valid = validateObject(v, true, true);
      if (valid && !!v) {
        const { frictionalForce, mass, maxDistance, maxDuration, speedScale, optimization } = v;
        valid = validateFloat(frictionalForce, true);
        if (!valid) {
          console.error('The "frictionalForce" parameter must be of type `number` or `undefined`.');
          return DEFAULT_SCROLLING_SETTINGS;
        }
        valid = validateFloat(mass, true);
        if (!valid) {
          console.error('The "mass" parameter must be of type `number` or `undefined`.');
          return DEFAULT_SCROLLING_SETTINGS;
        }
        valid = validateFloat(maxDistance, true);
        if (!valid) {
          console.error('The "maxDistance" parameter must be of type `number` or `undefined`.');
          return DEFAULT_SCROLLING_SETTINGS;
        }
        valid = validateFloat(maxDuration, true);
        if (!valid) {
          console.error('The "maxDuration" parameter must be of type `number` or `undefined`.');
          return DEFAULT_SCROLLING_SETTINGS;
        }
        valid = validateFloat(speedScale, true);
        if (!valid) {
          console.error('The "speedScale" parameter must be of type `number` or `undefined`.');
          return DEFAULT_SCROLLING_SETTINGS;
        }
        valid = validateBoolean(optimization, true);
        if (!valid) {
          console.error('The "optimization" parameter must be of type `boolean` or `undefined`.');
          return DEFAULT_SCROLLING_SETTINGS;
        }
      }
      if (!valid) {
        console.error('The "scrollingSettings" parameter must be of type `object` or null.');
        return DEFAULT_SCROLLING_SETTINGS;
      }
      return {
        frictionalForce: v.frictionalForce !== undefined && v.frictionalForce > 0 ? v.frictionalForce : DEFAULT_SCROLLING_SETTINGS.frictionalForce,
        mass: v.mass !== undefined && v.mass > 0 ? v.mass : DEFAULT_SCROLLING_SETTINGS.mass,
        maxDistance: v.maxDistance !== undefined && v.maxDistance > 0 ? v.maxDistance : DEFAULT_SCROLLING_SETTINGS.maxDistance,
        maxDuration: v.maxDuration !== undefined && v.maxDuration > 0 ? v.maxDuration : DEFAULT_SCROLLING_SETTINGS.maxDuration,
        speedScale: v.speedScale !== undefined && v.speedScale > 0 ? v.speedScale : DEFAULT_SCROLLING_SETTINGS.speedScale,
        optimization: v.optimization ?? DEFAULT_SCROLLING_SETTINGS.optimization,
      };
    },
  } as any;

  /**
   * Scrolling settings.
   * - frictionalForce - Frictional force. Default value is 0.035.
   * - mass - Mass. Default value is 0.005.
   * - maxDistance - Maximum scrolling distance. Default value is 100000.
   * - maxDuration - Maximum animation duration. Default value is 4000.
   * - speedScale - Speed scale. Default value is 10.
   * - optimization - Enables scrolling performance optimization. Default value is `true`.
   */
  scrollingSettings = input<IScrollingSettings>(DEFAULT_SCROLLING_SETTINGS, { ...this._scrollingSettingsOptions });

  private _itemTransformOptions = {
    transform: (v: any) => {
      let valid = validateFunction(v, true, true);
      if (!valid) {
        console.error('The "itemTransform" parameter must be of type `ItemTransform` or `null`.');
        return null;
      }
      return v;
    },
  } as any;

  /**
   * Custom transformation of element's position, rotation, scale, opacity and zIndex. The default value is `null`.
   */
  itemTransform = input<ItemTransform | null>(null, { ...this._itemTransformOptions });

  private _snapToItemOptions = {
    transform: (v: boolean) => {
      const valid = validateBoolean(v);

      if (!valid) {
        console.error('The "snapToItem" parameter must be of type `boolean`.');
        return DEFAULT_SNAP_TO_ITEM;
      }
      return v;
    },
  } as any;

  /**
   * Snap to an item. The default value is `false`.
   */
  snapToItem = input<boolean>(DEFAULT_SNAP_TO_ITEM, { ...this._snapToItemOptions });

  private _snapToItemAlignOptions = {
    transform: (v: SnapToItemAlign) => {
      const valid = validateString(v) && (v === 'start' || v === 'center' || v === 'end');

      if (!valid) {
        console.error('The "snapToItemAlign" parameter must be one of `start`, `center` or `end`.');
        return DEFAULT_SNAP_TO_ITEM_ALIGN;
      }
      return v;
    },
  } as any;

  /**
   * Alignment for snapToItem. Available values ​​are `start`, `center`, and `end`. The default value is `center`.
   */
  snapToItemAlign = input<SnapToItemAlign>(DEFAULT_SNAP_TO_ITEM_ALIGN, { ...this._snapToItemAlignOptions });

  private _snappingDistanceOptions = {
    transform: (v: SnappingDistance | any) => {
      const valid = validateString(v) || validateFloat(v);

      if (!valid) {
        console.error('The "snappingDistance" parameter must be of type `number` or `string`.');
        return DEFAULT_SNAPPING_DISTANCE;
      }
      return v;
    },
  } as any;

  /**
   * Snapping activation distance. Can be specified as a percentage of the element size or in absolute values.
   * The default value is `25%`.
   */
  snappingDistance = input<SnappingDistance>(DEFAULT_SNAPPING_DISTANCE, { ...this._snappingDistanceOptions });

  private _scrollingOneByOneOptions = {
    transform: (v: any) => {
      const valid = validateBoolean(v);

      if (!valid) {
        console.error('The "scrollingOneByOne" parameter must be of type `boolean`.');
        return DEFAULT_SCROLLING_ONE_BY_ONE;
      }
      return v;
    },
  } as any;

  /**
   * Specifies whether to scroll one item at a time if true and the scrollToItem property is set. The default value is `false`.
   */
  scrollingOneByOne = input<boolean>(DEFAULT_SCROLLING_ONE_BY_ONE, { ...this._scrollingOneByOneOptions });

  private _dividesOptions = {
    transform: (v: number) => {
      const valid = validateFloat(v);

      if (!valid) {
        console.error('The "divides" parameter must be of type `number`.');
        return DEFAULT_DIVIDES;
      }
      return v <= 0 ? DEFAULT_DIVIDES : v;
    },
  } as any;

  /**
   * Column or row numbers. The default value is `1`.
   */
  divides = input<number>(DEFAULT_DIVIDES, { ...this._dividesOptions });

  private _motionBlurOptions = {
    transform: (v: number) => {
      const valid = validateFloat(v);

      if (!valid) {
        console.error('The "motionBlur" parameter must be of type `number`.');
        return DEFAULT_MOTION_BLUR;
      }
      return v;
    },
  } as any;

  /**
   * Motion blur effect. The default value is `0.15`.
   */
  motionBlur = input<number>(DEFAULT_MOTION_BLUR, { ...this._motionBlurOptions });

  private _maxMotionBlurOptions = {
    transform: (v: number) => {
      const valid = validateFloat(v);

      if (!valid) {
        console.error('The "maxMotionBlur" parameter must be of type `number`.');
        return DEFAULT_MAX_MOTION_BLUR;
      }
      return v <= 0 ? DEFAULT_MAX_MOTION_BLUR : v;
    },
  } as any;

  /**
   * Maximum motion blur effect. The default value is `0.5`.
   */
  maxMotionBlur = input<number>(DEFAULT_MAX_MOTION_BLUR, { ...this._maxMotionBlurOptions });

  private _motionBlurEnabledOptions = {
    transform: (v: boolean) => {
      const valid = validateBoolean(v);

      if (!valid) {
        console.error('The "motionBlurEnabled" parameter must be of type `boolean`.');
        return DEFAULT_MOTION_BLUR_ENABLED;
      }
      return v;
    },
  } as any;

  /**
   * Determines whether to apply motion blur or not. The default value is `false`.
   */
  motionBlurEnabled = input<boolean>(DEFAULT_MOTION_BLUR_ENABLED, { ...this._motionBlurEnabledOptions });

  private _animationParamsOptions = {
    transform: (v: IAnimationParams) => {
      const valid = validateObject(v, true, true);

      if (!validateFloat(v.scrollToItem)) {
        console.error('The "scrollToItem" parameter must be of type `number`.');
        return DEFAULT_ANIMATION_PARAMS;
      }
      if (!validateFloat(v.snapToItem)) {
        console.error('The "snapToItem" parameter must be of type `number`.');
        return DEFAULT_ANIMATION_PARAMS;
      }
      if (!validateFloat(v.navigateByKeyboard)) {
        console.error('The "navigateByKeyboard" parameter must be of type `number`.');
        return DEFAULT_ANIMATION_PARAMS;
      }
      if (!validateFloat(v.navigateToItem)) {
        console.error('The "navigateToItem" parameter must be of type `number`.');
        return DEFAULT_ANIMATION_PARAMS;
      }
      if (!valid) {
        console.error('The "animationParams" parameter must be of type `object`.');
        return DEFAULT_ANIMATION_PARAMS;
      }
      return v;
    },
  } as any;

  /**
   * Animation parameters. The default value is "{ scrollToItem: 50, snapToItem: 150, navigateToItem: 150, navigateByKeyboard: 50 }".
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
    transform: (v: any) => {
      const valid = validateFloat(v) || v === VIEWPORT;
      if (!valid) {
        console.error('The "itemSize" parameter must be one of `number`, `viewport` or `undefined`.');
        return DEFAULT_ITEM_SIZE;
      }
      return v;
    },
  } as any;

  /**
   * If direction = 'vertical', then the height of a typical element. If direction = 'horizontal', then the width of a typical element.
   * If the `dynamicSize` property is true, the items in the list can have different sizes, and you must specify the `itemSize` property 
   * to adjust the sizes of the items in the unallocated area.
   * If the value is 'viewport', the sizes of elements are automatically resized to fit the viewport size.
   */
  itemSize = input<number | 'viewport'>(DEFAULT_ITEM_SIZE, { ...this._itemSizeOptions });

  private _minItemSizeOptions = {
    transform: (v: any) => {
      const valid = validateFloat(v) || v === VIEWPORT;
      if (!valid) {
        console.error('The "minItemSize" parameter must be one of `number`, `viewport` or `undefined`.');
        return DEFAULT_ITEM_SIZE;
      }
      return v;
    },
  } as any;

  /**
   * If the `dynamicSize` property is enabled, the minimum size of the element is set.
   * If the value is 'viewport', the sizes of elements are automatically resized to fit the viewport size.
   */
  minItemSize = input<number | 'viewport'>(DEFAULT_MIN_ITEM_SIZE, { ...this._minItemSizeOptions });

  private _maxItemSizeOptions = {
    transform: (v: any) => {
      const valid = validateFloat(v) || v === VIEWPORT;
      if (!valid) {
        console.error('The "maxItemSize" parameter must be one of `number`, `viewport` or `undefined`.');
        return DEFAULT_ITEM_SIZE;
      }
      return v;
    },
  } as any;

  /**
   * If the `dynamicSize` property is enabled, the maximum size of the element is set.
   * If the value is 'viewport', the sizes of elements are automatically resized to fit the viewport size.
   */
  maxItemSize = input<number | 'viewport'>(DEFAULT_MAX_ITEM_SIZE, { ...this._maxItemSizeOptions });

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
        console.error('The "direction" parameter must be one of `horizontal` or `vertical`.');
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
        console.error('The "direction" parameter must be one of `normal` or `lazy`.');
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
      const valid = validateString(v) && (v === SnappingMethods.ADVANCED || v === SnappingMethods.STANDART);
      if (!valid) {
        console.error(`The "snappingMethod" parameter must have the value '${SnappingMethods.ADVANCED}' or '${SnappingMethods.STANDART}'.`);
        return DEFAULT_SNAPPING_METHOD;
      }
      return v;
    },
  } as any;

  /**
   * Snapping method. Default value is 'standart'.
   * 'standart' - Classic group visualization.
   * 'advanced' - A mask is applied to the viewport area so that the background is displayed underneath the attached group.
   */
  snappingMethod = input<SnappingMethod>(DEFAULT_SNAPPING_METHOD, { ...this._snappingMethodOptions });

  private _methodForSelectingOptions = {
    transform: (v: MethodForSelecting) => {
      const valid = validateString(v) && (v === 'none' || v === 'select' || v === 'multi-select');
      if (!valid) {
        console.error('The "methodForSelecting" parameter must be one of `none`, `select` or `multi-select`.');
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

  private _snappedDisplayComponents: Array<ComponentRef<BaseVirtualListItemComponent>> = [];

  private _bounds = signal<ISize | null>(null);
  protected get bounds() { return this._bounds; }

  private _actualItemSize = signal<number>(DEFAULT_ITEM_SIZE);
  protected get actualItemSize() { return this._actualItemSize; }

  private _actualMinItemSize = signal<number>(DEFAULT_MIN_ITEM_SIZE);
  protected get actualMinItemSize() { return this._actualMinItemSize; }

  private _actualMaxItemSize = signal<number>(DEFAULT_MAX_ITEM_SIZE);
  protected get actualMaxItemSize() { return this._actualMaxItemSize; }

  private _totalSize = signal<number>(0);

  private _listBounds = signal<ISize | null>(null);

  private _scrollSize = signal<number>(0);

  private _isScrollStart = signal<boolean>(true);

  private _isScrollEnd = signal<boolean>(false);

  protected _actualScrollStartOffset = signal<number>(0);

  protected _actualScrollEndOffset = signal<number>(0);

  private _resizeSnappedComponentHandler = () => {
    const list = this._list(), scroller = this._scroller(), bounds = this._bounds(), snappedComponents = this._snappedDisplayComponents;
    if (list && scroller && snappedComponents.length > 0) {
      const isVertical = this._isVertical, listBounds = list.nativeElement.getBoundingClientRect();

      for (const comp of snappedComponents) {
        if (!!comp) {
          comp.instance.regularLength = `${isVertical ? listBounds.width : listBounds.height}${PX}`;
        }
      }

      const snappingMethod = this.snappingMethod();
      if (snappingMethod === SnappingMethods.ADVANCED) {
        const snappedComponent = snappedComponents?.[0].instance;
        if (!!snappedComponent) {
          const { width, height } = bounds ?? { width: 0, height: 0 }, langTextDir = this.langTextDir();

          snappedComponent.element.style.clipPath = `path("M 0 0 L 0 ${snappedComponent.element.offsetHeight} L ${snappedComponent.element.offsetWidth} ${snappedComponent.element.offsetHeight} L ${snappedComponent.element.offsetWidth} 0 Z")`;

          const { width: sWidth, height: sHeight } = snappedComponent.getBounds() ?? { width: 0, height: 0 },
            scrollerElement = scroller.nativeElement, delta = snappedComponent.item?.measures.delta ?? 0,
            scrollBarSize = this.scrollbarThickness();

          let left: number, right: number, top: number, bottom: number;
          if (isVertical) {
            left = 0;
            right = width - scrollBarSize + 2;
            top = sHeight;
            bottom = height;
            if (langTextDir === TextDirections.RTL) {
              scrollerElement.style.clipPath = `path("M 0 0 L 0 ${height} L ${width} ${height} L ${width} ${top + delta} L ${scrollBarSize} ${top + delta} L ${scrollBarSize} 0 Z")`;
            } else {
              scrollerElement.style.clipPath = `path("M 0 ${top + delta} L 0 ${height} L ${width} ${height} L ${width} 0 L ${right} 0 L ${right} ${top + delta} Z")`;
            }
          } else {
            left = sWidth;
            right = width;
            top = 0;
            bottom = height - scrollBarSize;
            scrollerElement.style.clipPath = `path("M ${width} 0 L ${width} ${bottom} L 0 ${bottom} L 0 0 L ${width} 0 Z")`;
          }
        }
      }
    }
  };

  private _resizeSnappedObserver: ResizeObserver | null = null;

  private focusItem = (element: HTMLElement, position: number, align: FocusAlignment = FocusAlignments.CENTER,
    behavior: ScrollBehavior = BEHAVIOR_AUTO) => {
    if (!this._readyForShow) {
      return;
    }
    const scroller = this._scrollerComponent();
    if (!!scroller) {
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

  private _$update = new Subject<string>();
  protected readonly $update = this._$update.asObservable();

  private _$scrollTo = new Subject<IScrollParams>();
  protected $scrollTo = this._$scrollTo.asObservable();

  private _$scrollToExecutor = new Subject<IScrollParams>();
  protected readonly $scrollToExecutor = this._$scrollToExecutor.asObservable();

  private _$scrollingTo = new BehaviorSubject<boolean>(false);

  private _$scroll = new Subject<IScrollEvent>();
  readonly $scroll = this._$scroll.asObservable();

  private _$tick = new Subject<void>();
  readonly $tick = this._$tick.asObservable();

  private _$fireUpdate = new Subject<boolean>();
  protected readonly $fireUpdate = this._$fireUpdate.asObservable();

  private _$fireUpdateNextFrame = new Subject<boolean>();
  protected readonly $fireUpdateNextFrame = this._$fireUpdateNextFrame.asObservable();

  private _$preventScrollSnapping = new BehaviorSubject<boolean>(false);
  protected readonly $preventScrollSnapping = this._$preventScrollSnapping.asObservable();

  private _destroyRef = inject(DestroyRef);

  private _updateId: number | undefined;

  private _scrollStateUpdateIndex: number = 0;

  private _readyForShow = false;

  private _cached = false;

  private _isLoading = false;

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

    this._service.animationParams = this.animationParams();

    const $bounds = toObservable(this._bounds).pipe(
      filter(b => !!b),
    ),
      $rawScrollStartOffset = toObservable(this.scrollStartOffset),
      $rawScrollEndOffset = toObservable(this.scrollEndOffset);

    combineLatest([$bounds, $rawScrollStartOffset]).pipe(
      takeUntilDestroyed(),
      tap(([bounds, value]) => {
        const val = parseArithmeticExpression(value, this.isVertical ? bounds.height : bounds.width);
        this._actualScrollStartOffset.set(val);
      }),
    ).subscribe();

    combineLatest([$bounds, $rawScrollEndOffset]).pipe(
      takeUntilDestroyed(),
      tap(([bounds, value]) => {
        const val = parseArithmeticExpression(value, this.isVertical ? bounds.height : bounds.width);
        this._actualScrollEndOffset.set(val);
      }),
    ).subscribe();

    this._service.$intersectionElementBySnapToItemAlign.pipe(
      takeUntilDestroyed(),
      filter(v => v !== null),
      tap(id => {
        this.onSnapItem.emit(id);
      }),
    ).subscribe();

    this._service.$tick.pipe(
      takeUntilDestroyed(),
      tap(() => {
        this._scrollerComponent()?.tick();
      }),
    ).subscribe();

    this._service.$tick.pipe(
      takeUntilDestroyed(),
      filter(() => this.dynamicSize() === true),
      tap(() => {
        this.checkBoundsOfElements();
        this._scrollerComponent()?.tick();
      }),
    ).subscribe();

    const $scrollerComponent = toObservable(this._scrollerComponent),
      $resizeViewport = $scrollerComponent.pipe(
        takeUntilDestroyed(),
        filter(v => !!v),
        switchMap(scroller => scroller.$resizeViewport),
      ),
      $resizeContent = $scrollerComponent.pipe(
        takeUntilDestroyed(),
        filter(v => !!v),
        switchMap(scroller => scroller.$resizeContent),
      );

    $scrollerComponent.pipe(
      takeUntilDestroyed(),
      filter(v => !!v),
      switchMap(scroller => scroller.$scrollDirection),
      tap(v => {
        this._trackBox.scrollDirection = v;
      }),
    ).subscribe();

    $resizeViewport.pipe(
      takeUntilDestroyed(),
      filter(v => !!v),
      tap(v => {
        this._bounds.set(v);
        this.onAfterResize(true);
      }),
    ).subscribe();

    $resizeContent.pipe(
      takeUntilDestroyed(),
      filter(v => !!v),
      tap(v => {
        this._listBounds.set(v);
        this.onAfterResize();
      }),
    ).subscribe();

    const $trackBy = toObservable(this.trackBy);
    $trackBy.pipe(
      takeUntilDestroyed(),
      tap(v => {
        this._service.trackBy = v;
      }),
    ).subscribe();

    this._trackBox.displayComponents = this._displayComponents;

    let hasUserAction = false;

    const $itemSize = toObservable(this.itemSize).pipe(
      map(v => typeof v === 'number' && v <= 0 ? DEFAULT_ITEM_SIZE : v),
    ),
      $minItemSize = toObservable(this.minItemSize).pipe(
        map(v => typeof v === 'number' && v <= 0 ? DEFAULT_MIN_ITEM_SIZE : v),
      ),
      $maxItemSize = toObservable(this.maxItemSize).pipe(
        map(v => typeof v === 'number' && v <= 0 ? DEFAULT_MAX_ITEM_SIZE : v),
      );

    combineLatest([$minItemSize, $bounds]).pipe(
      takeUntilDestroyed(),
      switchMap(([v, bounds]) => {
        if (v === VIEWPORT) {
          const isVertical = this.isVertical, viewportBounds = bounds,
            startOffset = this._actualScrollStartOffset(), endOffset = this._actualScrollEndOffset(),
            result = (isVertical ? (viewportBounds?.height ?? 0) : (viewportBounds?.width ?? 0)) - startOffset - endOffset;
          return of(result <= 0 ? 1 : result);
        }
        return of(v);
      }),
      tap(v => {
        this._actualMinItemSize.set(v);
      }),
    ).subscribe();

    combineLatest([$maxItemSize, $bounds]).pipe(
      takeUntilDestroyed(),
      switchMap(([v, bounds]) => {
        if (v === VIEWPORT) {
          const isVertical = this.isVertical, viewportBounds = bounds,
            startOffset = this._actualScrollStartOffset(), endOffset = this._actualScrollEndOffset(),
            result = (isVertical ? (viewportBounds?.height ?? 0) : (viewportBounds?.width ?? 0)) - startOffset - endOffset;
          return of(result <= 0 ? 1 : result);
        }
        return of(v);
      }),
      tap(v => {
        this._actualMaxItemSize.set(v);
      }),
    ).subscribe();

    combineLatest([$itemSize, $bounds, $minItemSize, $maxItemSize]).pipe(
      takeUntilDestroyed(),
      switchMap(([v, bounds]) => {
        if (v === VIEWPORT) {
          const isVertical = this.isVertical, viewportBounds = bounds,
            min = this._actualMinItemSize(),
            max = this._actualMaxItemSize(),
            startOffset = this._actualScrollStartOffset(), endOffset = this._actualScrollEndOffset(),
            result = (isVertical ? (viewportBounds?.height ?? 0) : (viewportBounds?.width ?? 0)) - startOffset - endOffset;
          return of(result < min ? min : (result > max ? max : result));
        }
        return of(v);
      }),
      tap(v => {
        this._actualItemSize.set(v);
        this._service.itemSize = v;
      }),
    ).subscribe();

    const $actualItemSize = toObservable(this._actualItemSize),
      $actualMinItemSize = toObservable(this._actualMinItemSize),
      $actualMaxItemSize = toObservable(this._actualMaxItemSize);

    this._scroller = computed(() => {
      return this._scrollerComponent()?.scrollViewport();
    });

    this._list = computed(() => {
      return this._scrollerComponent()?.scrollContent();
    });

    this._service.$focusItem.pipe(
      takeUntilDestroyed(this._destroyRef),
      tap((params) => {
        const { element, position, align, behavior } = params;
        this.focusItem(element, position, align, behavior);
      }),
    ).subscribe();

    const $list = toObservable(this._list).pipe(
      takeUntilDestroyed(),
      filter(v => !!v),
      map(v => v.nativeElement),
      take(1),
    );

    const preventKeyboardEvent = (event: KeyboardEvent, isVertical: boolean) => {
      const scroller = this._scrollerComponent();
      if (!!scroller) {
        const scrollStartOffset = this._actualScrollStartOffset(), scrollable = scroller.scrollable ?? false,
          scrollSize = isVertical ? scroller.scrollTop : scroller.scrollLeft,
          scrollWeight = isVertical ? scroller.scrollHeight : scroller.scrollWidth;
        if (scrollable || scrollSize <= scrollStartOffset || scrollSize >= scrollWeight) {
          if (!!event && event.cancelable) {
            event.stopImmediatePropagation();
            event.preventDefault();
          }
        }
      }
    };

    $list.pipe(
      takeUntilDestroyed(),
      filter(element => !!element),
      switchMap(element => {
        return fromEvent<KeyboardEvent>(element, EVENT_KEY_DOWN).pipe(
          takeUntilDestroyed(this._destroyRef),
          switchMap(e => {
            switch (e.key) {
              case KEY_ARR_LEFT:
                if (!this.isVertical) {
                  preventKeyboardEvent(e, this.isVertical);
                }
                break;
              case KEY_ARR_UP:
                if (this.isVertical) {
                  preventKeyboardEvent(e, this.isVertical);
                }
                break;
              case KEY_ARR_RIGHT:
                if (!this.isVertical) {
                  preventKeyboardEvent(e, this.isVertical);
                }
                break;
              case KEY_ARR_DOWN:
                if (this.isVertical) {
                  preventKeyboardEvent(e, this.isVertical);
                }
                break;
            }
            return of(null);
          }),
        );
      }),
    ).subscribe();

    const $scrollbarThickness = toObservable(this.scrollbarThickness);
    $scrollbarThickness.pipe(
      takeUntilDestroyed(),
      filter(v => !!v),
      tap(scrollbarThickness => {
        this._service.scrollBarSize = scrollbarThickness;
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

    this._service.$scrollTo.pipe(
      takeUntilDestroyed(),
      filter(v => !!v),
      tap(params => {
        const { id, cb, options } = params
        this.scrollTo(id, cb, options);
      }),
    ).subscribe();

    this._service.$scrollToEnd.pipe(
      takeUntilDestroyed(),
      tap(options => {
        this.scrollToEnd(null, options);
      }),
    ).subscribe();

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

    const $update = this.$update,
      renderStabilizer = (options?: IRenderStabilizerOptions) => {
        let renderStabilizerPrevScrollStateVersion = EMPTY_SCROLL_STATE_VERSION,
          renderStabilizerUpdateIterations = 0;
        const prepareIterations = options?.prepareIterations ?? PREPARE_ITERATIONS,
          prepareReupdateLength = options?.prepareReupdateLength ?? PREPARATION_REUPDATE_LENGTH;
        return of(null).pipe(
          takeUntilDestroyed(this._destroyRef),
          switchMap(() => {
            renderStabilizerPrevScrollStateVersion = EMPTY_SCROLL_STATE_VERSION;
            renderStabilizerUpdateIterations = 0;
            this._cached = false;
            return $update.pipe(
              takeUntilDestroyed(this._destroyRef),
              debounceTime(0),
              switchMap((v) => {
                if (((renderStabilizerPrevScrollStateVersion === EMPTY_SCROLL_STATE_VERSION) || (renderStabilizerPrevScrollStateVersion !== v)) &&
                  (renderStabilizerUpdateIterations < prepareIterations)) {
                  if (v !== EMPTY_SCROLL_STATE_VERSION) {
                    renderStabilizerPrevScrollStateVersion = v;
                  }
                  this._$fireUpdate.next(false);
                  return of(false);
                }
                if (renderStabilizerPrevScrollStateVersion === v) {
                  if (renderStabilizerUpdateIterations < prepareReupdateLength) {
                    renderStabilizerUpdateIterations++;
                    this._$fireUpdate.next(false);
                    return of(false);
                  }
                }
                renderStabilizerPrevScrollStateVersion = v;
                return of(true);
              }),
              filter(v => !!v),
              distinctUntilChanged(),
            )
          }),
        )
      };
    const $initialRenderStabilizer = renderStabilizer({
      prepareIterations: PREPARE_ITERATIONS,
      prepareReupdateLength: PREPARATION_REUPDATE_LENGTH,
    }),
      $updateItemsRenderStabilizer = renderStabilizer({
        prepareIterations: PREPARE_ITERATIONS_FOR_UPDATE_ITEMS,
        prepareReupdateLength: PREPARATION_REUPDATE_LENGTH_FOR_UPDATE_ITEMS,
      }),
      $chunkLoadingRenderStabilizer = renderStabilizer({
        prepareIterations: PREPARE_ITERATIONS_FOR_UPDATE_ITEMS,
        prepareReupdateLength: PREPARATION_REUPDATE_LENGTH_FOR_UPDATE_ITEMS,
      }),
      $collapseItemsRenderStabilizer = renderStabilizer({
        prepareIterations: PREPARE_ITERATIONS_FOR_COLLAPSE_ITEMS,
        prepareReupdateLength: PREPARATION_REUPDATE_LENGTH_FOR_COLLAPSE_ITEMS,
      }),
      $itemConfigMap = toObservable(this.itemConfigMap).pipe(
        map(v => !v ? {} : v),
      ),
      $divides = toObservable(this.divides),
      $dynamicSize = toObservable(this.dynamicSize),
      $snapScrollToStart = toObservable(this.snapScrollToStart),
      $snapScrollToEnd = toObservable(this.snapScrollToEnd),
      $waitForPreparation = toObservable(this.waitForPreparation),
      $items = toObservable(this.items);

    combineLatest([$viewInit, $prerenderContainer, $dynamicSize, $snapScrollToStart, $snapScrollToEnd, $waitForPreparation]).pipe(
      takeUntilDestroyed(this._destroyRef),
      distinctUntilChanged(),
      filter(([init, prerenderContainer]) => !!init && !!prerenderContainer),
      debounceTime(0),
      switchMap(([, prerenderContainer, dynamicSize, snapScrollToStart, snapScrollToEnd, waitForPreparation]) => {
        if (!!dynamicSize && !snapScrollToStart && !!snapScrollToEnd && !!waitForPreparation) {
          return $items.pipe(
            takeUntilDestroyed(this._destroyRef),
            distinctUntilChanged((p, c) => {
              const pLength = p?.length ?? 0, cLength = c?.length ?? 0;
              return !((cLength > 0) || (pLength !== cLength && (pLength === 0 || cLength === 0)));
            }),
            tap(items => {
              this._trackBox.resetCollection(items, this._actualItemSize());
            }),
            switchMap(i => of((i ?? []).length > 0)),
            distinctUntilChanged(),
            tap(v => {
              if (!v) {
                this.cacheClean();
                this.cleanup();
                this._readyForShow = false;
                if (!snapScrollToStart && snapScrollToEnd) {
                  this._trackBox.isScrollEnd = true;
                }
                const scrollerComponent = this._scrollerComponent();
                if (scrollerComponent) {
                  scrollerComponent.prepared = false;
                  scrollerComponent.stopScrolling();
                }
                this.classes.set({ prepared: true });
                this._$show.next(true);
              } else {
                this._trackBox.isScrollEnd = true;
                const waitForPreparation = this.waitForPreparation();
                if (waitForPreparation) {
                  if (this.prerenderable) {
                    this._cached = false;
                    prerenderContainer!.on(this.items());
                  }
                }
                this.classes.set({ prepared: false });
                this._$show.next(false);
              }
            }),
            switchMap(v => {
              if (!v) {
                if (this.prerenderable) {
                  prerenderContainer!.off();
                }
                return of(false);
              }
              const waitForPreparation = this.waitForPreparation();
              if (waitForPreparation) {
                this._trackBox.isScrollEnd = true;
                if (this.prerenderable) {
                  this._cached = false;
                  prerenderContainer!.on(this.items());
                }
                return $initialRenderStabilizer.pipe(
                  takeUntilDestroyed(this._destroyRef),
                  take(1),
                  tap(() => {
                    this._trackBox.isScrollEnd = true;
                    if (this.prerenderable) {
                      prerenderContainer!.off();
                    }
                    this._readyForShow = true;
                    const scrollerComponent = this._scrollerComponent();
                    if (scrollerComponent) {
                      scrollerComponent.prepared = true;
                    }
                    this.classes.set({ prepared: true });
                    this._$show.next(true);
                  }),
                );
              }
              if (this.prerenderable) {
                prerenderContainer!.off();
              }
              this._readyForShow = true;
              if (!snapScrollToStart && snapScrollToEnd) {
                this._trackBox.isScrollEnd = true;
              }
              const scrollerComponent = this._scrollerComponent();
              if (scrollerComponent) {
                scrollerComponent.prepared = true;
              }
              this.classes.set({ prepared: true });
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
                this.classes.set({ prepared: false });
                this._$show.next(false);
              }
              this._trackBox.resetCollection(items, this._actualItemSize());
            }),
            switchMap(i => of((i ?? []).length > 0)),
            distinctUntilChanged(),
            filter(v => !!v),
            tap(() => {
              this._readyForShow = true;
              if (snapScrollToStart) {
                this._trackBox.isScrollStart = true;
              } else if (snapScrollToEnd) {
                this._trackBox.isScrollEnd = true;
              }
              const scrollerComponent = this._scrollerComponent();
              if (scrollerComponent) {
                scrollerComponent.prepared = true;
              }
              this.classes.set({ prepared: true });
              this._$show.next(true);
              this._$fireUpdate.next(false);
            }),
          );
        }
      }),
    ).subscribe();

    $items.pipe(
      map(v => v?.length > 0),
      distinctUntilChanged(),
      takeUntilDestroyed(this._destroyRef),
      filter(v => !!v),
      tap(() => {
        this._cached = false;
      }),
      switchMap(() => {
        return $prerender.pipe(
          takeUntilDestroyed(this._destroyRef),
          debounceTime(0),
          take(1),
          tap(cache => {
            if (!this._readyForShow) {
              this._trackBox.refreshCache(cache);
              this._cached = true;
              this._$fireUpdate.next(true);
            }
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

    $list.pipe(
      takeUntilDestroyed(),
      filter(element => !!element),
      tap(element => {
        this._service.listElement = element;
      }),
    ).subscribe();

    const $defaultItemValue = toObservable(this.defaultItemValue),
      $selectByClick = toObservable(this.selectByClick),
      $collapseByClick = toObservable(this.collapseByClick),
      $isScrollStart = toObservable(this._isScrollStart),
      $isScrollFinished = toObservable(this._isScrollEnd),
      $scrollStartOffset = toObservable(this._actualScrollStartOffset),
      $scrollEndOffset = toObservable(this._actualScrollEndOffset),
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
      filter(v => !!v && this._readyForShow),
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
      filter(v => !!v && this._readyForShow),
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

    $divides.pipe(
      takeUntilDestroyed(),
      tap(v => {
        this._trackBox.divides = v;
      }),
    ).subscribe();

    const $listBounds = toObservable(this._listBounds).pipe(
      filter(b => !!b),
    ), $scrollSize = toObservable(this._scrollSize),
      $bufferSize = toObservable(this.bufferSize).pipe(
        map(v => v < 0 ? DEFAULT_BUFFER_SIZE : v),
      ),
      $maxBufferSize = toObservable(this.maxBufferSize).pipe(
        map(v => v < 0 ? DEFAULT_BUFFER_SIZE : v),
      ),
      $snapToItem = toObservable(this.snapToItem),
      $snapToItemAlign = toObservable(this.snapToItemAlign),
      $stickyEnabled = toObservable(this.stickyEnabled),
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
      $itemTransform = toObservable(this.itemTransform),
      $screenReaderMessage = toObservable(this.screenReaderMessage),
      $displayItems = this._service.$displayItems,
      $cacheVersion = this._service.$cacheVersion;

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
        return combineLatest([$collapsedItemIds, $itemConfigMap, $trackBy, $divides]).pipe(
          takeUntilDestroyed(this._destroyRef),
          debounceTime(0),
          switchMap(([collapsedIds, itemConfigMap, trackBy, divides]) => {
            return of({ items, collapsedIds, itemConfigMap, trackBy, divides });
          }),
        );
      }),
    );

    $itemsComposition.pipe(
      takeUntilDestroyed(),
      switchMap(({ items, collapsedIds, itemConfigMap, trackBy, divides }) => {
        if (items.length === 0 || !this._readyForShow || !(this.cachable && !this._cached &&
          !this._trackBox.isSnappedToStart && this._trackBox.isSnappedToEnd)) {
          return of({ items, collapsedIds, itemConfigMap, trackBy, divides });
        }
        return $updateItemsRenderStabilizer.pipe(
          takeUntilDestroyed(this._destroyRef),
          take(1),
          debounceTime(0),
          switchMap(() => {
            return of({ items, collapsedIds, itemConfigMap, trackBy, divides });
          }),
        );
      }),
      tap(({ items, collapsedIds, itemConfigMap, trackBy, divides }) => {
        const hiddenItems = new CMap<Id, boolean>();

        let isCollapsed = false;
        for (let i = 0, l = items.length; i < l; i++) {
          const item = items[i], id = item?.[trackBy];
          if (!!item) {
            const group = (itemConfigMap[id]?.sticky ?? 0) > 0, collapsed = collapsedIds.includes(id);
            if (!!group) {
              isCollapsed = collapsed;
            } else {
              if (isCollapsed) {
                hiddenItems.set(id, true);
              }
            }
          }
        }

        const actualItems: IVirtualListCollection = [];
        for (let i = 0, l = items.length; i < l; i++) {
          const item = items[i], id = item?.[trackBy];
          if (!!item && hiddenItems.has(id)) {
            continue;
          }
          actualItems.push(item);
        }

        this._actualItems.set(normalizeCollection(actualItems, itemConfigMap, trackBy, divides));
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

    const $preventScrollSnapping = this.$preventScrollSnapping;

    $preventScrollSnapping.pipe(
      takeUntilDestroyed(),
      filter(v => !!v),
      tap(() => {
        if (this._readyForShow) {
          this._trackBox.isScrollEnd;
          this._trackBox.isScrollStart = this._trackBox.isScrollEnd = false;
          this._isScrollStart.set(false);
          this._isScrollEnd.set(false);
          const scroller = this._scrollerComponent();
          if (!!scroller) {
            this._trackBox.preventScrollSnapping(true);
          }
        }
      }),
      tap(() => {
        if (this._readyForShow) {
          this._$preventScrollSnapping.next(false);
        }
      }),
    ).subscribe();

    $collapsedItemIds.pipe(
      takeUntilDestroyed(),
      filter(() => this._readyForShow),
      switchMap(() => {
        return $collapseItemsRenderStabilizer.pipe(
          takeUntilDestroyed(this._destroyRef),
          take(1),
          tap(() => {
            this._$fireUpdate.next(true);
          }),
        );
      }),
    ).subscribe();

    let isChunkLoading = false;
    const $loading = toObservable(this.loading);
    $loading.pipe(
      takeUntilDestroyed(),
      distinctUntilChanged(),
      skip(1),
      filter(v => !v),
      switchMap(() => {
        isChunkLoading = true;
        const scrollbar = this._scrollerComponent();
        if (!!scrollbar) {
          scrollbar.stopScrollbar();
          scrollbar.refreshScrollbar();
        }
        return $actualItems.pipe(
          takeUntilDestroyed(this._destroyRef),
          take(1),
          tap(() => {
            this._$fireUpdateNextFrame.next(true);
          }),
          switchMap(() => $chunkLoadingRenderStabilizer.pipe(
            takeUntilDestroyed(this._destroyRef),
            take(1),
            tap(() => {
              isChunkLoading = false;
              this._trackBox.resetCacheChunkInfo();
              const scrollbar = this._scrollerComponent();
              if (!!scrollbar) {
                scrollbar.stopScrollbar();
                scrollbar.refreshScrollbar();
              }
            }),
          )),
        );
      }),
    ).subscribe();

    $loading.pipe(
      takeUntilDestroyed(),
      skip(1),
      distinctUntilChanged(),
      tap(v => {
        if (v) {
          this._isLoading = true;
        }
      }),
      filter(v => !v),
      tap(() => {
        if (this._readyForShow) {
          this._$preventScrollSnapping.next(true);
        }
      }),
      debounceTime(100),
      tap(() => {
        this._isLoading = false;
      }),
    ).subscribe();

    const update = (params: {
      snapScrollToStart: boolean, snapScrollToEnd: boolean; bounds: ISize; listBounds: ISize; scrollEndOffset: number;
      items: IVirtualListCollection<Object>; itemConfigMap: IVirtualListItemConfigMap; scrollSize: number; itemSize: number;
      minItemSize: number; maxItemSize: number; bufferSize: number; maxBufferSize: number; stickyEnabled: boolean; isVertical: boolean;
      dynamicSize: boolean; divides: number; enabledBufferOptimization: boolean; cacheVersion: number; userAction: boolean;
      snapToItem: boolean, snapToItemAlign: SnapToItemAlign, collapsedIds: Array<Id>; itemTransform: ItemTransform | null;
    }) => {
      const {
        snapScrollToStart, snapScrollToEnd, bounds, listBounds, scrollEndOffset, items, itemConfigMap, scrollSize, itemSize, minItemSize,
        maxItemSize, divides, bufferSize, maxBufferSize, stickyEnabled, isVertical, dynamicSize, enabledBufferOptimization, snapToItem,
        snapToItemAlign, cacheVersion, userAction, collapsedIds,
        itemTransform,
      } = params;
      const scroller = this._scrollerComponent();
      let totalSize = 0;
      if (scroller) {
        const collapsable = collapsedIds.length > 0, cachable = this.cachable, cached = this._cached, waitingCache = cachable && !cached,
          emitUpdate = !this._readyForShow || waitingCache || collapsable || isChunkLoading,
          fireUpdate = !this._readyForShow || this._$scrollingTo.getValue();
        if (this._readyForShow || (cachable && cached)) {
          const currentScrollSize = (isVertical ? scroller.scrollTop ?? 0 : scroller.scrollLeft ?? 0);
          let actualScrollSize = !this._readyForShow && snapScrollToEnd ? (isVertical ? scroller.scrollHeight ?? 0 : scroller.scrollWidth ?? 0) :
            (isVertical ? scroller.scrollTop ?? 0 : scroller.scrollLeft ?? 0),
            displayItems: IRenderVirtualListCollection;

          const { width, height } = bounds, viewportSize = (isVertical ? height : width),
            opts: IUpdateCollectionOptions<IVirtualListItem, IVirtualListCollection> = {
              bounds: { width, height }, dynamicSize, isVertical, itemSize, minItemSize, maxItemSize, bufferSize, maxBufferSize,
              scrollSize: actualScrollSize, stickyEnabled, enabledBufferOptimization, snapToItem, snapToItemAlign, itemTransform,
            };

          if (snapScrollToEnd && !this._readyForShow) {
            const { displayItems: calculatedDisplayItems, totalSize: calculatedTotalSize1 } =
              this._trackBox.updateCollection(items, itemConfigMap, { ...opts, scrollSize: actualScrollSize });
            displayItems = calculatedDisplayItems;
            totalSize = calculatedTotalSize1;
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

          this.snappingHandler();

          const delta = this._trackBox.delta,
            scrollPositionAfterUpdate = actualScrollSize + delta,
            roundedScrollPositionAfterUpdate = scrollPositionAfterUpdate,
            roundedMaxPositionAfterUpdate = totalSize - viewportSize;

          if (this._isSnappingMethodAdvanced) {
            this.updateRegularRenderer();
          }

          scroller.delta = delta;

          if ((snapScrollToStart && this._trackBox.isSnappedToStart) ||
            (snapScrollToStart && currentScrollSize <= MIN_PIXELS_FOR_PREVENT_SNAPPING)) {
            if (currentScrollSize !== roundedScrollPositionAfterUpdate) {
              this._trackBox.clearDelta();

              if (this._readyForShow) {
                this.emitScrollEvent(true, false, userAction);
              }
              this._trackBox.isScrollEnd;
              const params: IScrollToParams = {
                [isVertical ? TOP_PROP_NAME : LEFT_PROP_NAME]: 0, userAction,
                fireUpdate, behavior: BEHAVIOR_INSTANT,
                blending: false, duration: this.animationParams().scrollToItem,
              };
              scroller?.scrollTo?.(params);
              if (emitUpdate) {
                this._$update.next(this.getScrollStateVersion(totalSize, this._isVertical ? scroller.scrollTop : scroller.scrollLeft, cacheVersion));
              }
            }
            return;
          }

          if ((snapScrollToEnd && this._trackBox.isSnappedToEnd) || (!snapScrollToStart && snapScrollToEnd && !scroller.scrollable) ||
            (scrollPositionAfterUpdate + MIN_PIXELS_FOR_PREVENT_SNAPPING >= roundedMaxPositionAfterUpdate) ||
            (roundedScrollPositionAfterUpdate >= scrollPositionAfterUpdate + MIN_PIXELS_FOR_PREVENT_SNAPPING)) {
            this._trackBox.clearDelta();

            if (!this._trackBox.isSnappedToEnd) {
              this._trackBox.isScrollStart = false;
              this._trackBox.isScrollEnd = true;
            }

            if (this._readyForShow) {
              this.emitScrollEvent(true, false, false);
            }
            const params: IScrollToParams = {
              [isVertical ? TOP_PROP_NAME : LEFT_PROP_NAME]: roundedMaxPositionAfterUpdate,
              fireUpdate, behavior: BEHAVIOR_INSTANT, userAction: false,
              blending: false, duration: this.animationParams().scrollToItem,
            };
            scroller?.scrollTo?.(params);
            if (emitUpdate) {
              this._$update.next(this.getScrollStateVersion(totalSize, this._isVertical ? scroller.scrollTop : scroller.scrollLeft, cacheVersion));
            }
            return;
          }

          if (scrollSize !== scrollPositionAfterUpdate &&
            ((scrollPositionAfterUpdate >= 0 && scrollPositionAfterUpdate < roundedMaxPositionAfterUpdate) ||
              (scrollSize !== roundedMaxPositionAfterUpdate || currentScrollSize !== scrollPositionAfterUpdate))) {
            this._trackBox.clearDelta();

            if (this._readyForShow) {
              this.emitScrollEvent(true, false, userAction);
            }
            const params: IScrollToParams = {
              [isVertical ? TOP_PROP_NAME : LEFT_PROP_NAME]: scrollPositionAfterUpdate, blending: true, userAction,
              fireUpdate, behavior: BEHAVIOR_INSTANT, duration: this.animationParams().scrollToItem,
            };
            scroller.scrollTo(params);
            if (emitUpdate) {
              this._$update.next(this.getScrollStateVersion(totalSize, this._isVertical ? scroller.scrollTop : scroller.scrollLeft, cacheVersion));
            }
            return;
          }
        }
        if (emitUpdate) {
          this._$update.next(this.getScrollStateVersion(totalSize, this._isVertical ? scroller.scrollTop : scroller.scrollLeft, cacheVersion));
        }
      }
    };

    let prevItems: IVirtualListCollection = [];
    const debouncedUpdate = debounce(update, 0, MAX_NUMBERS_OF_SKIPS_FOR_QUALITY_OPTIMIZATION_LVL1);
    $viewInit.pipe(
      takeUntilDestroyed(),
      filter(v => !!v),
      switchMap(() => {
        return combineLatest([$snapScrollToStart, $snapScrollToEnd, $bounds, $listBounds, $scrollEndOffset, $actualItems, $itemConfigMap, $scrollSize,
          $actualItemSize, $actualMinItemSize, $actualMaxItemSize, $collapsedItemIds, $bufferSize, $maxBufferSize, $stickyEnabled, $isVertical,
          $dynamicSize, $divides, $snapToItem, $snapToItemAlign, $enabledBufferOptimization, $itemTransform, $cacheVersion, this.$fireUpdate,
        ]).pipe(
          takeUntilDestroyed(this._destroyRef),
          tap(([
            snapScrollToStart, snapScrollToEnd, bounds, listBounds, scrollEndOffset, items, itemConfigMap, scrollSize, itemSize, minItemSize,
            maxItemSize, collapsedIds, bufferSize, maxBufferSize, stickyEnabled, isVertical, dynamicSize, divides, snapToItem, snapToItemAlign,
            enabledBufferOptimization, itemTransform, cacheVersion,
          ]) => {
            let itemsChanged = false;
            if (prevItems !== items) {
              itemsChanged = true;
              prevItems = items;
            }
            const enabledOptimization = this.scrollingSettings()?.optimization ?? DEFAULT_SCROLLING_SETTINGS.optimization,
              velocity = this._scrollerComponent()?.averageVelocity ?? 0,
              isScrolling = this._$scrollingTo.getValue(),
              useDebouncedUpdate = (dynamicSize && !itemTransform) && !itemsChanged && hasUserAction && !isScrolling &&
                (velocity > 0 && velocity < MAX_VELOCITY_FOR_SCROLL_QUALITY_OPTIMIZATION_LVL1);
            if (enabledOptimization) {
              if (useDebouncedUpdate) {
                debouncedUpdate.execute({
                  snapScrollToStart, snapScrollToEnd, bounds, listBounds, scrollEndOffset, items, itemConfigMap, scrollSize, itemSize, minItemSize, maxItemSize,
                  collapsedIds, bufferSize, maxBufferSize, stickyEnabled, isVertical, dynamicSize, divides, enabledBufferOptimization, itemTransform,
                  snapToItem, snapToItemAlign, cacheVersion, userAction: hasUserAction,
                });
                return;
              }

              debouncedUpdate.dispose();
            }

            if (!isScrolling) {
              let i = dynamicSize ? 1 : 2;
              while (i > 0) {
                update({
                  snapScrollToStart, snapScrollToEnd, bounds, listBounds, scrollEndOffset, items, itemConfigMap, scrollSize, itemSize, minItemSize, maxItemSize,
                  collapsedIds, bufferSize, maxBufferSize, stickyEnabled, isVertical, dynamicSize, divides, enabledBufferOptimization, itemTransform,
                  snapToItem, snapToItemAlign, cacheVersion, userAction: hasUserAction,
                });
                i--;
              }
            }
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
      $scrollerScroll = $scrollerComponent.pipe(
        takeUntilDestroyed(),
        filter(v => !!v),
        take(1),
        switchMap(scroller => scroller.$scroll),
      ),
      $scrollerScrollEnd = $scrollerComponent.pipe(
        takeUntilDestroyed(),
        filter(v => !!v),
        take(1),
        switchMap(scroller => scroller.$scrollEnd),
      ),
      $scrollbarScroll = $scrollerComponent.pipe(
        takeUntilDestroyed(),
        filter(v => !!v),
        take(1),
        switchMap(scroller => scroller.$scrollbarScroll),
      );

    const scrollHandler = (userAction: boolean = false) => {
      const scroller = this._scrollerComponent();
      if (!!scroller) {
        const isVertical = this._isVertical,
          scrollSize = (isVertical ? scroller.scrollTop : scroller.scrollLeft),
          actualScrollSize = scrollSize;

        if (this._readyForShow) {
          if (userAction) {
            this._$preventScrollSnapping.next(true);
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
            const scrollerEl = this._scroller()?.nativeElement, scrollerComponent = this._scrollerComponent();
            if (scrollerEl && scrollerComponent) {
              this.emitScrollEvent(false, this._readyForShow, hasUserAction);
            }
            if (this._readyForShow) {
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
          this.emitScrollEvent(false, this._readyForShow, userAction);
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
          this.emitScrollEvent(true, this._readyForShow, userAction);
        }
        scrollHandler(userAction);
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
          { id, iteration = 0, alignment = ScrollAlignments.NONE, blending = false, isLastIteration = false, cb } = event;
        const nextIteration = iteration + 1, finished = nextIteration >= MAX_SCROLL_TO_ITERATIONS, fireUpdate = false;

        if (!this._readyForShow) {
          return of([finished, { id, alignment, iteration: nextIteration, blending, cb }]).pipe(delay(0));
        }

        debouncedUpdate.dispose();
        this._$preventScrollSnapping.next(true);

        if (scrollerComponent) {
          const items = this._actualItems();
          if (items && items.length) {
            const dynamicSize = this.dynamicSize(), itemSize = this._actualItemSize(), minItemSize = this._actualMinItemSize(),
              maxItemSize = this._actualMaxItemSize(), snapScrollToEnd = this.snapScrollToEnd();

            if (dynamicSize) {
              const { width, height } = this._bounds() || { width: DEFAULT_LIST_SIZE, height: DEFAULT_LIST_SIZE },
                itemConfigMap = this.itemConfigMap(), items = this._actualItems(), isVertical = this._isVertical,
                currentScrollSize = isVertical ? scrollerComponent.scrollTop : scrollerComponent.scrollLeft,
                opts: IGetItemPositionOptions<IVirtualListItem, IVirtualListCollection> = {
                  bounds: { width, height }, collection: items, dynamicSize, isVertical: this._isVertical, itemSize, minItemSize, maxItemSize,
                  bufferSize: this.bufferSize(), maxBufferSize: this.maxBufferSize(), itemTransform: this.itemTransform(),
                  scrollSize: (isVertical ? scrollerComponent.scrollTop : scrollerComponent.scrollLeft),
                  snapToItem: this.snapToItem(), snapToItemAlign: this.snapToItemAlign(),
                  stickyEnabled: this.stickyEnabled(), fromItemId: id, enabledBufferOptimization: this.enabledBufferOptimization(),
                };

              let scrollSize = snapScrollToEnd && this._trackBox.isSnappedToEnd ?
                (isVertical ? scrollerComponent.scrollHeight : scrollerComponent.scrollWidth) :
                this._trackBox.getItemPosition(id, itemConfigMap, opts);

              if (scrollSize === -1) {
                return of([finished, { id, alignment, blending, iteration: nextIteration, cb }]).pipe(delay(0));
              }

              this._trackBox.clearDelta();

              const { displayItems, totalSize } = this._trackBox.updateCollection(items, itemConfigMap, {
                ...opts, scrollSize, fromItemId: isLastIteration ? undefined : id,
              }), delta1 = this._trackBox.delta;

              scrollerComponent.totalSize = totalSize;

              this._service.collection = displayItems;

              let actualScrollSize = scrollSize + delta1;

              this.resetBoundsSize(isVertical, totalSize);

              this.createDisplayComponentsIfNeed(displayItems);

              this.tracking();

              this.snappingHandler();

              scrollSize = this._trackBox.getItemPosition(id, itemConfigMap, { ...opts, scrollSize: actualScrollSize, fromItemId: id });
              if (scrollSize === -1) {
                return of([finished, { id, alignment, blending, iteration: nextIteration, cb }]).pipe(delay(0));
              }
              const notChanged = scrollSize === currentScrollSize;
              if (!notChanged && iteration < MAX_SCROLL_TO_ITERATIONS) {
                this._trackBox.clearDelta();
                const params: IScrollToParams = {
                  [isVertical ? TOP_PROP_NAME : LEFT_PROP_NAME]: scrollSize, behavior: BEHAVIOR_INSTANT as ScrollBehavior,
                  fireUpdate, blending, snap: false,
                };
                scrollerComponent?.scrollTo?.(params);
                return of([finished, {
                  alignment, id, iteration: nextIteration, blending,
                  isLastIteration: nextIteration < MAX_SCROLL_TO_ITERATIONS, cb
                }]).pipe(delay(0));
              } else {
                this._scrollSize.set(actualScrollSize);
                return of([true, { id, alignment, blending, iteration: nextIteration, cb }]).pipe(delay(0));
              }
            } else {
              const index = items.findIndex(item => item[trackBy] === id);
              if (index > -1) {
                const isVertical = this._isVertical,
                  currentScrollSize = (isVertical ? scrollerComponent.scrollTop : scrollerComponent.scrollLeft),
                  scrollSize = index * this._actualItemSize();
                if (currentScrollSize !== (scrollSize)) {
                  this._$preventScrollSnapping.next(true);
                  const params: IScrollToParams = {
                    [this._isVertical ? TOP_PROP_NAME : LEFT_PROP_NAME]: scrollSize, fireUpdate,
                    behavior: BEHAVIOR_INSTANT as ScrollBehavior, blending, snap: false,
                  };
                  scrollerComponent?.scrollTo?.(params);
                  return of([true, { id, alignment, blending, iteration: nextIteration, cb }]);
                }
              }
            }
          }
        }
        return of([finished, { id, iteration: nextIteration, cb }]);
      }),
      takeUntilDestroyed(),
      switchMap(([finished, params]) => {
        const scrollParams = params as IScrollParams & { scrollCalled: boolean; };
        if (!finished && !scrollParams?.scrollCalled) {
          this._$scrollToExecutor.next(params as IScrollParams);
          return of([finished, scrollParams]);
        }

        if (this._readyForShow) {
          this._trackBox.preventScrollSnapping(true);
        }

        const scrollerComponent = this._scrollerComponent();
        if (!!scrollerComponent) {
          const isVertical = this._isVertical,
            { width, height } = this._bounds() || { width: DEFAULT_LIST_SIZE, height: DEFAULT_LIST_SIZE },
            currentScrollSize = (isVertical ? scrollerComponent.scrollTop : scrollerComponent.scrollLeft),
            alignmentOffset = (scrollParams.alignment === ScrollAlignments.CENTER ?
              (((isVertical ? (height - (this._trackBox.getItemBounds(scrollParams.id)?.height ?? 0)) :
                (width - (this._trackBox.getItemBounds(scrollParams.id)?.width ?? 0)))) * .5) : 0);

          const params: IScrollToParams = {
            [this._isVertical ? TOP_PROP_NAME : LEFT_PROP_NAME]: currentScrollSize - alignmentOffset, fireUpdate: true,
            behavior: BEHAVIOR_INSTANT as ScrollBehavior, blending: false, snap: false,
          };

          scrollerComponent.scrollTo(params);
          this._$fireUpdate.next(true);

          this._scrollerComponent()?.scrollToComplete();

          return of([finished, scrollParams]).pipe(
            takeUntilDestroyed(this._destroyRef),
            delay(100),
          );
        }

        return of([finished, scrollParams]);
      }),
      filter(([finished]) => !!finished),
      tap(([, params]) => {
        const scrollParams = params as IScrollParams & { scrollCalled: boolean; };
        this._$scrollingTo.next(false);
        this._$fireUpdate.next(true);
        this._scrollerComponent()?.scrollToComplete();
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
        this._service.selectedIds = v;
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
        this._service.collapsedIds = v;
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

  private onAfterResize(update = false) {
    this.snappingHandler();

    if (this._isSnappingMethodAdvanced) {
      this.updateRegularRenderer();
    }

    if (this._readyForShow && update) {
      const scroller = this._scrollerComponent();
      if (!!scroller) {
        const updatebale = this._readyForShow;
        if (updatebale) {
          this._$fireUpdate.next(false);
        }
        scroller.refresh(updatebale, updatebale);
      }
    }
  }

  private checkBoundsOfElements() {
    const changed = this._trackBox.checkBoundsOfElements();
    if (changed) {
      const readyForShow = this._readyForShow,
        isScrolling = this._$scrollingTo.getValue();
      this._trackBox.changes(true, readyForShow && !isScrolling);
    }
  }

  private snappingHandler() {
    const scroller = this._scrollerComponent();
    if (!!scroller) {
      const isVertical = this.isVertical,
        maxScrollSize = Math.round(isVertical ? scroller.scrollHeight ?? 0 : scroller.scrollWidth ?? 0),
        scrollSize = isVertical ? scroller.scrollTop ?? 0 : scroller.scrollLeft ?? 0,
        actualScrollSize = Math.round(scrollSize);
      if (this._readyForShow && !this._isLoading) {
        if (maxScrollSize >= 0) {
          const isScrollStart = (actualScrollSize <= MIN_PIXELS_FOR_PREVENT_SNAPPING);
          if (isScrollStart) {
            this._isScrollStart.set(true);
            this._isScrollEnd.set(false);
            this._trackBox.isScrollStart = true;
            this._trackBox.isScrollEnd = false;
          } else {
            const isScrollEnd = (actualScrollSize >= (maxScrollSize - MIN_PIXELS_FOR_PREVENT_SNAPPING));
            this._isScrollStart.set(false);
            this._isScrollEnd.set(isScrollEnd);
            this._trackBox.isScrollStart = false;
            this._trackBox.isScrollEnd = isScrollEnd;
          }
        }
      } else if (!this._readyForShow) {
        const snapScrollToStart = this.snapScrollToStart(), snapScrollToEnd = this.snapScrollToEnd();
        if (!snapScrollToStart && snapScrollToEnd) {
          this._isScrollStart.set(false);
          this._isScrollEnd.set(true);
          this._trackBox.isScrollStart = false;
          this._trackBox.isScrollEnd = true;
        } else if (snapScrollToStart && snapScrollToEnd) {
          this._isScrollStart.set(true);
          this._isScrollEnd.set(false);
          this._trackBox.isScrollStart = true;
          this._trackBox.isScrollEnd = false;
        } else {
          this._isScrollStart.set(false);
          this._isScrollEnd.set(false);
          this._trackBox.isScrollStart = false;
          this._trackBox.isScrollEnd = false;
        }
      }
    }
  };

  private emitScrollEvent(isScrollEnd: boolean = false, update: boolean = true, userAction: boolean = false) {
    if (!this._readyForShow) {
      return;
    }
    const scrollerEl = this._scroller()?.nativeElement, scrollerComponent = this._scrollerComponent();
    if (scrollerEl && scrollerComponent) {
      const isVertical = this._isVertical, scrollSize = (isVertical ? scrollerComponent.scrollTop : scrollerComponent.scrollLeft),
        maxScrollSize = (isVertical ? scrollerComponent.scrollHeight : scrollerComponent.scrollWidth),
        bounds = this._bounds() || { x: 0, y: 0, width: DEFAULT_LIST_SIZE, height: DEFAULT_LIST_SIZE };
      const itemsRange = formatActualDisplayItems(this._service.displayItems, this._actualScrollStartOffset(), this._actualScrollEndOffset(),
        scrollSize, isVertical, bounds),
        event = new ScrollEvent({
          direction: this._scrollerComponent()?.scrollDirection ?? 0, container: scrollerEl,
          list: this._list()!.nativeElement, delta: this._trackBox.delta,
          deltaOfNewItems: this._trackBox.deltaOfNewItems, isVertical,
          scrollSize,
          itemsRange,
          isEnd: !scrollerComponent.scrollable || this._trackBox.isSnappedToEnd || (Math.round(scrollSize) === Math.round(maxScrollSize)),
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

    if (this._isSnappingMethodAdvanced && this.stickyEnabled()) {
      if (this._snappedDisplayComponents.length < MAX_REGULAR_SNAPED_COMPONENTS && this._snapContainerRef) {
        while (this._snappedDisplayComponents.length < MAX_REGULAR_SNAPED_COMPONENTS) {
          const comp = this._snapContainerRef.createComponent(this._itemComponentClass);
          comp.instance.renderer = this._itemRenderer();
          comp.instance.regular = true;
          this._snappedDisplayComponents.push(comp);
          this._trackBox.snappedDisplayComponents = this._snappedDisplayComponents;
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
    return this._service.getItemBounds(id);
  }

  /**
   * Focus an list item by a given id.
   */
  focus(id: Id, align: FocusAlignment = FocusAlignments.NONE) {
    this._elementRef.nativeElement.focus();
    this._service.focusById(id, align, this.scrollBehavior());
  }

  /**
   * The method scrolls the list to the element with the given `id` and returns the value of the scrolled area.
   */
  scrollTo(id: Id, cb: (() => void) | null = null, options: IScrollOptions | null = null) {
    const alignment = options?.alignment ?? ScrollAlignments.NONE,
      behavior = options?.behavior ?? BEHAVIOR_INSTANT,
      blending = options?.blending ?? false,
      focused = options?.focused ?? true,
      iteration = options?.iteration ?? 0;
    validateId(id);
    validateScrollBehavior(behavior);
    validateIteration(iteration);
    const actualIteration = validateScrollIteration(iteration);
    this._elementRef.nativeElement.focus();
    if (!this._scrollerComponent()?.scrollable) {
      this.scrollToFinalize(id, focused, cb);
      return;
    }
    this._$scrollTo.next({
      id, alignment, behavior, blending, iteration: actualIteration, isLastIteration: actualIteration === MAX_SCROLL_TO_ITERATIONS, cb: () => {
        this.scrollToFinalize(id, focused, cb);
      }
    });
  }

  /**
   * Scrolls the scroll area to the first item in the collection.
   */
  scrollToStart(cb: (() => void) | null = null, options: Omit<IScrollOptions, 'alignment'> | null = null) {
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
    const trackBy = this.trackBy(), items = this._actualItems(), firstItem = items.length > 0 ? items[0] ?? null : null, id = firstItem?.[trackBy] ?? null,
      actualIteration = validateScrollIteration(iteration);
    if (!!firstItem) {
      this._elementRef.nativeElement.focus();
      this._$scrollTo.next({
        id, behavior, blending, iteration: actualIteration, isLastIteration: actualIteration === MAX_SCROLL_TO_ITERATIONS, cb: () => {
          this._isScrollStart.set(true);
          this._trackBox.isScrollStart = true;
          this._trackBox.isScrollEnd = false;
          this._$fireUpdate.next(true);
          this.scrollToFinalize(id, focused, cb);
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
  scrollToEnd(cb: (() => void) | null = null, options: Omit<IScrollOptions, 'alignment'> | null = null) {
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
    const trackBy = this.trackBy(), items = this._actualItems(), latItem = items[items.length > 0 ? items.length - 1 : 0], id = latItem[trackBy],
      actualIteration = validateScrollIteration(iteration);
    this._elementRef.nativeElement.focus();
    if (!this._scrollerComponent()?.scrollable) {
      this.scrollToFinalize(id, focused, cb);
      return;
    }
    this._$scrollTo.next({
      id, behavior, blending, iteration: actualIteration, isLastIteration: actualIteration === MAX_SCROLL_TO_ITERATIONS, cb: () => {
        this._isScrollEnd.set(true);
        this._trackBox.isScrollStart = false;
        this._trackBox.isScrollEnd = true;
        this._$fireUpdate.next(true);
        this.scrollToFinalize(id, focused, cb);
      }
    });
  }

  private scrollToFinalize(id: Id, focused: boolean, cb: (() => void) | null) {
    if (focused) {
      const el = this._service.getFocusedElementById(id);
      if (!!el) {
        this._service.focus(el, FocusAlignments.NONE);
      }
    }
    if (typeof cb === 'function') {
      cb?.();
    }
  }

  protected cleanup() {
    const displayItems: IRenderVirtualListCollection = [];
    this._service.collection = displayItems;
    this.createDisplayComponentsIfNeed(displayItems);
    this.tracking();
    this.emitScrollEvent(true, false, false);
  }

  /**
   * Force clearing the cache.
   */
  protected cacheClean() {
    this._cached = false;
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
    if (!this._readyForShow) {
      return;
    }
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

    if (!!this._resizeSnappedObserver) {
      this._resizeSnappedObserver.disconnect();
    }

    if (!!this._snappedDisplayComponents) {
      while (this._snappedDisplayComponents.length > 0) {
        const comp = this._snappedDisplayComponents.shift();
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
