import {
  ChangeDetectionStrategy, Component, ComponentRef, ElementRef, EventEmitter, inject, Input,
  OnDestroy, Output, TemplateRef, ViewChild, ViewContainerRef, ViewEncapsulation,
} from '@angular/core';
import {
  BehaviorSubject, combineLatest, debounceTime, delay, distinctUntilChanged, filter, fromEvent, map,
  Observable,
  of, skip, Subject, switchMap, take, takeUntil, tap,
} from 'rxjs';
import { NgVirtualListItemComponent } from './components/ng-list-item/ng-virtual-list-item.component';
import {
  BEHAVIOR_INSTANT, CLASS_LIST_HORIZONTAL, CLASS_LIST_VERTICAL, DEFAULT_DIRECTION, DEFAULT_DYNAMIC_SIZE,
  DEFAULT_ENABLED_BUFFER_OPTIMIZATION, DEFAULT_ITEM_SIZE, DEFAULT_BUFFER_SIZE, DEFAULT_LIST_SIZE, DEFAULT_SNAP, DEFAULT_SNAPPING_METHOD,
  HEIGHT_PROP_NAME, LEFT_PROP_NAME, MAX_SCROLL_TO_ITERATIONS, PX, FOCUS, TOP_PROP_NAME, TRACK_BY_PROPERTY_NAME, WIDTH_PROP_NAME,
  DEFAULT_MAX_BUFFER_SIZE, DEFAULT_SELECT_METHOD, DEFAULT_SELECT_BY_CLICK, DEFAULT_COLLAPSE_BY_CLICK, DEFAULT_COLLECTION_MODE,
  DEFAULT_SCREEN_READER_MESSAGE, DEFAULT_SNAP_TO_END_TRANSITION_INSTANT_OFFSET, DEFAULT_SNAP_SCROLLTO_END, MIN_PIXELS_FOR_PREVENT_SNAPPING,
  MOUSE_DOWN, TOUCH_START, DEFAULT_LANG_TEXT_DIR, DEFAULT_CLICK_DISTANCE, DEFAULT_WAIT_FOR_PREPARATION, DEFAULT_SCROLLBAR_THICKNESS,
  DEFAULT_SCROLLBAR_MIN_SIZE, KEY_DOWN, BEHAVIOR_AUTO, DEFAULT_SCROLLBAR_ENABLED, DEFAULT_SCROLLBAR_INTERACTIVE, DEFAULT_OVERSCROLL_ENABLED,
  DEFAULT_ANIMATION_PARAMS, DEFAULT_SCROLL_BEHAVIOR, DEFAULT_SNAP_SCROLLTO_START, EMPTY_SCROLL_STATE_VERSION, MAX_REGULAR_SNAPED_COMPONENTS,
  PREPARE_ITERATIONS, PREPARATION_REUPDATE_LENGTH, ROLE_LIST_BOX, ROLE_LIST, KEY_TAB, MAX_VELOCITY_FOR_SCROLL_QUALITY_OPTIMIZATION_LVL1,
  MAX_VELOCITY_FOR_SCROLL_QUALITY_OPTIMIZATION_LVL2, PREPARE_ITERATIONS_FOR_UPDATE_ITEMS, PREPARATION_REUPDATE_LENGTH_FOR_UPDATE_ITEMS,
  PREPARE_ITERATIONS_FOR_COLLAPSE_ITEMS, PREPARATION_REUPDATE_LENGTH_FOR_COLLAPSE_ITEMS, MAX_NUMBERS_OF_SKIPS_FOR_QUALITY_OPTIMIZATION_LVL1,
  DEFAULT_SCROLLING_SETTINGS,
} from './const';
import {
  IRenderVirtualListItem, IVirtualListCollection, IVirtualListItem, IVirtualListItemConfigMap,
} from './models';
import {
  IScrollEvent, IScrollOptions, IAnimationParams, ISize, IRenderStabilizerOptions,
  IScrollingSettings,
} from './interfaces';
import { FocusAlignment, Id } from './types';
import { IRenderVirtualListCollection } from './models/render-collection.model';
import {
  CollectionMode, CollectionModes, Direction, Directions, FocusAlignments, MethodForSelecting, MethodsForSelecting,
  SnappingMethod, SnappingMethods, TextDirection, TextDirections,
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
import { validateArray, validateBoolean, validateFloat, validateInt, validateObject, validateString } from './utils/validation';
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
import { DisposableComponent } from './utils/disposable-component';

/**
 * Virtual list component.
 * Maximum performance for extremely large lists.
 * It is based on algorithms for virtualization of screen objects.
 * @link https://github.com/DjonnyX/ng-virtual-list/blob/14.x/projects/ng-virtual-list/src/lib/ng-virtual-list.component.ts
 * @author Evgenii Alexandrovich Grebennikov
 * @email djonnyx@gmail.com
 */
@Component({
  selector: 'ng-virtual-list',
  templateUrl: './ng-virtual-list.component.html',
  styleUrls: ['./ng-virtual-list.component.scss'],
  host: {
    'style': 'position: relative;'
  },
  changeDetection: ChangeDetectionStrategy.OnPush,
  encapsulation: ViewEncapsulation.ShadowDom,
  providers: [NgVirtualListService, NgVirtualListPublicService],
})
export class NgVirtualListComponent extends DisposableComponent implements OnDestroy {
  private static __nextId: number = 0;

  private _id: number = NgVirtualListComponent.__nextId;

  /**
   * Readonly. Returns the unique identifier of the component.
   */
  get id() { return this._id; }

  private _service = inject(NgVirtualListService);

  @ViewChild('prerender', { read: NgPrerenderContainer })
  private _prerender: NgPrerenderContainer | undefined;

  @ViewChild('renderersContainer', { read: ViewContainerRef })
  private _listContainerRef: ViewContainerRef | undefined;

  @ViewChild('snapRendererContainer', { read: ViewContainerRef })
  private _snapContainerRef: ViewContainerRef | undefined;

  @ViewChild('scroller', { read: NgScrollerComponent })
  private _scrollerComponent: NgScrollerComponent | undefined;

  private _$scroller = new BehaviorSubject<ElementRef<HTMLDivElement> | undefined>(undefined);
  protected readonly $scroller = this._$scroller.asObservable();

  private _$list = new BehaviorSubject<ElementRef<HTMLDivElement> | undefined>(undefined);
  protected readonly $list = this._$list.asObservable();

  /**
   * Fires when the list has been scrolled.
   */
  @Output()
  onScroll = new EventEmitter<IScrollEvent>();

  /**
   * Fires when the list has completed scrolling.
   */
  @Output()
  onScrollEnd = new EventEmitter<IScrollEvent>();

  /**
   * Fires when the viewport size is changed.
   */
  @Output()
  onViewportChange = new EventEmitter<ISize>();

  /**
   * Fires when an element is clicked.
   */
  @Output()
  onItemClick = new EventEmitter<IRenderVirtualListItem<any> | null>();

  /**
   * Fires when elements are selected.
   */
  @Output()
  onSelect = new EventEmitter<Array<Id> | Id | null>();

  /**
   * Fires when elements are collapsed.
   */
  @Output()
  onCollapse = new EventEmitter<Array<Id>>();

  /**
   * Fires when the scroll reaches the start.
   */
  @Output()
  onScrollReachStart = new EventEmitter<void>();

  /**
   * Fires when the scroll reaches the end.
   */
  @Output()
  onScrollReachEnd = new EventEmitter<void>();

  private _$show = new BehaviorSubject<boolean>(false);
  readonly $show = this._$show.asObservable();

  private _$scrollbarThickness = new BehaviorSubject<number>(DEFAULT_SCROLLBAR_THICKNESS);
  protected readonly $scrollbarThickness = this._$scrollbarThickness.asObservable();

  private _scrollbarThicknessTransform = (v: number) => {
    const valid = validateInt(v, true);

    if (!valid) {
      console.error('The "scrollbarThickness" parameter must be of type `number`.');
      return DEFAULT_SCROLLBAR_THICKNESS;
    }
    return v;
  };

  /**
   * Scrollbar thickness.
   */
  @Input()
  set scrollbarThickness(v: number) {
    if (this._$scrollbarThickness.getValue() === v) {
      return;
    }

    const transformedValue = this._scrollbarThicknessTransform(v);

    this._$scrollbarThickness.next(transformedValue);
  };
  get scrollbarThickness() { return this._$scrollbarThickness.getValue(); }

  private _$scrollbarMinSize = new BehaviorSubject<number>(DEFAULT_SCROLLBAR_MIN_SIZE);
  protected readonly $scrollbarMinSize = this._$scrollbarMinSize.asObservable();

  private _scrollbarMinSizeTransform = (v: number) => {
    const valid = validateInt(v);

    if (!valid) {
      console.error('The "scrollbarMinSize" parameter must be of type `number`.');
      return DEFAULT_SCROLLBAR_MIN_SIZE;
    }
    return v;
  };

  /**
   * Minimum scrollbar size.
   */
  @Input()
  set scrollbarMinSize(v: number) {
    if (this._$scrollbarMinSize.getValue() === v) {
      return;
    }

    const transformedValue = this._scrollbarMinSizeTransform(v);

    this._$scrollbarMinSize.next(transformedValue);
  };
  get scrollbarMinSize() { return this._$scrollbarMinSize.getValue() as number; }

  private _$scrollbarThumbRenderer = new BehaviorSubject<TemplateRef<any> | null>(null);
  protected readonly $scrollbarThumbRenderer = this._$scrollbarThumbRenderer.asObservable();

  private _scrollbarThumbRendererTransform = (v: TemplateRef<any> | null) => {
    const valid = validateObject(v, true, true);

    if (!valid) {
      console.error('The "scrollbarThumbRenderer" parameter must be of type `object`.');
      return null;
    }
    return v;
  };

  /**
   * Scrollbar customization template.
   */
  @Input()
  set scrollbarThumbRenderer(v: TemplateRef<any> | null) {
    if (this._$scrollbarThumbRenderer.getValue() === v) {
      return;
    }

    const transformedValue = this._scrollbarThumbRendererTransform(v);

    this._$scrollbarThumbRenderer.next(transformedValue);
  };
  get scrollbarThumbRenderer() { return this._$scrollbarThumbRenderer.getValue(); }

  private _$scrollbarThumbParams = new BehaviorSubject<{ [propName: string]: any } | null>({});
  protected readonly $scrollbarThumbParams = this._$scrollbarThumbParams.asObservable();

  private _scrollbarThumbParamsTransform = (v: { [propName: string]: any } | null) => {
    const valid = validateObject(v, true, true);

    if (!valid) {
      console.error('The "scrollbarThumbParams" parameter must be of type `object`.');
      return null;
    }
    return v;
  };

  /**
   * Additional options for the scrollbar.
   */
  @Input()
  set scrollbarThumbParams(v: { [propName: string]: any } | null) {
    if (this._$scrollbarThumbParams.getValue() === v) {
      return;
    }

    const transformedValue = this._scrollbarThumbParamsTransform(v);

    this._$scrollbarThumbParams.next(transformedValue);
  };
  get scrollbarThumbParams() { return this._$scrollbarThumbParams.getValue(); }

  private _$loading = new BehaviorSubject<boolean>(false);
  protected readonly $loading = this._$loading.asObservable();

  private _loadingTransform = (v: boolean) => {
    const valid = validateBoolean(v);

    if (!valid) {
      console.error('The "loading" parameter must be of type `boolean`.');
      return false;
    }
    return v;
  };

  /**
   * If `true`, the scrollBar goes into loading state. The default value is `false`.
   */
  @Input()
  set loading(v: boolean) {
    if (this._$loading.getValue() === v) {
      return;
    }

    const transformedValue = this._loadingTransform(v);

    this._$loading.next(transformedValue);
  };
  get loading() { return this._$loading.getValue() as boolean; }

  private _$waitForPreparation = new BehaviorSubject<boolean>(DEFAULT_WAIT_FOR_PREPARATION);
  protected readonly $waitForPreparation = this._$waitForPreparation.asObservable();

  private _waitForPreparationTransform = (v: boolean) => {
    const valid = validateObject(v);

    if (!valid) {
      console.error('The "waitForPreparation" parameter must be of type `boolean`.');
      return DEFAULT_WAIT_FOR_PREPARATION;
    }
    return v;
  };

  /**
   * If true, it will wait until the list items are fully prepared before displaying them.. The default value is `true`.
   */
  @Input()
  set waitForPreparation(v: boolean) {
    if (this._$waitForPreparation.getValue() === v) {
      return;
    }

    const transformedValue = this._waitForPreparationTransform(v);

    this._$waitForPreparation.next(transformedValue);
  };
  get waitForPreparation() { return this._$waitForPreparation.getValue() as boolean; }

  private _$clickDistance = new BehaviorSubject<number>(DEFAULT_CLICK_DISTANCE);
  protected readonly $clickDistance = this._$clickDistance.asObservable();

  private _clickDistanceTransform = (v: number) => {
    const valid = validateInt(v);

    if (!valid) {
      console.error('The "clickDistance" parameter must be of type `number`.');
      return DEFAULT_CLICK_DISTANCE;
    }
    return v;
  };

  /**
   * The maximum scroll distance at which a click event is triggered.
   */
  @Input()
  set clickDistance(v: number) {
    if (this._$clickDistance.getValue() === v) {
      return;
    }

    const transformedValue = this._clickDistanceTransform(v);

    this._$clickDistance.next(transformedValue);
  };
  get clickDistance() { return this._$clickDistance.getValue() as number; }

  private _$snapToEndTransitionInstantOffset = new BehaviorSubject<number>(DEFAULT_SNAP_TO_END_TRANSITION_INSTANT_OFFSET);
  protected readonly $snapToEndTransitionInstantOffset = this._$snapToEndTransitionInstantOffset.asObservable();

  private _snapToEndTransitionInstantOffsetTransform = (v: number) => {
    const valid = validateFloat(v);

    if (!valid) {
      console.error('The "snapToEndTransitionInstantOffset" parameter must be of type `number`.');
      return DEFAULT_SNAP_TO_END_TRANSITION_INSTANT_OFFSET;
    }
    return v;
  };

  /**
   * Sets the offset value; if the scroll area value is exceeded, the scroll animation will be disabled. Default value is "0".
   */
  @Input()
  set snapToEndTransitionInstantOffset(v: number) {
    if (this._$snapToEndTransitionInstantOffset.getValue() === v) {
      return;
    }

    const transformedValue = this._snapToEndTransitionInstantOffsetTransform(v);

    this._$snapToEndTransitionInstantOffset.next(transformedValue);
  };
  get snapToEndTransitionInstantOffset() { return this._$snapToEndTransitionInstantOffset.getValue(); }

  private _$items = new BehaviorSubject<IVirtualListCollection>([]);
  protected readonly $items = this._$items.asObservable();

  private _itemsTransform = (v: IVirtualListCollection) => {
    let valid = validateArray(v, true, true);
    if (valid) {
      if (v) {
        const trackBy = this.trackBy;
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
      console.error('The "items" parameter must be of type `IVirtualListCollection` or `null`.');
      return [];
    }
    return v;
  };

  /**
   * Collection of list items.
   */
  @Input()
  set items(v: IVirtualListCollection) {
    if (this._$items.getValue() === v) {
      return;
    }

    const transformedValue = this._itemsTransform(v);

    this._$items.next(transformedValue);
  };
  get items() { return this._$items.getValue() as IVirtualListCollection; }

  private _$defaultItemValue = new BehaviorSubject<IVirtualListItem | null>(null);
  protected readonly $defaultItemValue = this._$defaultItemValue.asObservable();

  @Input()
  set defaultItemValue(v: IVirtualListItem | null) {
    if (this._$defaultItemValue.getValue() === v) {
      return;
    }

    this._$defaultItemValue.next(v);
  };
  get defaultItemValue() { return this._$defaultItemValue.getValue(); }

  private _$selectedIds = new BehaviorSubject<Array<Id> | Id | null>(null);
  protected readonly $selectedIds = this._$selectedIds.asObservable();

  private _selectedIdsTransform = (v: Array<Id> | Id | null) => {
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
      return this._isMultiSelecting ? [] : null;
    }
    return v;
  };

  /**
   * Sets the selected items.
   */
  @Input()
  set selectedIds(v: Array<Id> | Id | null) {
    if (this._$selectedIds.getValue() === v) {
      return;
    }

    const transformedValue = this._selectedIdsTransform(v);

    this._$selectedIds.next(transformedValue);
  };
  get selectedIds() { return this._$selectedIds.getValue(); }

  private _$collapsedIds = new BehaviorSubject<Array<Id>>([]);
  protected readonly $collapsedIds = this._$collapsedIds.asObservable();

  private _collapsedIdsTransform = (v: Array<Id>) => {
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
      console.error('The "collapsedIds" parameter must be of type `Array<Id>` or `undefined`.');
      return [];
    }
    return v;
  };

  /**
   * Sets the collapsed items.
   */
  @Input()
  set collapsedIds(v: Array<Id>) {
    if (this._$collapsedIds.getValue() === v) {
      return;
    }

    const transformedValue = this._collapsedIdsTransform(v);

    this._$collapsedIds.next(transformedValue);
  };
  get collapsedIds() { return this._$collapsedIds.getValue(); }

  private _$selectByClick = new BehaviorSubject<boolean>(DEFAULT_SELECT_BY_CLICK);
  protected readonly $selectByClick = this._$selectByClick.asObservable();

  private _selectByClickTransform = (v: boolean) => {
    const valid = validateBoolean(v);

    if (!valid) {
      console.error('The "selectByClick" parameter must be of type `boolean`.');
      return DEFAULT_SELECT_BY_CLICK;
    }
    return v;
  };

  /**
   * If `false`, the element is selected using the config.select method passed to the template; 
   * if `true`, the element is selected by clicking on it. The default value is `true`.
   */
  @Input()
  set selectByClick(v: boolean) {
    if (this._$selectByClick.getValue() === v) {
      return;
    }

    const transformedValue = this._selectByClickTransform(v);

    this._$selectByClick.next(transformedValue);
  };
  get selectByClick() { return this._$selectByClick.getValue(); }

  private _$collapseByClick = new BehaviorSubject<boolean>(DEFAULT_COLLAPSE_BY_CLICK);
  protected readonly $collapseByClick = this._$collapseByClick.asObservable();

  private _collapseByClickTransform = (v: boolean) => {
    const valid = validateBoolean(v);

    if (!valid) {
      console.error('The "collapseByClick" parameter must be of type `boolean`.');
      return DEFAULT_COLLAPSE_BY_CLICK;
    }
    return v;
  };

  /**
   * If `false`, the element is collapsed using the config.collapse method passed to the template; 
   * if `true`, the element is collapsed by clicking on it. The default value is `true`.
   */
  @Input()
  set collapseByClick(v: boolean) {
    if (this._$collapseByClick.getValue() === v) {
      return;
    }

    const transformedValue = this._collapseByClickTransform(v);

    this._$collapseByClick.next(transformedValue);
  };
  get collapseByClick() { return this._$collapseByClick.getValue(); }

  private _$snap = new BehaviorSubject<boolean>(DEFAULT_SNAP);
  protected readonly $snap = this._$snap.asObservable();

  private _snapTransform = (v: boolean) => {
    const valid = validateBoolean(v);

    if (!valid) {
      console.error('The "snap" parameter must be of type `boolean`.');
      return DEFAULT_SNAP;
    }
    return v;
  };

  /**
   * Determines whether elements will snap. Default value is "true".
   */
  @Input()
  set snap(v: boolean) {
    if (this._$snap.getValue() === v) {
      return;
    }

    const transformedValue = this._snapTransform(v);

    this._$snap.next(transformedValue);
  };
  get snap() { return this._$snap.getValue(); }

  private _$scrollStartOffset = new BehaviorSubject<number>(0);
  protected readonly $scrollStartOffset = this._$scrollStartOffset.asObservable();

  private _scrollStartOffsetTransform = (v: number) => {
    const valid = validateInt(v, true);

    if (!valid) {
      console.error('The "scrollStartOffset" parameter must be of type `number`.');
      return 0;
    }
    return v;
  };

  /**
   * Sets the scroll start offset value; Default value is "0".
   */
  @Input()
  set scrollStartOffset(v: number) {
    if (this._$scrollStartOffset.getValue() === v) {
      return;
    }

    const transformedValue = this._scrollStartOffsetTransform(v);

    this._$scrollStartOffset.next(transformedValue);
  };
  get scrollStartOffset() { return this._$scrollStartOffset.getValue(); }

  private _$scrollEndOffset = new BehaviorSubject<number>(0);
  protected readonly $scrollEndOffset = this._$scrollEndOffset.asObservable();

  private _scrollEndOffsetTransform = (v: number) => {
    const valid = validateInt(v, true);

    if (!valid) {
      console.error('The "scrollEndOffset" parameter must be of type `number`.');
      return 0;
    }
    return v;
  };

  /**
   * Sets the scroll end offset value; Default value is "0".
   */
  @Input()
  set scrollEndOffset(v: number) {
    if (this._$scrollEndOffset.getValue() === v) {
      return;
    }

    const transformedValue = this._scrollEndOffsetTransform(v);

    this._$scrollEndOffset.next(transformedValue);
  };
  get scrollEndOffset() { return this._$scrollEndOffset.getValue(); }

  private _$snapScrollToStart = new BehaviorSubject<boolean>(DEFAULT_SNAP_SCROLLTO_START);
  protected readonly $snapScrollToStart = this._$snapScrollToStart.asObservable();

  private _snapScrollToStartTransform = (v: boolean) => {
    const valid = validateBoolean(v);

    if (!valid) {
      console.error('The "snapScrollToStart" parameter must be of type `boolean`.');
      return DEFAULT_SNAP_SCROLLTO_START;
    }
    return v;
  };

  /**
   * Determines whether the scroll will be anchored to the start of the list. Default value is "true".
   * This property takes precedence over the snapScrollToEnd property.
   * That is, if snapScrollToStart and snapScrollToEnd are enabled, the list will initially snap 
   * to the beginning; if you move the scroll bar to the end, the list will snap to the end. 
   * If snapScrollToStart is disabled and snapScrollToEnd is enabled, the list will snap to the end; 
   * if you move the scroll bar to the beginning, the list will snap to the beginning. 
   * If both snapScrollToStart and snapScrollToEnd are disabled, the list will never snap to the beginning or end.
   */
  @Input()
  set snapScrollToStart(v: boolean) {
    if (this._$snapScrollToStart.getValue() === v) {
      return;
    }

    const transformedValue = this._snapScrollToStartTransform(v);

    this._$snapScrollToStart.next(transformedValue);
  };
  get snapScrollToStart() { return this._$snapScrollToStart.getValue(); }

  private _$snapScrollToEnd = new BehaviorSubject<boolean>(DEFAULT_SNAP_SCROLLTO_END);
  protected readonly $snapScrollToEnd = this._$snapScrollToEnd.asObservable();

  private _snapScrollToEndTransform = (v: boolean) => {
    const valid = validateBoolean(v);

    if (!valid) {
      console.error('The "snapScrollToEnd" parameter must be of type `boolean`.');
      return DEFAULT_SNAP_SCROLLTO_END;
    }
    return v;
  };

  /**
   * Determines whether the scroll will be anchored to the утв of the list. Default value is "true".
   * That is, if snapScrollToStart and snapScrollToEnd are enabled, the list will initially snap 
   * to the beginning; if you move the scroll bar to the end, the list will snap to the end. 
   * If snapScrollToStart is disabled and snapScrollToEnd is enabled, the list will snap to the end; 
   * if you move the scroll bar to the beginning, the list will snap to the beginning. 
   * If both snapScrollToStart and snapScrollToEnd are disabled, the list will never snap to the beginning or end.
   */
  @Input()
  set snapScrollToEnd(v: boolean) {
    if (this._$snapScrollToEnd.getValue() === v) {
      return;
    }

    const transformedValue = this._snapScrollToEndTransform(v);

    this._$snapScrollToEnd.next(transformedValue);
  };
  get snapScrollToEnd() { return this._$snapScrollToEnd.getValue(); }

  private _snapScrollToBottomTransform = () => {
    throw Error('The snapScrollToBottom property is deprecated. Use the snapScrollToEnd property.');
  };

  /**
   * @deprecated
   * The stopSnappingScrollToEnd property is deprecated. Use the snapScrollToEnd property.
   */
  @Input()
  set snapScrollToBottom(v: boolean) {
    this._snapScrollToBottomTransform();
  }

  private _$scrollbarEnabled = new BehaviorSubject<boolean>(DEFAULT_SCROLLBAR_ENABLED);
  protected readonly $scrollbarEnabled = this._$scrollbarEnabled.asObservable();

  private _scrollbarEnabledTransform = (v: boolean) => {
    const valid = validateBoolean(v, true);

    if (!valid) {
      console.error('The "scrollbarEnabled" parameter must be of type `boolean`.');
      return DEFAULT_SCROLLBAR_ENABLED;
    }
    return v;
  };

  /**
   * Determines whether the scrollbar is shown or not. The default value is "true".
   */
  @Input()
  set scrollbarEnabled(v: boolean) {
    if (this._$scrollbarEnabled.getValue() === v) {
      return;
    }

    const transformedValue = this._scrollbarEnabledTransform(v);

    this._$scrollbarEnabled.next(transformedValue);
  };
  get scrollbarEnabled() { return this._$scrollbarEnabled.getValue(); }

  private _$scrollbarInteractive = new BehaviorSubject<boolean>(DEFAULT_SCROLLBAR_INTERACTIVE);
  protected readonly $scrollbarInteractive = this._$scrollbarInteractive.asObservable();

  private _scrollbarInteractiveTransform = (v: boolean) => {
    const valid = validateBoolean(v, true);

    if (!valid) {
      console.error('The "scrollbarInteractive" parameter must be of type `boolean`.');
      return DEFAULT_SCROLLBAR_INTERACTIVE;
    }
    return v;
  };

  /**
   * Determines whether scrolling using the scrollbar will be possible. The default value is "true".
   */
  @Input()
  set scrollbarInteractive(v: boolean) {
    if (this._$scrollbarInteractive.getValue() === v) {
      return;
    }

    const transformedValue = this._scrollbarInteractiveTransform(v);

    this._$scrollbarInteractive.next(transformedValue);
  };
  get scrollbarInteractive() { return this._$scrollbarInteractive.getValue(); }

  private _$scrollBehavior = new BehaviorSubject<ScrollBehavior>(DEFAULT_SCROLL_BEHAVIOR);
  protected readonly $scrollBehavior = this._$scrollBehavior.asObservable();

  private _scrollBehaviorTransform = (v: ScrollBehavior) => {
    const valid = validateString(v, true, true);

    if (!valid) {
      console.error('The "scrollBehavior" parameter must be of type `string`.');
      return DEFAULT_SCROLL_BEHAVIOR;
    }
    return v;
  };

  /**
   * Defines the scrolling behavior for any element on the page. The default value is "smooth".
   */
  @Input()
  set scrollBehavior(v: ScrollBehavior) {
    if (this._$scrollBehavior.getValue() === v) {
      return;
    }

    const transformedValue = this._scrollBehaviorTransform(v);

    this._$scrollBehavior.next(transformedValue);
  };
  get scrollBehavior() { return this._$scrollBehavior.getValue(); }

  private _$scrollingSettings = new BehaviorSubject<IScrollingSettings>(DEFAULT_SCROLLING_SETTINGS);
  protected readonly $scrollingSettings = this._$scrollingSettings.asObservable();

  private _scrollingSettingsTransform = (v: IScrollingSettings): IScrollingSettings => {
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
  };

  /**
   * Scrolling settings.
   * - frictionalForce - Frictional force. Default value is 0.035.
   * - mass - Mass. Default value is 0.005.
   * - maxDistance - Maximum scrolling distance. Default value is 12500.
   * - maxDuration - Maximum animation duration. Default value is 4000.
   * - speedScale - Speed scale. Default value is 15.
   * - optimization - Enables scrolling performance optimization. Default value is `true`.
   */
  @Input()
  set scrollingSettings(v: IScrollingSettings) {
    if (this._$scrollingSettings.getValue() === v) {
      return;
    }

    const transformedValue = this._scrollingSettingsTransform(v);

    this._$scrollingSettings.next(transformedValue);
  };
  get scrollingSettings() { return this._$scrollingSettings.getValue(); }

  private _$animationParams = new BehaviorSubject<IAnimationParams>(DEFAULT_ANIMATION_PARAMS);
  protected readonly $animationParams = this._$animationParams.asObservable();

  private _animationParamsTransform = (v: IAnimationParams) => {
    const valid = validateObject(v, true, true);

    if (!valid) {
      console.error('The "animationParams" parameter must be of type `object`.');
      return DEFAULT_ANIMATION_PARAMS;
    }
    return v;
  };

  /**
   * Animation parameters. The default value is "{ scrollToItem: 50, navigateToItem: 150, navigateByKeyboard: 50 }".
   */
  @Input()
  set animationParams(v: IAnimationParams) {
    if (this._$animationParams.getValue() === v) {
      return;
    }

    const transformedValue = this._animationParamsTransform(v);

    this._$animationParams.next(transformedValue);
  };
  get animationParams() { return this._$animationParams.getValue(); }

  private _$overscrollEnabled = new BehaviorSubject<boolean>(DEFAULT_OVERSCROLL_ENABLED);
  protected readonly $overscrollEnabled = this._$overscrollEnabled.asObservable();

  private _overscrollEnabledTransform = (v: boolean) => {
    const valid = validateBoolean(v, true);

    if (!valid) {
      console.error('The "overscrollEnabled" parameter must be of type `boolean`.');
      return DEFAULT_OVERSCROLL_ENABLED;
    }
    return v;
  };

  /**
   * Determines whether the overscroll (re-scroll) feature will work. The default value is "true".
   */
  @Input()
  set overscrollEnabled(v: boolean) {
    if (this._$overscrollEnabled.getValue() === v) {
      return;
    }

    const transformedValue = this._overscrollEnabledTransform(v);

    this._$overscrollEnabled.next(transformedValue);
  };
  get overscrollEnabled() { return this._$overscrollEnabled.getValue(); }

  private _$enabledBufferOptimization = new BehaviorSubject<boolean>(DEFAULT_ENABLED_BUFFER_OPTIMIZATION);
  protected readonly $enabledBufferOptimization = this._$enabledBufferOptimization.asObservable();

  private _enabledBufferOptimizationTransform = (v: boolean) => {
    const valid = validateBoolean(v);

    if (!valid) {
      console.error('The "enabledBufferOptimization" parameter must be of type `boolean`.');
      return DEFAULT_ENABLED_BUFFER_OPTIMIZATION;
    }
    return v;
  };

  /**
   * Experimental!
   * Enables buffer optimization.
   * Can only be used if items in the collection are not added or updated. Otherwise, artifacts in the form of twitching of the scroll area are possible.
   * Works only if the property dynamic = true
   */
  @Input()
  set enabledBufferOptimization(v: boolean) {
    if (this._$enabledBufferOptimization.getValue() === v) {
      return;
    }

    const transformedValue = this._enabledBufferOptimizationTransform(v);

    this._$enabledBufferOptimization.next(transformedValue);
  };
  get enabledBufferOptimization() { return this._$enabledBufferOptimization.getValue(); }

  private _$itemRenderer = new BehaviorSubject<TemplateRef<any> | undefined>(undefined);
  protected readonly $itemRenderer = this._$itemRenderer.asObservable();

  private _itemRendererTransform = (v: TemplateRef<any>) => {
    let valid = validateObject(v);
    if (v && !(typeof v.elementRef === 'object' && typeof v.createEmbeddedView === 'function')) {
      valid = false;
    }

    if (!valid) {
      throw Error('The "itemRenderer" parameter must be of type `TemplateRef`.');
    }
    return v;
  };

  /**
  * Rendering element template.
  */
  @Input()
  set itemRenderer(v: TemplateRef<any>) {
    if (this._$itemRenderer.getValue() === v) {
      return;
    }

    const transformedValue = this._itemRendererTransform(v);

    this._$itemRenderer.next(transformedValue);
  };
  get itemRenderer() { return this._$itemRenderer.getValue() as TemplateRef<any>; }

  private _$itemConfigMap = new BehaviorSubject<IVirtualListItemConfigMap>({});
  protected readonly $itemConfigMap = this._$itemConfigMap.asObservable();

  private _itemConfigMapTransform = (v: IVirtualListItemConfigMap) => {
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
  };

  /**
   * Sets `sticky` position, `collapsable` and `selectable` for the list item element. If `sticky` position is greater than `0`, then `sticky` position is applied. 
   * If the `sticky` value is greater than `0`, then the `sticky` position mode is enabled for the element. `1` - position start, `2` - position end.
   *  Default value is `0`.
   * `selectable` determines whether an element can be selected or not. Default value is `true`.
   * `collapsable` determines whether an element with a `sticky` property greater than zero can collapse and
   *  collapse elements in front that do not have a `sticky` property.
   * @link https://github.com/DjonnyX/ng-virtual-list/blob/14.x/projects/ng-virtual-list/src/lib/models/item-config-map.model.ts
   * @author Evgenii Alexandrovich Grebennikov
   * @email djonnyx@gmail.com
   */
  @Input()
  set itemConfigMap(v: IVirtualListItemConfigMap) {
    if (this._$itemConfigMap.getValue() === v) {
      return;
    }

    const transformedValue = this._itemConfigMapTransform(v);

    this._$itemConfigMap.next(transformedValue);
  };
  get itemConfigMap() { return this._$itemConfigMap.getValue(); }

  private _$itemSize = new BehaviorSubject<number>(DEFAULT_ITEM_SIZE);
  protected readonly $itemSize = this._$itemSize.asObservable();

  private _itemSizeTransform = (v: number) => {
    const valid = validateFloat(v);
    if (!valid) {
      console.error('The "itemSize" parameter must be of type `number` or `undefined`.');
      return DEFAULT_ITEM_SIZE;
    }

    const val = Number(v);
    return Number.isNaN(val) || val <= 0 ? DEFAULT_ITEM_SIZE : val;
  };

  /**
   * If direction = 'vertical', then the height of a typical element. If direction = 'horizontal', then the width of a typical element.
   * If the dynamicSize property is true, the items in the list can have different sizes, and you must specify the itemSize property 
   * to adjust the sizes of the items in the unallocated area.
   */
  @Input()
  set itemSize(v: number) {
    if (this._$itemSize.getValue() === v) {
      return;
    }

    const transformedValue = this._itemSizeTransform(v);

    this._$itemSize.next(transformedValue);
  };
  get itemSize() { return this._$itemSize.getValue(); }

  private _$dynamicSize = new BehaviorSubject<boolean>(DEFAULT_DYNAMIC_SIZE);
  protected readonly $dynamicSize = this._$dynamicSize.asObservable();

  private _dynamicSizeTransform = (v: boolean) => {
    const valid = validateBoolean(v);
    if (!valid) {
      console.error('The "dynamicSize" parameter must be of type `boolean`.');
      return DEFAULT_DYNAMIC_SIZE;
    }
    return v;
  };

  /**
   * If true, items in the list may have different sizes, and the itemSize property must be specified to adjust
   * the sizes of items in the unallocated area.
   * If false then the items in the list have a fixed size specified by the itemSize property. The default value is true.
   */
  @Input()
  set dynamicSize(v: boolean) {
    if (this._$dynamicSize.getValue() === v) {
      return;
    }

    const transformedValue = this._dynamicSizeTransform(v);

    this._$dynamicSize.next(transformedValue);
  };
  get dynamicSize() { return this._$dynamicSize.getValue(); }

  private _$direction = new BehaviorSubject<Direction>(DEFAULT_DIRECTION);
  protected readonly $direction = this._$direction.asObservable();

  private _directionTransform = (v: Direction) => {
    const valid = validateString(v) && (v === 'horizontal' || v === 'vertical');
    if (!valid) {
      console.error('The "direction" parameter must have the value `horizontal` or `vertical`.');
      return DEFAULT_DIRECTION;
    }
    return v;
  };

  /**
   * Determines the direction in which elements are placed. Default value is "vertical".
   */
  @Input()
  set direction(v: Direction) {
    if (this._$direction.getValue() === v) {
      return;
    }

    const transformedValue = this._directionTransform(v);

    this._$direction.next(transformedValue);
  };
  get direction() { return this._$direction.getValue(); }

  private _$collectionMode = new BehaviorSubject<CollectionMode>(DEFAULT_COLLECTION_MODE);
  protected readonly $collectionMode = this._$collectionMode.asObservable();

  private _collectionModeTransform = (v: CollectionMode) => {
    const valid = validateString(v) && (v === 'normal' || v === 'lazy');
    if (!valid) {
      console.error('The "direction" parameter must have the value `normal` or `lazy`.');
      return DEFAULT_COLLECTION_MODE;
    }
    return v;
  };

  /**
   * Determines the action modes for collection elements. Default value is "normal".
   */
  @Input()
  set collectionMode(v: CollectionMode) {
    if (this._$collectionMode.getValue() === v) {
      return;
    }

    const transformedValue = this._collectionModeTransform(v);

    this._$collectionMode.next(transformedValue);
  };
  get collectionMode() { return this._$collectionMode.getValue(); }

  private _$bufferSize = new BehaviorSubject<number>(DEFAULT_BUFFER_SIZE);
  protected readonly $bufferSize = this._$bufferSize.asObservable();

  private _bufferSizeTransform = (v: number) => {
    const valid = validateInt(v);
    if (!valid) {
      console.error('The "bufferSize" parameter must be of type `number`.');
      return DEFAULT_BUFFER_SIZE;
    }
    return v;
  };

  /**
   * Number of elements outside the scope of visibility. Default value is 2.
   */
  @Input()
  set bufferSize(v: number) {
    if (this._$bufferSize.getValue() === v) {
      return;
    }

    const transformedValue = this._bufferSizeTransform(v);

    this._$bufferSize.next(transformedValue);
  };
  get bufferSize() { return this._$bufferSize.getValue(); }

  private _$maxBufferSize = new BehaviorSubject<number>(DEFAULT_MAX_BUFFER_SIZE);
  protected readonly $maxBufferSize = this._$maxBufferSize.asObservable();

  private _maxBufferSizeTransform = (v: number) => {
    let val = v;
    const valid = validateInt(v, true);
    if (!valid) {
      console.error('The "maxBufferSize" parameter must be of type `number`.');
      val = DEFAULT_MAX_BUFFER_SIZE;
    }

    const bufferSize = this._$bufferSize.getValue();
    if (val === undefined || val <= bufferSize) {
      return bufferSize;
    }
    return val;
  };

  /**
   * Maximum number of elements outside the scope of visibility. Default value is 100.
   * If maxBufferSize is set to be greater than bufferSize, then adaptive buffer mode is enabled.
   * The greater the scroll size, the more elements are allocated for rendering.
   */
  @Input()
  set maxBufferSize(v: number) {
    const val = this._maxBufferSizeTransform(v);
    if (this._$maxBufferSize.getValue() === val) {
      return;
    }

    this._$maxBufferSize.next(val);
  };
  get maxBufferSize() { return this._$maxBufferSize.getValue(); }

  private _$snappingMethod = new BehaviorSubject<SnappingMethod>(DEFAULT_SNAPPING_METHOD);
  protected readonly $snappingMethod = this._$snappingMethod.asObservable();

  private _snappingMethodTransform = (v: SnappingMethod) => {
    const valid = validateString(v) && (v === SnappingMethods.ADVANCED || v === SnappingMethods.STANDART);
    if (!valid) {
      console.error(`The "snappingMethod" parameter must have the value '${SnappingMethods.ADVANCED}' or '${SnappingMethods.STANDART}'.`);
      return DEFAULT_SNAPPING_METHOD;
    }
    return v;
  };

  /**
   * Snapping method. Default value is 'standart'.
   * 'standart' - Classic group visualization.
   * 'advanced' - A mask is applied to the viewport area so that the background is displayed underneath the attached group.
   */
  @Input()
  set snappingMethod(v: SnappingMethod) {
    if (this._$snappingMethod.getValue() === v) {
      return;
    }

    const transformedValue = this._snappingMethodTransform(v);

    this._$snappingMethod.next(transformedValue);
  };
  get snappingMethod() { return this._$snappingMethod.getValue(); }

  private _$methodForSelecting = new BehaviorSubject<MethodForSelecting>(DEFAULT_SELECT_METHOD);
  protected readonly $methodForSelecting = this._$methodForSelecting.asObservable();

  private _methodForSelectingTransform = (v: MethodForSelecting) => {
    const valid = validateString(v) && (v === 'none' || v === 'select' || v === 'multi-select');
    if (!valid) {
      console.error('The "methodForSelecting" parameter must have the value `none`, `select` or `multi-select`.');
      return DEFAULT_SELECT_METHOD;
    }
    return v;
  };

  /**
   *  Method for selecting list items. Default value is 'none'.
   * 'select' - List items are selected one by one.
   * 'multi-select' - Multiple selection of list items.
   * 'none' - List items are not selectable.
   */
  @Input()
  set methodForSelecting(v: MethodForSelecting) {
    if (this._$methodForSelecting.getValue() === v) {
      return;
    }

    const transformedValue = this._methodForSelectingTransform(v);

    this._$methodForSelecting.next(transformedValue);
  };
  get methodForSelecting() { return this._$methodForSelecting.getValue(); }

  private _$trackBy = new BehaviorSubject<string>(TRACK_BY_PROPERTY_NAME);
  protected readonly $trackBy = this._$trackBy.asObservable();

  private _trackByTransform = (v: string) => {
    const valid = validateString(v);
    if (!valid) {
      console.error('The "trackBy" parameter must be of type `string`.');
      return TRACK_BY_PROPERTY_NAME;
    }
    return v;
  };

  /**
   * The name of the property by which tracking is performed
   */
  @Input()
  set trackBy(v: string) {
    if (this._$trackBy.getValue() === v) {
      return;
    }

    const transformedValue = this._trackByTransform(v);

    this._$trackBy.next(transformedValue);
  };
  get trackBy() { return this._$trackBy.getValue(); }







  private _$screenReaderMessage = new BehaviorSubject<string>(DEFAULT_SCREEN_READER_MESSAGE);
  protected readonly $screenReaderMessage = this._$screenReaderMessage.asObservable();

  private _screenReaderMessageTransform = (v: string) => {
    const valid = validateString(v);
    if (!valid) {
      console.error('The "screenReaderMessage" parameter must be of type `string`.');
      return DEFAULT_SCREEN_READER_MESSAGE;
    }
    return v;
  };

  /**
   * Message for screen reader.
   * The message format is: "some text $1 some text $2",
   * where $1 is the number of the first element of the screen collection,
   * $2 is the number of the last element of the screen collection.
   */
  @Input()
  protected set screenReaderMessage(v: string) {
    if (this._$screenReaderMessage.getValue() === v) {
      return;
    }

    const transformedValue = this._screenReaderMessageTransform(v);

    this._$screenReaderMessage.next(transformedValue);
  };
  protected get screenReaderMessage() { return this._$screenReaderMessage.getValue(); }

  private _$screenReaderFormattedMessage = new BehaviorSubject<string>(DEFAULT_SCREEN_READER_MESSAGE);
  protected $screenReaderFormattedMessage = this._$screenReaderFormattedMessage.asObservable();

  private _$langTextDir = new BehaviorSubject<TextDirection>(DEFAULT_LANG_TEXT_DIR);
  protected readonly $langTextDir = this._$langTextDir.asObservable();

  private _langTextDirTransform = (v: TextDirection) => {
    const valid = validateString(v);

    if (!valid) {
      console.error('The "langTextDir" parameter must be of type `string`.');
      return DEFAULT_LANG_TEXT_DIR;
    }
    return v;
  };

  /**
   * A string indicating the direction of text for the locale.
   * Can be either "ltr" (left-to-right) or "rtl" (right-to-left).
   */
  @Input()
  set langTextDir(v: TextDirection) {
    if (this._$langTextDir.getValue() === v) {
      return;
    }

    const transformedValue = this._langTextDirTransform(v);

    this._$langTextDir.next(transformedValue);
  };
  get langTextDir() { return this._$langTextDir.getValue(); }

  private _isNotSelecting = this.getIsNotSelecting();

  private _isSingleSelecting = this.getIsSingleSelecting();

  private _isMultiSelecting = this.getIsMultiSelecting();

  private _isSnappingMethodAdvanced: boolean = this.getIsSnappingMethodAdvanced();

  private _isVertical = this.getIsVertical();
  protected get isVertical() {
    return this._isVertical;
  }
  private _$isVertical = new BehaviorSubject<boolean>(this.isVertical);
  protected $isVertical = this._$isVertical.asObservable();

  private _$focusedElement = new BehaviorSubject<Id | null>(null);
  protected $focusedElement = this._$focusedElement.asObservable();

  private _$classes = new BehaviorSubject<{ [cName: string]: boolean }>({});
  protected $classes = this._$classes.asObservable();

  private _$prerenderEnabled = new BehaviorSubject<boolean>(false);
  protected $prerenderEnabled = this._$prerenderEnabled.asObservable();

  private _$actualItems = new BehaviorSubject<IVirtualListCollection>([]);

  private _$collapsedItemIds = new BehaviorSubject<Array<Id>>([]);

  private _displayComponents: Array<ComponentRef<BaseVirtualListItemComponent>> = [];

  private _snappedDisplayComponents: Array<ComponentRef<BaseVirtualListItemComponent>> = [];

  private _$bounds = new BehaviorSubject<ISize | null>(null);
  protected $bounds: Observable<ISize | null> = this._$bounds.asObservable();

  private _$totalSize = new BehaviorSubject<number>(0);

  private _$listBounds = new BehaviorSubject<ISize | null>(null);

  private _$scrollSize = new BehaviorSubject<number>(0);
  protected readonly $scrollSize = this._$scrollSize.asObservable();

  private _$isScrollStart = new BehaviorSubject<boolean>(true);

  private _$isScrollEnd = new BehaviorSubject<boolean>(false);

  private _resizeSnappedComponentHandler = () => {
    const list = this._$list.getValue(), scroller = this._$scroller.getValue(), bounds = this._$bounds.getValue(), snappedComponents = this._snappedDisplayComponents;
    if (list && scroller && snappedComponents.length > 0) {
      const isVertical = this._isVertical, listBounds = list.nativeElement.getBoundingClientRect();

      for (const comp of snappedComponents) {
        if (!!comp) {
          comp.instance.regularLength = `${isVertical ? listBounds.width : listBounds.height}${PX}`;
        }
      }

      const snappingMethod = this._$snappingMethod.getValue();
      if (snappingMethod === SnappingMethods.ADVANCED) {
        const snappedComponent = snappedComponents?.[0].instance;
        if (!!snappedComponent) {
          const { width, height } = bounds ?? { width: 0, height: 0 }, langTextDir = this._$langTextDir.getValue();

          snappedComponent.element.style.clipPath = `path("M 0 0 L 0 ${snappedComponent.element.offsetHeight} L ${snappedComponent.element.offsetWidth} ${snappedComponent.element.offsetHeight} L ${snappedComponent.element.offsetWidth} 0 Z")`;

          const { width: sWidth, height: sHeight } = snappedComponent.getBounds() ?? { width: 0, height: 0 },
            scrollerElement = scroller.nativeElement, delta = snappedComponent.item?.measures.delta ?? 0,
            scrollBarSize = this._$scrollbarThickness.getValue();

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
    const scroller = this._scrollerComponent;
    if (!!scroller) {
      const { width, height } = this._$bounds.getValue()!, { width: elementWidth, height: elementHeight } = element.getBoundingClientRect(),
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
          fireUpdate: true, blending: true, userAction: true, duration: this._$animationParams.getValue().navigateToItem,
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
  private _trackBox: TrackBox = new this._trackBoxClass(this._$trackBy.getValue());

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

  private _updateId: number | undefined;

  private _scrollStateUpdateIndex: number = 0;

  private _readyForShow = false;

  private _cached = false;

  private _isLoading = false;

  protected get cachable() {
    return this._prerender?.active ?? false;
  }

  protected get prerenderable() {
    return this._$dynamicSize.getValue() && (this._trackBox?.isSnappedToEnd ?? false);
  }

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
    super();
    NgVirtualListComponent.__nextId = NgVirtualListComponent.__nextId + 1 === Number.MAX_SAFE_INTEGER
      ? 0 : NgVirtualListComponent.__nextId + 1;
    this._id = NgVirtualListComponent.__nextId;

    this._service.initialize(this._id, this._trackBox);

    this._service.animationParams = this._$animationParams.getValue();

    const $dynamicSize = this.$dynamicSize,
      $snapScrollToEnd = this.$snapScrollToEnd;
    combineLatest([$dynamicSize, $snapScrollToEnd]).pipe(
      takeUntil(this._$unsubscribe),
      tap(([dynamicSize, snapScrollToEnd]) => {
        this._$prerenderEnabled.next(dynamicSize && snapScrollToEnd);
      }),
    ).subscribe();

    this._service.$tick.pipe(
      takeUntil(this._$unsubscribe),
      tap(() => {
        this._scrollerComponent?.tick();
      }),
    ).subscribe();

    this._service.$tick.pipe(
      takeUntil(this._$unsubscribe),
      tap(() => {
        this.checkBoundsOfElements();
        this._scrollerComponent?.tick();
      }),
    ).subscribe();

    this.$direction.pipe(
      takeUntil(this._$unsubscribe),
      debounceTime(0),
      map(v => this.isVertical),
      tap(v => {
        this._$isVertical.next(v);
      }),
    ).subscribe();
  }

  ngAfterViewInit() {
    let hasUserAction = false, hasScrollbarUserAction = false;

    this._$scroller.next(this._scrollerComponent?.scrollViewport);
    this._$list.next(this._scrollerComponent?.scrollContent);

    const $resizeViewport = this._scrollerComponent!.$resizeViewport,
      $resizeContent = this._scrollerComponent!.$resizeContent!;

    $resizeViewport.pipe(
      takeUntil(this._$unsubscribe),
      filter(v => !!v),
      tap(v => {
        this._$bounds.next(v);
        this.onAfterResize(true);
      }),
    ).subscribe();

    $resizeContent.pipe(
      takeUntil(this._$unsubscribe),
      filter(v => !!v),
      tap(v => {
        this._$listBounds.next(v);
        this.onAfterResize();
      }),
    ).subscribe();

    const $trackBy = this.$trackBy;
    $trackBy.pipe(
      takeUntil(this._$unsubscribe),
      tap(v => {
        this._service.trackBy = v;
      }),
    ).subscribe();

    this._trackBox.displayComponents = this._displayComponents;

    this._$scroller.next(this._scrollerComponent?.scrollViewport);
    this._$list.next(this._scrollerComponent?.scrollContent);

    this._service.$focusItem.pipe(
      takeUntil(this._$unsubscribe),
      tap((params) => {
        const { element, position, align, behavior } = params;
        this.focusItem(element, position, align, behavior);
      }),
    ).subscribe();

    const $list = this.$list.pipe(
      takeUntil(this._$unsubscribe),
      filter(v => !!v),
      map(v => v!.nativeElement),
      take(1),
    );

    const preventKeyboardEvent = (event: KeyboardEvent, isVertical: boolean) => {
      const scroller = this._scrollerComponent;
      if (!!scroller) {
        const scrollStartOffset = this._$scrollStartOffset.getValue(), scrollable = scroller.scrollable ?? false,
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
      takeUntil(this._$unsubscribe),
      filter(element => !!element),
      switchMap(element => {
        return fromEvent<KeyboardEvent>(element, EVENT_KEY_DOWN).pipe(
          takeUntil(this._$unsubscribe),
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

    const $scrollbarThickness = this.$scrollbarThickness;
    $scrollbarThickness.pipe(
      takeUntil(this._$unsubscribe),
      filter(v => !!v),
      tap(scrollbarThickness => {
        this._service.scrollBarSize = scrollbarThickness;
      }),
    ).subscribe();

    this.$fireUpdateNextFrame.pipe(
      takeUntil(this._$unsubscribe),
      debounceTime(0),
      tap(userAction => {
        this._$fireUpdate.next(userAction);
      }),
    ).subscribe();

    const $scrollToItem = this.$scrollTo.pipe(takeUntil(this._$unsubscribe)),
      $mouseDown = fromEvent(this._elementRef.nativeElement, MOUSE_DOWN).pipe(takeUntil(this._$unsubscribe)),
      $touchStart = fromEvent(this._elementRef.nativeElement, TOUCH_START).pipe(takeUntil(this._$unsubscribe));

    fromEvent<KeyboardEvent>(document, KEY_DOWN).pipe(
      takeUntil(this._$unsubscribe),
      filter(e => e.key === KEY_TAB),
      switchMap(e => {
        return fromEvent(this._elementRef.nativeElement, FOCUS).pipe(
          takeUntil(this._$unsubscribe),
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
      takeUntil(this._$unsubscribe),
      tap(options => {
        this.scrollToStart(null, options);
      }),
    ).subscribe();

    this._service.$scrollTo.pipe(
      takeUntil(this._$unsubscribe),
      filter(v => !!v),
      tap(params => {
        const { id, cb, options } = params!;
        this.scrollTo(id, cb, options);
      }),
    ).subscribe();

    this._service.$scrollToEnd.pipe(
      takeUntil(this._$unsubscribe),
      tap(options => {
        this.scrollToEnd(null, options);
      }),
    ).subscribe();

    this._$langTextDir.pipe(
      takeUntil(this._$unsubscribe),
      distinctUntilChanged(),
      tap(v => {
        this._service.langTextDir = v;
      }),
    ).subscribe();

    this._$clickDistance.pipe(
      takeUntil(this._$unsubscribe),
      distinctUntilChanged(),
      tap(v => {
        this._service.clickDistance = v;
      }),
    ).subscribe();

    const $prerenderContainer = of(this._prerender);

    const $prerender = $prerenderContainer.pipe(
      takeUntil(this._$unsubscribe),
      filter(v => !!v),
      switchMap(v => v!.$render),
    );

    const $fireUpdate = this.$fireUpdate;
    $fireUpdate.pipe(
      takeUntil(this._$unsubscribe),
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
          takeUntil(this._$unsubscribe),
          switchMap(() => {
            renderStabilizerPrevScrollStateVersion = EMPTY_SCROLL_STATE_VERSION;
            renderStabilizerUpdateIterations = 0;
            this._cached = false;
            return $update.pipe(
              takeUntil(this._$unsubscribe),
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
      $items = this.$items,
      $dynamicSize = this.$dynamicSize,
      $snapScrollToStart = this.$snapScrollToStart,
      $snapScrollToEnd = this.$snapScrollToEnd,
      $waitForPreparation = this.$waitForPreparation;

    combineLatest([$prerenderContainer, $dynamicSize, $snapScrollToStart, $snapScrollToEnd, $waitForPreparation]).pipe(
      takeUntil(this._$unsubscribe),
      distinctUntilChanged(),
      filter(([prerenderContainer]) => !!prerenderContainer),
      debounceTime(0),
      switchMap(([prerenderContainer, dynamicSize, snapScrollToStart, snapScrollToEnd, waitForPreparation]) => {
        if (!!dynamicSize && !snapScrollToStart && !!snapScrollToEnd && !!waitForPreparation) {
          return $items.pipe(
            takeUntil(this._$unsubscribe),
            distinctUntilChanged((p, c) => {
              const pLength = p?.length ?? 0, cLength = c?.length ?? 0;
              return !((cLength > 0) || (pLength !== cLength && (pLength === 0 || cLength === 0)));
            }),
            tap(items => {
              this._trackBox.resetCollection(items, this.itemSize);
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
                const scrollerComponent = this._scrollerComponent;
                if (scrollerComponent) {
                  scrollerComponent.prepared = false;
                  scrollerComponent.stopScrolling();
                }
                this._$classes.next({ prepared: true });
                this._$show.next(true);
              } else {
                this._trackBox.isScrollEnd = true;
                const waitForPreparation = this.waitForPreparation;
                if (waitForPreparation) {
                  if (this.prerenderable) {
                    this._cached = false;
                    prerenderContainer!.on(this.items);
                  }
                }
                this._$classes.next({ prepared: false });
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
              const waitForPreparation = this.waitForPreparation;
              if (waitForPreparation) {
                this._trackBox.isScrollEnd = true;
                if (this.prerenderable) {
                  this._cached = false;
                  prerenderContainer!.on(this.items);
                }
                return $initialRenderStabilizer.pipe(
                  takeUntil(this._$unsubscribe),
                  take(1),
                  tap(() => {
                    this._trackBox.isScrollEnd = true;
                    if (this.prerenderable) {
                      prerenderContainer!.off();
                    }
                    this._readyForShow = true;
                    const scrollerComponent = this._scrollerComponent;
                    if (scrollerComponent) {
                      scrollerComponent.prepared = true;
                    }
                    this._$classes.next({ prepared: true });
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
              const scrollerComponent = this._scrollerComponent;
              if (scrollerComponent) {
                scrollerComponent.prepared = true;
              }
              this._$classes.next({ prepared: true });
              this._$show.next(true);
              return of(false);
            }),
          );
        } else {
          prerenderContainer!.off();
          return $items.pipe(
            takeUntil(this._$unsubscribe),
            tap(items => {
              if (!items || items.length === 0) {
                this.cacheClean();
                const scrollerComponent = this._scrollerComponent;
                if (scrollerComponent) {
                  scrollerComponent.prepared = false;
                }
                this._$classes.next({ prepared: false });
                this._$show.next(false);
              }
              this._trackBox.resetCollection(items, this.itemSize);
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
              const scrollerComponent = this._scrollerComponent;
              if (scrollerComponent) {
                scrollerComponent.prepared = true;
              }
              this._$classes.next({ prepared: true });
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
      takeUntil(this._$unsubscribe),
      filter(v => !!v),
      tap(() => {
        this._cached = false;
      }),
      switchMap(() => {
        return $prerender.pipe(
          takeUntil(this._$unsubscribe),
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
      takeUntil(this._$unsubscribe),
      tap(v => {
        this._$focusedElement.next(v ?? null);
      }),
    ).subscribe();

    $list.pipe(
      takeUntil(this._$unsubscribe),
      filter(element => !!element),
      tap(element => {
        this._service.listElement = element;
      }),
    ).subscribe();

    const $defaultItemValue = this.$defaultItemValue,
      $selectByClick = this.$selectByClick,
      $collapseByClick = this.$collapseByClick,
      $isScrollStart = this._$isScrollStart.asObservable(),
      $isScrollEnd = this._$isScrollEnd.asObservable(),
      $scrollStartOffset = this.$scrollStartOffset,
      $scrollEndOffset = this.$scrollEndOffset,
      $isVertical = this.$direction.pipe(
        map(v => this.getIsVertical(v || DEFAULT_DIRECTION)),
      );

    $snapScrollToStart.pipe(
      takeUntil(this._$unsubscribe),
      tap(v => {
        this._service.snapScrollToStart = v;
      }),
    ).subscribe();

    $snapScrollToEnd.pipe(
      takeUntil(this._$unsubscribe),
      tap(v => {
        this._service.snapScrollToEnd = v;
      }),
    ).subscribe();

    $isVertical.pipe(
      takeUntil(this._$unsubscribe),
      tap(v => {
        this._service.isVertical = v;
      }),
    ).subscribe();

    $dynamicSize.pipe(
      takeUntil(this._$unsubscribe),
      tap(v => {
        this._service.dynamic = v;
      }),
    ).subscribe();

    $defaultItemValue.pipe(
      takeUntil(this._$unsubscribe),
      tap(v => {
        this._service.defaultItemValue = v;
      }),
    ).subscribe();

    $scrollStartOffset.pipe(
      takeUntil(this._$unsubscribe),
      distinctUntilChanged(),
      tap(v => {
        this._trackBox.scrollStartOffset = this._service.scrollStartOffset = v;
      }),
    ).subscribe();

    $scrollEndOffset.pipe(
      takeUntil(this._$unsubscribe),
      distinctUntilChanged(),
      tap(v => {
        this._trackBox.scrollEndOffset = this._service.scrollEndOffset = v;
      }),
    ).subscribe();

    $isScrollStart.pipe(
      takeUntil(this._$unsubscribe),
      skip(1),
      distinctUntilChanged(),
      debounceTime(0),
      filter(v => !!v && this._readyForShow),
      tap(() => {
        if (this._scrollerComponent?.scrollable) {
          this.onScrollReachStart.emit();
        }
      }),
    ).subscribe();

    $isScrollEnd.pipe(
      takeUntil(this._$unsubscribe),
      skip(1),
      distinctUntilChanged(),
      debounceTime(0),
      filter(v => !!v && this._readyForShow),
      tap(v => {
        if (this._scrollerComponent?.scrollable) {
          this.onScrollReachEnd.emit();
        }
      }),
    ).subscribe();

    $selectByClick.pipe(
      takeUntil(this._$unsubscribe),
      tap(v => {
        this._service.selectByClick = v;
      }),
    ).subscribe();

    $collapseByClick.pipe(
      takeUntil(this._$unsubscribe),
      tap(v => {
        this._service.collapseByClick = v;
      }),
    ).subscribe();

    $trackBy.pipe(
      takeUntil(this._$unsubscribe),
      tap(v => {
        this._trackBox.trackingPropertyName = v;
      }),
    ).subscribe();

    const $bounds = this.$bounds.pipe(
      filter(b => !!b),
    ),
      $listBounds = this._$listBounds.asObservable().pipe(
        filter(b => !!b),
      ), $scrollSize = this.$scrollSize,
      $itemSize = this.$itemSize.pipe(
        map(v => v <= 0 ? DEFAULT_ITEM_SIZE : v),
      ),
      $bufferSize = this.$bufferSize.pipe(
        map(v => v < 0 ? DEFAULT_BUFFER_SIZE : v),
      ),
      $maxBufferSize = this.$maxBufferSize.pipe(
        map(v => v < 0 ? DEFAULT_BUFFER_SIZE : v),
      ),
      $itemConfigMap = this.$itemConfigMap.pipe(
        map(v => !v ? {} : v),
      ),
      $snap = this.$snap,
      $isLazy = this.$collectionMode.pipe(
        map(v => this.getIsLazy(v || DEFAULT_COLLECTION_MODE)),
      ),
      $enabledBufferOptimization = this.$enabledBufferOptimization,
      $snappingMethod = this.$snappingMethod.pipe(
        map(v => this.getIsSnappingMethodAdvanced(v || DEFAULT_SNAPPING_METHOD)),
      ),
      $methodForSelecting = this.$methodForSelecting,
      $selectedIds = this.$selectedIds,
      $collapsedIds = this.$collapsedIds.pipe(
        map(v => Array.isArray(v) ? v : []),
      ),
      $collapsedItemIds = this._$collapsedItemIds.asObservable().pipe(
        map(v => Array.isArray(v) ? v : []),
      ),
      $actualItems = this._$actualItems.asObservable().pipe(
        takeUntil(this._$unsubscribe),
        distinctUntilChanged(),
        debounceTime(0),
      ),
      $screenReaderMessage = this.$screenReaderMessage,
      $displayItems = this._service.$displayItems,
      $cacheVersion = this._service.$cacheVersion;

    combineLatest([$displayItems, $screenReaderMessage, $isVertical, $scrollSize, $bounds]).pipe(
      takeUntil(this._$unsubscribe),
      distinctUntilChanged(),
      debounceTime(100),
      takeUntil(this._$unsubscribe),
      tap(([items, screenReaderMessage, isVertical, scrollSize, bounds]) => {
        this._$screenReaderFormattedMessage.next(
          formatScreenReaderMessage(items, screenReaderMessage, scrollSize, isVertical, bounds!)
        );
      }),
    ).subscribe();

    $isLazy.pipe(
      takeUntil(this._$unsubscribe),
      tap(v => {
        this._trackBox.isLazy = v;
      }),
    ).subscribe();

    const $itemsComposition = $items.pipe(
      takeUntil(this._$unsubscribe),
      distinctUntilChanged(),
      switchMap(items => {
        return combineLatest([$collapsedItemIds, $itemConfigMap, $trackBy]).pipe(
          takeUntil(this._$unsubscribe),
          debounceTime(0),
          switchMap(([collapsedIds, itemConfigMap, trackBy]) => {
            return of({ items, collapsedIds, itemConfigMap, trackBy });
          }),
        );
      }),
    );

    $itemsComposition.pipe(
      takeUntil(this._$unsubscribe),
      switchMap(({ items, collapsedIds, itemConfigMap, trackBy }) => {
        if (items.length === 0 || !this._readyForShow || !(this.cachable && !this._cached &&
          !this._trackBox.isSnappedToStart && this._trackBox.isSnappedToEnd)) {
          return of({ items, collapsedIds, itemConfigMap, trackBy });
        }
        return $updateItemsRenderStabilizer.pipe(
          takeUntil(this._$unsubscribe),
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

        this._$actualItems.next(actualItems);
      }),
    ).subscribe();

    $isVertical.pipe(
      takeUntil(this._$unsubscribe),
      tap(v => {
        this._isVertical = v;
        const el: HTMLElement = this._elementRef.nativeElement;
        toggleClassName(el, v ? CLASS_LIST_VERTICAL : CLASS_LIST_HORIZONTAL, v ? CLASS_LIST_HORIZONTAL : CLASS_LIST_VERTICAL);
      }),
    ).subscribe();

    $snappingMethod.pipe(
      takeUntil(this._$unsubscribe),
      tap(v => {
        this._isSnappingMethodAdvanced = this._trackBox.isSnappingMethodAdvanced = v;
      }),
    ).subscribe();

    $methodForSelecting.pipe(
      takeUntil(this._$unsubscribe),
      tap(v => {
        const el = this._$list.getValue()?.nativeElement;
        if (this.getIsMultiSelecting(v || DEFAULT_SNAPPING_METHOD)) {
          this._isMultiSelecting = true;
          this._isNotSelecting = this._isSingleSelecting = false;
          if (!!el) {
            el.setAttribute('role', ROLE_LIST_BOX);
          }
          this._service.methodOfSelecting = MethodsForSelectingTypes.MULTI_SELECT;
        } else if (this.getIsSingleSelecting(v || DEFAULT_SNAPPING_METHOD)) {
          this._isSingleSelecting = true;
          this._isNotSelecting = this._isMultiSelecting = false;
          if (!!el) {
            el.setAttribute('role', ROLE_LIST_BOX);
          }
          this._service.methodOfSelecting = MethodsForSelectingTypes.SELECT;
        } else if (this.getIsNotSelecting(v || DEFAULT_SNAPPING_METHOD)) {
          this._isNotSelecting = true;
          this._isSingleSelecting = this._isMultiSelecting = false;
          if (!!el) {
            el.setAttribute('role', ROLE_LIST);
          }
          this._service.methodOfSelecting = MethodsForSelectingTypes.NONE;
        }
      }),
    ).subscribe();

    const $preventScrollSnapping = this.$preventScrollSnapping;

    $preventScrollSnapping.pipe(
      takeUntil(this._$unsubscribe),
      filter(v => !!v),
      tap(() => {
        if (this._readyForShow) {
          this._trackBox.isScrollEnd;
          this._trackBox.isScrollStart = this._trackBox.isScrollEnd = false;
          this._$isScrollStart.next(false);
          this._$isScrollEnd.next(false);
          const scroller = this._scrollerComponent;
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
      takeUntil(this._$unsubscribe),
      filter(() => this._readyForShow),
      switchMap(() => {
        return $collapseItemsRenderStabilizer.pipe(
          takeUntil(this._$unsubscribe),
          take(1),
          tap(() => {
            this._$fireUpdate.next(true);
          }),
        );
      }),
    ).subscribe();


    let isChunkLoading = false;
    const $loading = this.$loading;
    $loading.pipe(
      takeUntil(this._$unsubscribe),
      distinctUntilChanged(),
      skip(1),
      filter(v => !v),
      switchMap(() => {
        isChunkLoading = true;
        const scrollbar = this._scrollerComponent;
        if (!!scrollbar) {
          scrollbar.stopScrollbar();
          scrollbar.refreshScrollbar();
        }
        return $actualItems.pipe(
          takeUntil(this._$unsubscribe),
          take(1),
          tap(() => {
            this._$fireUpdateNextFrame.next(true);
          }),
          switchMap(() => $chunkLoadingRenderStabilizer.pipe(
            takeUntil(this._$unsubscribe),
            take(1),
            tap(() => {
              isChunkLoading = false;
              this._trackBox.resetCacheChunkInfo();
              const scrollbar = this._scrollerComponent;
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
      takeUntil(this._$unsubscribe),
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
      bufferSize: number; maxBufferSize: number; snap: boolean; isVertical: boolean; dynamicSize: boolean;
      enabledBufferOptimization: boolean; cacheVersion: number; userAction: boolean; collapsedIds: Array<Id>;
    }, optimization: boolean = false, reupdate: boolean = false) => {
      const {
        snapScrollToStart, snapScrollToEnd, bounds, listBounds, scrollEndOffset, items, itemConfigMap, scrollSize, itemSize,
        bufferSize, maxBufferSize, snap, isVertical, dynamicSize, enabledBufferOptimization, cacheVersion, userAction, collapsedIds,
      } = params;
      const scroller = this._scrollerComponent;
      let totalSize = 0;
      if (scroller) {
        const collapsable = collapsedIds.length > 0, cachable = this.cachable, cached = this._cached, waitingCache = cachable && !cached,
          emitUpdate = !this._readyForShow || waitingCache || collapsable || isChunkLoading;
        if (this._readyForShow || (cachable && cached)) {
          const currentScrollSize = (isVertical ? scroller.scrollTop ?? 0 : scroller.scrollLeft ?? 0),
            fireUpdate = emitUpdate || reupdate || (!optimization && !userAction) || this._$scrollingTo.getValue();
          let actualScrollSize = !this._readyForShow && snapScrollToEnd ? (isVertical ? scroller.scrollHeight ?? 0 : scroller.scrollWidth ?? 0) :
            (isVertical ? scroller.scrollTop ?? 0 : scroller.scrollLeft ?? 0),
            displayItems: IRenderVirtualListCollection;

          const { width, height } = bounds, viewportSize = (isVertical ? height : width),
            opts: IUpdateCollectionOptions<IVirtualListItem, IVirtualListCollection> = {
              bounds: { width, height }, dynamicSize, isVertical, itemSize,
              bufferSize, maxBufferSize, scrollSize: actualScrollSize, snap, enabledBufferOptimization,
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

          this._$totalSize.next(totalSize);

          this._service.collection = displayItems;

          this.resetBoundsSize(isVertical, totalSize);

          this.createDisplayComponentsIfNeed(displayItems);

          this.tracking();

          this.snappingHandler();

          const delta = this._trackBox.delta,
            scrollPositionAfterUpdate = Math.round(actualScrollSize + delta),
            roundedScrollPositionAfterUpdate = Math.round(scrollPositionAfterUpdate),
            roundedMaxPositionAfterUpdate = Math.round(totalSize - viewportSize);

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
                fireUpdate: true, behavior: BEHAVIOR_INSTANT,
                blending: false, duration: this.animationParams.scrollToItem,
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
              fireUpdate: true, behavior: BEHAVIOR_INSTANT, userAction: false,
              blending: false, duration: this.animationParams.scrollToItem,
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
              fireUpdate, behavior: BEHAVIOR_INSTANT, duration: this.animationParams.scrollToItem,
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
    combineLatest([$snapScrollToStart, $snapScrollToEnd, $bounds, $listBounds, $scrollEndOffset, $actualItems, $itemConfigMap, $scrollSize, $itemSize,
      $collapsedItemIds, $bufferSize, $maxBufferSize, $snap, $isVertical, $dynamicSize, $enabledBufferOptimization, $cacheVersion, this.$fireUpdate,
    ]).pipe(
      takeUntil(this._$unsubscribe),
      tap(([
        snapScrollToStart, snapScrollToEnd, bounds, listBounds, scrollEndOffset, items, itemConfigMap, scrollSize, itemSize,
        collapsedIds, bufferSize, maxBufferSize, snap, isVertical, dynamicSize, enabledBufferOptimization, cacheVersion,
      ]) => {
        let itemsChanged = false;
        if (prevItems !== items) {
          itemsChanged = true;
          prevItems = items;
        }

        const enabledOptimization = this.scrollingSettings?.optimization ?? DEFAULT_SCROLLING_SETTINGS.optimization,
          scroller = this._scrollerComponent, velocity = this._scrollerComponent?.averageVelocity ?? 0,
          maxScrollSize = isVertical ? (scroller?.scrollHeight || 0) : (scroller?.scrollWidth ?? 0),
          isEdges = scrollSize === 0 || scrollSize === maxScrollSize, isScrolling = this._$scrollingTo.getValue(),
          useDebouncedUpdate = dynamicSize && !itemsChanged && hasUserAction && !isScrolling && (velocity > 0 && velocity < MAX_VELOCITY_FOR_SCROLL_QUALITY_OPTIMIZATION_LVL1),
          rerenderOptimization = enabledOptimization && dynamicSize && !itemsChanged && (hasUserAction || hasScrollbarUserAction) && !isEdges && velocity > 0 &&
            (velocity > MAX_VELOCITY_FOR_SCROLL_QUALITY_OPTIMIZATION_LVL2 || hasUserAction);
        if (enabledOptimization) {
          if (useDebouncedUpdate) {
            debouncedUpdate.execute({
              snapScrollToStart, snapScrollToEnd, bounds, listBounds, scrollEndOffset, items, itemConfigMap, scrollSize, itemSize, collapsedIds,
              bufferSize, maxBufferSize, snap, isVertical, dynamicSize, enabledBufferOptimization, cacheVersion, userAction: hasUserAction,
            }, rerenderOptimization, itemsChanged);
            return;
          }

          debouncedUpdate.dispose();
        }

        if (!isScrolling) {
          update({
            snapScrollToStart, snapScrollToEnd, bounds: bounds!, listBounds: listBounds!, scrollEndOffset, items, itemConfigMap, scrollSize, itemSize, collapsedIds,
            bufferSize, maxBufferSize, snap, isVertical, dynamicSize, enabledBufferOptimization, cacheVersion, userAction: hasUserAction,
          }, rerenderOptimization, itemsChanged);
        }
      }),
    ).subscribe();

    const $scroller = this.$scroller.pipe(
      takeUntil(this._$unsubscribe),
      filter(v => !!v),
      map(v => v!.nativeElement),
      take(1),
    ),
      $scrollerScroll = this._scrollerComponent!.$scroll,
      $scrollerScrollEnd = this._scrollerComponent!.$scrollEnd,
      $scrollbarScroll = this._scrollerComponent!.$scrollbarScroll;

    const scrollHandler = (userAction: boolean = false) => {
      const scroller = this._scrollerComponent;
      if (!!scroller) {
        const isVertical = this._isVertical, bounds = this._$bounds.getValue(), listBounds = this._$listBounds.getValue(),
          scrollSize = (isVertical ? scroller.scrollTop : scroller.scrollLeft),
          maxScrollSize = isVertical ? (listBounds?.height ?? 0) - (bounds?.height ?? 0) : (listBounds?.width ?? 0) - (bounds?.width ?? 0),
          actualScrollSize = scrollSize;

        if (this._readyForShow) {
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

        this._$scrollSize.next(actualScrollSize);
      }
    };

    $scroller.pipe(
      takeUntil(this._$unsubscribe),
      distinctUntilChanged(),
      switchMap(scroller => {
        return $scrollbarScroll.pipe(
          takeUntil(this._$unsubscribe),
          tap(userAction => {
            hasScrollbarUserAction = userAction;
            const scrollerEl = this._$scroller.getValue()?.nativeElement, scrollerComponent = this._scrollerComponent;
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
      takeUntil(this._$unsubscribe),
      distinctUntilChanged(),
      switchMap(scroller => {
        return $scrollerScroll.pipe(
          takeUntil(this._$unsubscribe),
        );
      }),
      tap(userAction => {
        hasUserAction = userAction;
        const scrollerEl = this._$scroller.getValue()?.nativeElement, scrollerComponent = this._scrollerComponent;
        if (scrollerEl && scrollerComponent) {
          this.emitScrollEvent(false, this._readyForShow, userAction);
        }
        scrollHandler(userAction);
      }),
    ).subscribe();

    $scroller.pipe(
      takeUntil(this._$unsubscribe),
      distinctUntilChanged(),
      switchMap(scroller => {
        return $scrollerScrollEnd.pipe(
          takeUntil(this._$unsubscribe),
        );
      }),
      tap(userAction => {
        hasUserAction = userAction;
        const scrollerEl = this._$scroller.getValue()?.nativeElement, scrollerComponent = this._scrollerComponent;
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
      takeUntil(this._$unsubscribe),
      switchMap(event => {
        const trackBy = this.trackBy, scrollerComponent = this._scrollerComponent,
          {
            id, iteration = 0, blending = false,
            isLastIteration = false, scrollCalled = false, cb,
          } = event;
        const nextIteration = iteration + 1, finished = nextIteration >= MAX_SCROLL_TO_ITERATIONS, fireUpdate = false;

        if (!this._readyForShow) {
          return of([finished, { iteration: nextIteration, blending, scrollCalled, cb }]).pipe(delay(0));
        }

        debouncedUpdate.dispose();
        this._$preventScrollSnapping.next(true);

        if (scrollerComponent) {
          const items = this._$actualItems.getValue();
          if (items && items.length) {
            const dynamicSize = this.dynamicSize, itemSize = this.itemSize, snapScrollToEnd = this.snapScrollToEnd;

            if (dynamicSize) {
              const { width, height } = this._$bounds.getValue() || { width: DEFAULT_LIST_SIZE, height: DEFAULT_LIST_SIZE },
                itemConfigMap = this.itemConfigMap, items = this._$actualItems.getValue(), isVertical = this._isVertical,
                currentScrollSize = isVertical ? scrollerComponent.scrollTop : scrollerComponent.scrollLeft,
                opts: IGetItemPositionOptions<IVirtualListItem, IVirtualListCollection> = {
                  bounds: { width, height }, collection: items, dynamicSize, isVertical: this._isVertical, itemSize,
                  bufferSize: this.bufferSize, maxBufferSize: this.maxBufferSize,
                  scrollSize: (isVertical ? scrollerComponent.scrollTop : scrollerComponent.scrollLeft),
                  snap: this.snap, fromItemId: id, enabledBufferOptimization: this.enabledBufferOptimization,
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

              let actualScrollSize = scrollSize + delta1;

              this.resetBoundsSize(isVertical, totalSize);

              this.createDisplayComponentsIfNeed(displayItems);

              this.tracking();

              this.snappingHandler();

              scrollSize = this._trackBox.getItemPosition(id, itemConfigMap, { ...opts, scrollSize: actualScrollSize, fromItemId: id });
              if (scrollSize === -1) {
                return of([finished, { id, blending, iteration: nextIteration, scrollCalled, cb }]).pipe(delay(0));
              }
              const notChanged = scrollSize === currentScrollSize;
              if (!notChanged && iteration < MAX_SCROLL_TO_ITERATIONS) {
                this._trackBox.clearDelta();
                const params: IScrollToParams = {
                  [isVertical ? TOP_PROP_NAME : LEFT_PROP_NAME]: scrollSize, behavior: BEHAVIOR_INSTANT as ScrollBehavior,
                  fireUpdate, blending,
                };
                scrollerComponent?.scrollTo?.(params);
                return of([finished, {
                  id, iteration: nextIteration, blending,
                  isLastIteration: nextIteration < MAX_SCROLL_TO_ITERATIONS, scrollCalled, cb
                }]).pipe(delay(0));
              } else {
                this._$scrollSize.next(actualScrollSize);
                return of([true, { id, blending, iteration: nextIteration, scrollCalled, cb }]).pipe(delay(0));
              }
            } else {
              const index = items.findIndex(item => item[trackBy] === id);
              if (index > -1) {
                const isVertical = this._isVertical,
                  currentScrollSize = (isVertical ? scrollerComponent.scrollTop : scrollerComponent.scrollLeft),
                  scrollSize = index * this.itemSize;
                if (currentScrollSize !== scrollSize) {
                  this._$preventScrollSnapping.next(true);
                  const params: IScrollToParams = {
                    [this._isVertical ? TOP_PROP_NAME : LEFT_PROP_NAME]: scrollSize, fireUpdate,
                    behavior: BEHAVIOR_INSTANT as ScrollBehavior, blending,
                  };
                  scrollerComponent?.scrollTo?.(params);
                  return of([true, { id, blending, iteration: nextIteration, scrollCalled, cb }]);
                }
              }
            }
          }
        }
        return of([finished, { id, iteration: nextIteration, scrollCalled, cb }]);
      }),
      takeUntil(this._$unsubscribe),
      tap(([finished, params]) => {
        const scrollParams = params as IScrollParams & { scrollCalled: boolean; };
        if (!finished && !scrollParams?.scrollCalled) {
          this._$scrollToExecutor.next(params as IScrollParams);
          return;
        }

        if (this._readyForShow) {
          this._trackBox.preventScrollSnapping(true);
        }

        this._$scrollingTo.next(false);
        if (!this.dynamicSize) {
          this._$fireUpdate.next(true);
          this._scrollerComponent?.refresh(false, true);
        }
        this.emitScrollEvent(true, false, true);
        scrollParams?.cb?.();
      }),
    ).subscribe();

    const $itemRenderer = this.$itemRenderer;

    $itemRenderer.pipe(
      takeUntil(this._$unsubscribe),
      distinctUntilChanged(),
      filter(v => !!v),
      tap(v => {
        this._$itemRenderer.next(v);
      }),
    ).subscribe();

    $bounds.pipe(
      takeUntil(this._$unsubscribe),
      distinctUntilChanged(),
      tap(bounds => {
        const size: ISize = { width: bounds!.width ?? 0, height: bounds!.height ?? 0 };
        this.onViewportChange.emit(objectAsReadonly(size));
      }),
    ).subscribe();

    this._service.$itemClick.pipe(
      takeUntil(this._$unsubscribe),
      tap(v => {
        this.onItemClick.emit(objectAsReadonly(v));
      }),
    ).subscribe();

    let isSelectedIdsFirstEmit = 0;

    this._service.$selectedIds.pipe(
      takeUntil(this._$unsubscribe),
      distinctUntilChanged(),
      tap(v => {
        if (this._isSingleSelecting || (this._isMultiSelecting && isSelectedIdsFirstEmit >= 2)) {
          const curr = this.selectedIds;
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
      takeUntil(this._$unsubscribe),
      distinctUntilChanged(),
      tap(v => {
        this._service.selectedIds = v;
      }),
    ).subscribe();

    let isCollapsedIdsFirstEmit = 0;

    this._service.$collapsedIds.pipe(
      takeUntil(this._$unsubscribe),
      distinctUntilChanged(),
      tap(v => {
        this._$collapsedItemIds.next(v);

        if (isCollapsedIdsFirstEmit >= 2) {
          const curr = this.collapsedIds;
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
      takeUntil(this._$unsubscribe),
      distinctUntilChanged(),
      tap(v => {
        this._service.collapsedIds = v;
      }),
    ).subscribe();

    this.$destroy.pipe(
      takeUntil(this._$unsubscribe),
      tap(() => {
        debouncedUpdate.dispose();
      }),
    ).subscribe();
  }

  private onAfterResize(update = false) {
    this.snappingHandler();

    if (this._isSnappingMethodAdvanced) {
      this.updateRegularRenderer();
    }

    if (this._readyForShow && update) {
      const scroller = this._scrollerComponent;
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
    const scroller = this._scrollerComponent;
    if (!!scroller) {
      const isVertical = this.isVertical,
        maxScrollSize = Math.round(isVertical ? scroller.scrollHeight ?? 0 : scroller.scrollWidth ?? 0),
        scrollSize = isVertical ? scroller.scrollTop ?? 0 : scroller.scrollLeft ?? 0,
        actualScrollSize = Math.round(scrollSize);
      if (this._readyForShow && !this._isLoading) {
        if (maxScrollSize >= 0) {
          const isScrollStart = (actualScrollSize <= MIN_PIXELS_FOR_PREVENT_SNAPPING);
          if (isScrollStart) {
            this._$isScrollStart.next(true);
            this._$isScrollEnd.next(false);
            this._trackBox.isScrollStart = true;
            this._trackBox.isScrollEnd = false;
          } else {
            const isScrollEnd = (actualScrollSize >= (maxScrollSize - MIN_PIXELS_FOR_PREVENT_SNAPPING));
            this._$isScrollStart.next(false);
            this._$isScrollEnd.next(isScrollEnd);
            this._trackBox.isScrollStart = false;
            this._trackBox.isScrollEnd = isScrollEnd;
          }
        }
      } else if (!this._readyForShow) {
        const snapScrollToStart = this.snapScrollToStart, snapScrollToEnd = this.snapScrollToEnd;
        if (!snapScrollToStart && snapScrollToEnd) {
          this._$isScrollStart.next(false);
          this._$isScrollEnd.next(true);
          this._trackBox.isScrollStart = false;
          this._trackBox.isScrollEnd = true;
        } else if (snapScrollToStart && snapScrollToEnd) {
          this._$isScrollStart.next(true);
          this._$isScrollEnd.next(false);
          this._trackBox.isScrollStart = true;
          this._trackBox.isScrollEnd = false;
        } else {
          this._$isScrollStart.next(false);
          this._$isScrollEnd.next(false);
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
    const scrollerEl = this._$scroller.getValue()?.nativeElement, scrollerComponent = this._scrollerComponent;
    if (scrollerEl && scrollerComponent) {
      const isVertical = this._isVertical, scrollSize = (isVertical ? scrollerComponent.scrollTop : scrollerComponent.scrollLeft),
        maxScrollSize = (isVertical ? scrollerComponent.scrollHeight : scrollerComponent.scrollWidth),
        bounds = this._$bounds.getValue() || { x: 0, y: 0, width: DEFAULT_LIST_SIZE, height: DEFAULT_LIST_SIZE },
        currentScrollSize = this._$scrollSize.getValue();
      this._trackBox.deltaDirection = currentScrollSize > scrollSize ? -1 : currentScrollSize < scrollSize ? 1 : 0;
      const itemsRange = formatActualDisplayItems(this._service.displayItems, this.scrollStartOffset, this.scrollEndOffset,
        scrollSize, isVertical, bounds),
        event = new ScrollEvent({
          direction: this._trackBox.scrollDirection, container: scrollerEl,
          list: this._$list.getValue()!.nativeElement, delta: this._trackBox.delta,
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
    const method = m || this.snappingMethod;
    return isSnappingMethodAdvenced(method);
  }

  private getIsNotSelecting(m?: MethodForSelecting) {
    const method = m || this.methodForSelecting;
    return isMethodForSelecting(method, MethodsForSelecting.NONE);
  }

  private getIsSingleSelecting(m?: MethodForSelecting) {
    const method = m || this.methodForSelecting;
    return isMethodForSelecting(method, MethodsForSelecting.SELECT);
  }

  private getIsMultiSelecting(m?: MethodForSelecting) {
    const method = m || this.methodForSelecting;
    return isMethodForSelecting(method, MethodsForSelecting.MULTI_SELECT);
  }

  private getIsVertical(d?: Direction) {
    const dir = d || this.direction;
    return isDirection(dir, Directions.VERTICAL);
  }

  private getIsLazy(m?: CollectionMode) {
    const mode = m || this.collectionMode;
    return isCollectionMode(mode, CollectionModes.LAZY);
  }

  private createDisplayComponentsIfNeed(displayItems: IRenderVirtualListCollection | null) {
    if (!displayItems || !this._listContainerRef) {
      this._trackBox.setDisplayObjectIndexMapById({});
      return;
    }

    if (this._isSnappingMethodAdvanced && this.snap) {
      if (this._snappedDisplayComponents.length < MAX_REGULAR_SNAPED_COMPONENTS && this._snapContainerRef) {
        while (this._snappedDisplayComponents.length < MAX_REGULAR_SNAPED_COMPONENTS) {
          const comp = this._snapContainerRef.createComponent(this._itemComponentClass);
          comp.instance.renderer = this.itemRenderer;
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
          item.instance.renderer = this.itemRenderer;
          doMap[id] = i;
        }
      }
      while (components.length < maxLength) {
        const comp = listContainerRef.createComponent(this._itemComponentClass);
        const id = comp.instance.id;
        comp.instance.renderer = this.itemRenderer;
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
    const l = this._$list.getValue(), prop = isVertical ? HEIGHT_PROP_NAME : WIDTH_PROP_NAME,
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
    this._service.focusById(id, align, this.scrollBehavior);
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
    if (!this._scrollerComponent?.scrollable) {
      this.scrollToFinalize(id, focused, cb);
      return;
    }
    this._$scrollTo.next({
      id, behavior, blending, iteration: actualIteration, isLastIteration: actualIteration === MAX_SCROLL_TO_ITERATIONS, cb: () => {
        this.scrollToFinalize(id, focused, cb);
      }
    });
  }

  /**
   * Scrolls the scroll area to the first item in the collection.
   */
  scrollToStart(cb: (() => void) | null = null, options: IScrollOptions | null = null) {
    const scroller = this._scrollerComponent;
    if (scroller) {
      scroller.stopScrolling();
    }
    const behavior = options?.behavior ?? BEHAVIOR_INSTANT,
      blending = options?.blending ?? false,
      focused = options?.focused ?? true,
      iteration = options?.iteration ?? 0;
    validateScrollBehavior(behavior);
    validateIteration(iteration);
    const trackBy = this.trackBy, items = this.items, firstItem = items.length > 0 ? items[0] ?? null : null, id = firstItem?.[trackBy] ?? null,
      actualIteration = validateScrollIteration(iteration);
    if (!!firstItem) {
      this._elementRef.nativeElement.focus();
      this._$scrollTo.next({
        id, behavior, blending, iteration: actualIteration, isLastIteration: actualIteration === MAX_SCROLL_TO_ITERATIONS, cb: () => {
          this._$isScrollStart.next(true);
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
  scrollToEnd(cb: (() => void) | null = null, options: IScrollOptions | null = null) {
    const scroller = this._scrollerComponent;
    if (scroller) {
      scroller.stopScrolling();
    }
    const behavior = (options?.behavior ?? BEHAVIOR_INSTANT) as ScrollBehavior,
      blending = options?.blending ?? false,
      focused = options?.focused ?? true,
      iteration = options?.iteration ?? 0;
    validateScrollBehavior(behavior);
    validateIteration(iteration);
    const trackBy = this.trackBy, items = this.items, latItem = items[items.length > 0 ? items.length - 1 : 0], id = latItem[trackBy],
      actualIteration = validateScrollIteration(iteration);
    this._elementRef.nativeElement.focus();
    if (!this._scrollerComponent?.scrollable) {
      this.scrollToFinalize(id, focused, cb);
      return;
    }
    this._$scrollTo.next({
      id, behavior, blending, iteration: actualIteration, isLastIteration: actualIteration === MAX_SCROLL_TO_ITERATIONS, cb: () => {
        this._$isScrollEnd.next(true);
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
    if (this.dynamicSize) {
      this._trackBox.cacheClean();
    }
    const prerenderContainer = this._prerender;
    if (!!prerenderContainer) {
      prerenderContainer.clear();
      prerenderContainer.off();
    }
    this._$collapsedItemIds.next([]);
    this._$isScrollStart.next(true);
    this._$isScrollEnd.next(false);
    this._$totalSize.next(0);
    this._$scrollSize.next(0);
    const scrollerComponent = this._scrollerComponent;
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
    const scroller = this._scrollerComponent;
    this._$isScrollStart.next(false);
    this._$isScrollEnd.next(false);
    this._trackBox.preventScrollSnapping(true);
    if (scroller) {
      scroller.stopScrolling();
    }
  }

  override ngOnDestroy(): void {
    this.ngOnDestroy();
    this.dispose();
  }

  private dispose() {
    this._$destroy.next();

    const updateId = this._updateId;
    if (updateId !== undefined) {
      cancelAnimationFrame(updateId);
      this._updateId = undefined;
    }

    if (this._service) {
      this._service.dispose();
    }

    if (!!this._trackBox) {
      this._trackBox.dispose();
    }

    if (!!this._resizeSnappedObserver) {
      this._resizeSnappedObserver.disconnect();
    }

    if (!!this._snappedDisplayComponents) {
      while (this._snappedDisplayComponents.length > 0) {
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
