import {
  ChangeDetectionStrategy, ChangeDetectorRef, Component, ComponentRef, ElementRef, EventEmitter, Input,
  OnDestroy, Output, TemplateRef, ViewChild, ViewContainerRef, ViewEncapsulation,
} from '@angular/core';
import {
  BehaviorSubject, combineLatest, debounceTime, delay, distinctUntilChanged, filter, fromEvent, map,
  of, race, Subject, switchMap, take, takeUntil, tap,
} from 'rxjs';
import { NgVirtualListItemComponent } from './components/list-item/ng-virtual-list-item.component';
import {
  BEHAVIOR_INSTANT, CLASS_LIST_HORIZONTAL, CLASS_LIST_VERTICAL, DEFAULT_DIRECTION, DEFAULT_DYNAMIC_SIZE,
  DEFAULT_ENABLED_BUFFER_OPTIMIZATION, DEFAULT_ITEM_SIZE, DEFAULT_BUFFER_SIZE, DEFAULT_LIST_SIZE, DEFAULT_SNAP, DEFAULT_SNAPPING_METHOD,
  HEIGHT_PROP_NAME, LEFT_PROP_NAME, MAX_SCROLL_TO_ITERATIONS, PX, TOP_PROP_NAME, TRACK_BY_PROPERTY_NAME, WIDTH_PROP_NAME,
  DEFAULT_MAX_BUFFER_SIZE, DEFAULT_SELECT_METHOD, DEFAULT_SELECT_BY_CLICK, DEFAULT_COLLAPSE_BY_CLICK, DEFAULT_COLLECTION_MODE,
  DEFAULT_SCREEN_READER_MESSAGE, DEFAULT_SNAP_TO_END_TRANSITION_INSTANT_OFFSET, DEFAULT_SNAP_SCROLLTO_BOTTOM,
  MOUSE_DOWN, MOUSE_UP, MOUSE_LEAVE, MOUSE_OUT, TOUCH_END, TOUCH_LEAVE, TOUCH_OUT, TOUCH_START, SCROLLER_WHEEL, KEY_DOWN, FOCUS,
  SCROLLER_SCROLLBAR_SCROLL, DEFAULT_LANG_TEXT_DIR, DEFAULT_SCROLLBAR_THEME, DEFAULT_CLICK_DISTANCE, DEFAULT_WAIT_FOR_PREPARATION,
  DEFAULT_SCROLLBAR_MIN_SIZE, BEHAVIOR_AUTO, DEFAULT_SCROLLBAR_ENABLED, DEFAULT_SCROLLBAR_INTERACTIVE, DEFAULT_SCROLL_BEHAVIOR,
  DEFAULT_ANIMATION_PARAMS, DEFAULT_OVERSCROLL_ENABLED,
} from './const';
import { IRenderVirtualListItem, IScrollEvent, IScrollOptions, IVirtualListCollection, IVirtualListItem, IVirtualListItemConfigMap, } from './models';
import { FocusAlignment, IAnimationParams, Id, IRect, ISize, ScrollBarTheme } from './types';
import { IRenderVirtualListCollection } from './models/render-collection.model';
import {
  CollectionMode, CollectionModes, Direction, Directions, FocusAlignments, MethodForSelecting, MethodsForSelecting, SnappingMethod, SnappingMethods,
  TextDirection, TextDirections,
} from './enums';
import { ScrollEvent, toggleClassName } from './utils';
import { IGetItemPositionOptions, IUpdateCollectionOptions, TrackBoxEvents, TrackBox } from './utils/track-box';
import { DisposableComponent } from './utils/disposable-component';
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
  behavior?: ScrollBehavior | 'auto' | 'smooth' | 'instant';
  blending?: boolean;
  iteration?: number;
  isLastIteration?: boolean;
  scrollCalled?: boolean;
  scroller?: HTMLElement;
  cb?: () => void;
}

const MIN_SCROLL_TO_START_PIXELS = 10,
  RANGE_DISPLAY_ITEMS_END_OFFSET = 20,
  MIN_PREPARE_ITERATIONS = 5,
  PREPARATION_REUPDATE_LENGTH = 2,
  EMPTY_SCROLL_STATE_VERSION = '-1',
  ROLE_LIST = 'list',
  ROLE_LIST_BOX = 'listbox',
  ITEM_ID = 'item-id',
  ITEM_CONTAINER = 'ngvl-item__container',
  READY_TO_START: string = 'ready-to-start',
  WAIT_FOR_PREPARATION: string = 'wait-for-preparation';

const validateScrollIteration = (value: number) => {
  return Number.isNaN(value) || (value < 0) ? 0 : value > MAX_SCROLL_TO_ITERATIONS ? MAX_SCROLL_TO_ITERATIONS : value
},
  validateId = (id: Id) => {
    const valid = validateString(id as string) || validateFloat(id as number);
    if (!valid) {
      throw Error('The "id" parameter must be of type `Id`.');
    }
  },
  validateScrollBehavior = (behavior: ScrollBehavior | 'auto' | 'instant' | 'smooth') => {
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
  providers: [NgVirtualListService],
})
export class NgVirtualListComponent extends DisposableComponent implements OnDestroy {
  private static __nextId: number = 0;

  private _id: number = NgVirtualListComponent.__nextId;
  /**
   * Readonly. Returns the unique identifier of the component.
   */
  get id() { return this._id; }

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
  onItemClick = new EventEmitter<IRenderVirtualListItem<any> | undefined>();

  /**
   * Fires when elements are selected.
   */
  @Output()
  onSelect = new EventEmitter<Array<Id> | Id | undefined>();

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

  private _$scrollbarTheme = new BehaviorSubject<ScrollBarTheme | undefined>(DEFAULT_SCROLLBAR_THEME);
  protected readonly $scrollbarTheme = this._$scrollbarTheme.asObservable();

  private _scrollbarThemeTransform = (v: ScrollBarTheme) => {
    const valid = validateObject(v);

    if (!valid) {
      console.error('The "scrollbarTheme" parameter must be of type `object`.');
      return DEFAULT_SCROLLBAR_THEME;
    }
    return v;
  };

  /**
   * Scrollbar theme.
   */
  @Input()
  set scrollbarTheme(v: ScrollBarTheme) {
    if (this._$scrollbarTheme.getValue() === v) {
      return;
    }

    const transformedValue = this._scrollbarThemeTransform(v);

    this._$scrollbarTheme.next(transformedValue);

    this._cdr.markForCheck();
  };
  get scrollbarTheme() { return this._$scrollbarTheme.getValue() as ScrollBarTheme; }

  private _$scrollbarMinSize = new BehaviorSubject<number>(DEFAULT_SCROLLBAR_MIN_SIZE);
  protected readonly $scrollbarMinSize = this._$scrollbarMinSize.asObservable();

  private _scrollbarMinSizeTransform = (v: number) => {
    const valid = validateObject(v);

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

    this._cdr.markForCheck();
  };
  get scrollbarMinSize() { return this._$scrollbarMinSize.getValue() as number; }

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

    this._cdr.markForCheck();
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

    this._cdr.markForCheck();
  };
  get waitForPreparation() { return this._$waitForPreparation.getValue() as boolean; }

  private _$clickDistance = new BehaviorSubject<number>(DEFAULT_CLICK_DISTANCE);
  protected readonly $clickDistance = this._$clickDistance.asObservable();

  private _clickDistanceTransform = (v: number) => {
    const valid = validateObject(v);

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

    this._cdr.markForCheck();
  };
  get clickDistance() { return this._$clickDistance.getValue() as number; }

  private _$snapToEndTransitionInstantOffset = new BehaviorSubject<number>(DEFAULT_SNAP_TO_END_TRANSITION_INSTANT_OFFSET);
  protected readonly $snapToEndTransitionInstantOffset = this._$snapToEndTransitionInstantOffset.asObservable();

  private _snapToEndTransitionInstantOffsetTransform = (v: number) => {
    const valid = validateInt(v);

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

    this._cdr.markForCheck();
  };
  get snapToEndTransitionInstantOffset() { return this._$snapToEndTransitionInstantOffset.getValue(); }

  private _$scrollStartOffset = new BehaviorSubject<number>(0);
  protected readonly $scrollStartOffset = this._$scrollStartOffset.asObservable();

  private _scrollStartOffsetTransform = (v: number) => {
    const valid = validateInt(v);

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

    this._cdr.markForCheck();
  };
  get scrollStartOffset() { return this._$scrollStartOffset.getValue(); }

  private _$scrollEndOffset = new BehaviorSubject<number>(0);
  protected readonly $scrollEndOffset = this._$scrollEndOffset.asObservable();

  private _scrollEndOffsetTransform = (v: number) => {
    const valid = validateInt(v);

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

    this._cdr.markForCheck();
  };
  get scrollEndOffset() { return this._$scrollEndOffset.getValue(); }

  private _$snapScrollToBottom = new BehaviorSubject<boolean>(DEFAULT_SNAP_SCROLLTO_BOTTOM);
  protected readonly $snapScrollToBottom = this._$snapScrollToBottom.asObservable();

  private _snapScrollToBottomTransform = (v: boolean) => {
    const valid = validateBoolean(v);

    if (!valid) {
      console.error('The "snapScrollToBottom" parameter must be of type `boolean`.');
      return DEFAULT_SNAP_SCROLLTO_BOTTOM;
    }
    return v;
  };

  /**
   * Determines whether the scroll will be anchored to the end of the list at startup.. Default value is "false".
   */
  @Input()
  set snapScrollToBottom(v: boolean) {
    if (this._$snapScrollToBottom.getValue() === v) {
      return;
    }

    const transformedValue = this._snapScrollToBottomTransform(v);

    this._$snapScrollToBottom.next(transformedValue);

    this._cdr.markForCheck();
  };
  get snapScrollToBottom() { return this._$snapScrollToBottom.getValue(); }

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

    this._cdr.markForCheck();
  };
  get langTextDir() { return this._$langTextDir.getValue(); }

  private _$defaultItemValue = new BehaviorSubject<IVirtualListItem | null>(null);
  protected readonly $defaultItemValue = this._$defaultItemValue.asObservable();

  @Input()
  set defaultItemValue(v: IVirtualListItem | null) {
    if (this._$defaultItemValue.getValue() === v) {
      return;
    }

    this._$defaultItemValue.next(v);

    this._cdr.markForCheck();
  };
  get defaultItemValue() { return this._$defaultItemValue.getValue(); }

  private _$items = new BehaviorSubject<IVirtualListCollection | undefined>(undefined);
  protected readonly $items = this._$items.asObservable();

  private _itemsTransform = (v: IVirtualListCollection | undefined) => {
    let valid = validateArray(v, true);
    if (valid) {
      if (v) {
        for (let i = 0, l = v.length; i < l; i++) {
          const item = v[i], trackBy = this.trackBy;
          valid = validateObject(item, true);
          if (valid) {
            if (item && !(validateFloat(item[trackBy] as number, true) || validateString(item[trackBy] as string, true))) {
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

    this._cdr.markForCheck();
  };
  get items() { return this._$items.getValue() as IVirtualListCollection; }

  private _$selectedIds = new BehaviorSubject<Array<Id> | Id | undefined>(undefined);
  protected readonly $selectedIds = this._$selectedIds.asObservable();

  private _selectedIdsTransform = (v: Array<Id> | Id | undefined) => {
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
  };

  /**
   * Sets the selected items.
   */
  @Input()
  set selectedIds(v: Array<Id> | Id | undefined) {
    if (this._$selectedIds.getValue() === v) {
      return;
    }

    const transformedValue = this._selectedIdsTransform(v);

    this._$selectedIds.next(transformedValue);

    this._cdr.markForCheck();
  };
  get selectedIds() { return this._$selectedIds.getValue(); }

  private _$collapsedIds = new BehaviorSubject<Array<Id>>([]);
  protected readonly $collapsedIds = this._$collapsedIds.asObservable();

  private _collapsedIdsTransform = (v: Array<Id>) => {
    let valid = validateArray(v as any);
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

    this._cdr.markForCheck();
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

    this._cdr.markForCheck();
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

    this._cdr.markForCheck();
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

    this._cdr.markForCheck();
  };
  get snap() { return this._$snap.getValue(); }

  private _$scrollbarEnabled = new BehaviorSubject<boolean>(DEFAULT_SCROLLBAR_ENABLED);
  protected readonly $scrollbarEnabled = this._$scrollbarEnabled.asObservable();

  private _scrollbarEnabledTransform = (v: boolean) => {
    const valid = validateBoolean(v);

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

    this._cdr.markForCheck();
  };
  get scrollbarEnabled() { return this._$scrollbarEnabled.getValue(); }

  private _$scrollbarInteractive = new BehaviorSubject<boolean>(DEFAULT_SCROLLBAR_INTERACTIVE);
  protected readonly $scrollbarInteractive = this._$scrollbarInteractive.asObservable();

  private _scrollbarInteractiveTransform = (v: boolean) => {
    const valid = validateBoolean(v);

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

    this._cdr.markForCheck();
  };
  get scrollbarInteractive() { return this._$scrollbarInteractive.getValue(); }

  private _$scrollBehavior = new BehaviorSubject<ScrollBehavior>(DEFAULT_SCROLL_BEHAVIOR);
  protected readonly $scrollBehavior = this._$scrollBehavior.asObservable();

  private _scrollBehaviorTransform = (v: ScrollBehavior) => {
    const valid = validateString(v);

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

    this._cdr.markForCheck();
  };
  get scrollBehavior() { return this._$scrollBehavior.getValue(); }

  private _$animationParams = new BehaviorSubject<IAnimationParams>(DEFAULT_ANIMATION_PARAMS);
  protected readonly $animationParams = this._$animationParams.asObservable();

  private _animationParamsTransform = (v: IAnimationParams) => {
    const valid = validateObject(v, true);

    if (!valid) {
      console.error('The "animationParams" parameter must be of type `object`.');
      return DEFAULT_ANIMATION_PARAMS;
    }
    return v;
  };

  /**
   * Animation parameters. The default value is "{ scrollToItem: 50, navigateToItem: 150 }".
   */
  @Input()
  set animationParams(v: IAnimationParams) {
    if (this._$animationParams.getValue() === v) {
      return;
    }

    const transformedValue = this._animationParamsTransform(v);

    this._$animationParams.next(transformedValue);

    this._cdr.markForCheck();
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

    this._cdr.markForCheck();
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

    this._cdr.markForCheck();
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

  private _$renderer = new BehaviorSubject<TemplateRef<any> | undefined>(undefined);
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

    this._cdr.markForCheck();
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
   * If the `sticky` value is greater than `0`, then the `sticky` position mode is enabled for the element. `1` - position start, `2` - position end. Default value is `0`.
   * `selectable` determines whether an element can be selected or not. Default value is `true`.
   * `collapsable` determines whether an element with a `sticky` property greater than zero can collapse and collapse elements in front that do not have a `sticky` property.
   * @link https://github.com/DjonnyX/ng-virtual-list/blob/14.x/projects/ng-virtual-list/src/lib/models/item-config-map.model.ts
   * @author Evgenii Grebennikov
   * @email djonnyx@gmail.com
   */
  @Input()
  set itemConfigMap(v: IVirtualListItemConfigMap) {
    if (this._$itemConfigMap.getValue() === v) {
      return;
    }

    const transformedValue = this._itemConfigMapTransform(v);

    this._$itemConfigMap.next(transformedValue);

    this._cdr.markForCheck();
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

    this._cdr.markForCheck();
  };
  get itemSize() { return this._$itemSize.getValue(); }

  private _$actualItemSize = new BehaviorSubject<number>(this.itemSize);
  protected $actualItemSize = this._$actualItemSize.asObservable();

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

    this._cdr.markForCheck();
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

    this._cdr.markForCheck();
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

    this._cdr.markForCheck();
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
    const valid = validateString(v) && (v === SnappingMethods.NORMAL || v === SnappingMethods.ADVANCED || v === SnappingMethods.CHAT);
    if (!valid) {
      console.error(`The "snappingMethod" parameter must have the value '${SnappingMethods.NORMAL}', '${SnappingMethods.ADVANCED}' or '${SnappingMethods.CHAT}'.`);
      return DEFAULT_SNAPPING_METHOD;
    }
    return v;
  };

  /**
   * Snapping method.
   * 'default' - Normal group rendering.
   * 'advanced' - The group is rendered on a transparent background. List items below the group are not rendered.
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
    const valid = validateString(v) && (v === 'none' || v === 'select' || 'multi-select');
    if (!valid) {
      console.error('The "methodForSelecting" parameter must have the value `none`, `select` or `multi-select`.');
      return DEFAULT_SELECT_METHOD;
    }
    return v;
  };

  /**
   *  Method for selecting list items.
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

  private _isVertical = this.getIsVertical();

  private _$focusedElement = new BehaviorSubject<Id | undefined>(undefined);
  protected $focusedElement = this._$focusedElement.asObservable();

  private _$classes = new BehaviorSubject<{ [cName: string]: boolean }>({});
  protected $classes = this._$classes.asObservable();

  private _isSnappingMethodAdvanced: boolean = this.getIsSnappingMethodAdvanced();

  private _isNotSelecting = this.getIsNotSelecting();

  private _isSingleSelecting = this.getIsSingleSelecting();

  private _isMultiSelecting = this.getIsMultiSelecting();

  private _$actualItems = new BehaviorSubject<IVirtualListCollection>([]);

  private _$collapsedItemIds = new BehaviorSubject<Array<Id>>([]);

  private _displayComponents: Array<ComponentRef<BaseVirtualListItemComponent>> = [];

  private _snapedDisplayComponent: ComponentRef<BaseVirtualListItemComponent> | undefined;

  private _$bounds = new BehaviorSubject<IRect | null>(null);

  private _$totalSize = new BehaviorSubject<number>(0);

  private _$listBounds = new BehaviorSubject<IRect | null>(null);

  private _$scrollSize = new BehaviorSubject<number>(0);

  private _$isScrollStart = new BehaviorSubject<boolean>(true);

  private _$isScrollFinished = new BehaviorSubject<boolean>(false);

  private _resizeObserver: ResizeObserver | null = null;

  private _listResizeObserver: ResizeObserver | null = null;

  private _resizeSnappedComponentHandler = () => {
    const list = this._$list.getValue(), scroller = this._$scroller.getValue(), bounds = this._$bounds.getValue(), snappedComponent = this._snapedDisplayComponent?.instance;
    if (list && scroller && snappedComponent) {
      const isVertical = this._isVertical, listBounds = list.nativeElement.getBoundingClientRect(), listElement = list?.nativeElement,
        { width: lWidth, height: lHeight } = listElement?.getBoundingClientRect() ?? { width: 0, height: 0 },
        { width, height } = bounds ?? { width: 0, height: 0 }/*,
        isScrollable = isVertical ? scroller.nativeElement.scrollHeight > 0 : scroller.nativeElement.scrollWidth > 0*/;

      let scrollBarSize = isVertical ? width - lWidth : height - lHeight;

      this._service.scrollBarSize = scrollBarSize;

      const langTextDir = this._$langTextDir.getValue();

      const snappingMethod = this._$snappingMethod.getValue();
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
    const bounds = this._$scroller.getValue()?.nativeElement?.getBoundingClientRect();
    if (bounds) {
      this._$bounds.next({ x: bounds.x, y: bounds.y, width: bounds.width, height: bounds.height });
    } else {
      this._$bounds.next({ x: 0, y: 0, width: DEFAULT_LIST_SIZE, height: DEFAULT_LIST_SIZE });
    }

    if (this._isSnappingMethodAdvanced) {
      this.updateRegularRenderer();
    }

    const scroller = this._scrollerComponent;
    if (!!scroller) {
      const updatebale = this._readyToShow;
      scroller.refresh(updatebale, updatebale);
    }
  }

  private _onListResizeHandler = () => {
    const bounds = this._$list.getValue()?.nativeElement?.getBoundingClientRect();
    if (bounds) {
      this._$listBounds.next({ x: bounds.x, y: bounds.y, width: bounds.width, height: bounds.height });
    } else {
      this._$listBounds.next({ x: 0, y: 0, width: DEFAULT_LIST_SIZE, height: DEFAULT_LIST_SIZE });
    }
  }

  private itemToFocus = (element: HTMLElement, position: number, align: FocusAlignment = FocusAlignments.CENTER,
    behavior: ScrollBehavior = BEHAVIOR_AUTO) => {
    if (!this._readyToShow) {
      return;
    }
    const scroller = this._scrollerComponent;
    if (scroller) {
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

        this._trackBox.cancelScrollSnappingToEnd(true);
        const params: IScrollToParams = {
          [this._isVertical ? TOP_PROP_NAME : LEFT_PROP_NAME]: pos, behavior,
          fireUpdate: true, blending: true, userAction: true, duration: this._$animationParams.getValue().navigateToItem,
        };
        scroller.refresh(false);
        scroller.scrollTo(params);
      }
    }
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
  private _trackBox: TrackBox = new this._trackBoxClass(this._$trackBy.getValue());

  private _onTrackBoxChangeHandler = (v: number) => {
    this._$cacheVersion.next(v);
  };

  private _$cacheVersion = new BehaviorSubject<number>(-1);
  protected get $cacheVersion() { return this._$cacheVersion.asObservable(); }

  private _$update = new Subject<string>();
  protected $update = this._$update.asObservable();

  private _$isResetedReachStart = new BehaviorSubject<boolean>(true);
  protected $isResetedReachStart = this._$isResetedReachStart.asObservable();

  private _$scrollTo = new Subject<IScrollParams>();
  protected $scrollTo = this._$scrollTo.asObservable();

  private _$scroll = new Subject<IScrollEvent>();
  readonly $scroll = this._$scroll.asObservable();

  private _$fireUpdate = new Subject<IScrollEvent | void>();
  protected $fireUpdate = this._$fireUpdate.asObservable();

  private _$fireUpdateNextFrame = new Subject<IScrollEvent | void>();
  protected $fireUpdateNextFrame = this._$fireUpdateNextFrame.asObservable();

  private _$snapScrollToEndCanceller = new BehaviorSubject<boolean>(false);
  readonly $snapScrollToEndCanceller = this._$snapScrollToEndCanceller.asObservable();

  private _updateId: number | undefined;

  private _scrollStateUpdateIndex: number = 0;

  private _readyToShow = false;

  private _isUserScrolling = false;

  private _prevScrollStateVersion = EMPTY_SCROLL_STATE_VERSION;

  private _updateIterations = 0;

  private _$viewInit = new BehaviorSubject<boolean>(false);
  private readonly $viewInit = this._$viewInit.asObservable();

  protected getScrollStateVersion(totalSize: number, scrollSize: number, cacheVersion: number): string {
    if (totalSize < scrollSize) {
      this._scrollStateUpdateIndex = this._scrollStateUpdateIndex === Number.MAX_SAFE_INTEGER ? 0 : this._scrollStateUpdateIndex + 1;
    }
    return `${this._scrollStateUpdateIndex}_${totalSize}_${scrollSize}_${cacheVersion}`;
  };

  constructor(
    private _cdr: ChangeDetectorRef,
    private _elementRef: ElementRef<HTMLDivElement>,
    private _service: NgVirtualListService,
  ) {
    super();
    NgVirtualListComponent.__nextId = NgVirtualListComponent.__nextId + 1 === Number.MAX_SAFE_INTEGER
      ? 0 : NgVirtualListComponent.__nextId + 1;
    this._id = NgVirtualListComponent.__nextId;

    this._service.initialize(this._trackBox);
    this._service.itemToFocus = this.itemToFocus;

    this._trackBox.displayComponents = this._displayComponents;
  }

  ngAfterViewInit() {
    this.$fireUpdateNextFrame.pipe(
      takeUntil(this._$unsubscribe),
      debounceTime(0),
      tap(e => {
        this._$fireUpdate.next(e);
      }),
    ).subscribe();

    const $scrollToItem = this.$scrollTo.pipe(takeUntil(this._$unsubscribe)),
      $mouseDown = fromEvent(this._elementRef.nativeElement, MOUSE_DOWN).pipe(takeUntil(this._$unsubscribe)),
      $touchStart = fromEvent(this._elementRef.nativeElement, TOUCH_START).pipe(takeUntil(this._$unsubscribe));

    fromEvent(document, KEY_DOWN).pipe(
      takeUntil(this._$unsubscribe),
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
        )
      }),
    ).subscribe();

    this._service.$scrollToStart.pipe(
      takeUntil(this._$unsubscribe),
      tap(options => {
        this.scrollToStart(undefined, options);
      }),
    ).subscribe();

    this._service.$scrollToEnd.pipe(
      takeUntil(this._$unsubscribe),
      tap(options => {
        this.scrollToEndItem(undefined, options);
      }),
    ).subscribe();

    this._$scroller.next(this._scrollerComponent?.scrollViewport);
    this._$list.next(this._scrollerComponent?.scrollContent);

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

    const $updateComplete = this.$update.pipe(
      takeUntil(this._$unsubscribe),
      debounceTime(0),
      switchMap((v) => {
        if (((this._prevScrollStateVersion === EMPTY_SCROLL_STATE_VERSION) || (this._prevScrollStateVersion !== v)) &&
          (this._updateIterations < MIN_PREPARE_ITERATIONS)) {
          if (v !== EMPTY_SCROLL_STATE_VERSION) {
            this._prevScrollStateVersion = v;
          }
          this._trackBox.isScrollEnd = true;
          this._$fireUpdate.next();
          return of(false);
        }
        if (this._prevScrollStateVersion === v) {
          this._trackBox.isScrollEnd = true;
          if (this._updateIterations < PREPARATION_REUPDATE_LENGTH) {
            this._updateIterations++;
            this._$fireUpdate.next();
            return of(false);
          }
        }
        this._prevScrollStateVersion = v;
        this.refreshActualItemSize(false);
        return of(true);
      }),
      filter(v => !!v),
      distinctUntilChanged(),
    ),
      $items = this.$items,
      $dynamicSize = this.$dynamicSize;

    const $snapScrollToBottom = this.$snapScrollToBottom,
      $waitForPreparation = this.$waitForPreparation;

    combineLatest([$dynamicSize, $snapScrollToBottom, $waitForPreparation]).pipe(
      takeUntil(this._$unsubscribe),
      distinctUntilChanged(),
      switchMap(([dynamicSize, snapScrollToBottom, waitForPreparation]) => {
        if (!!dynamicSize && !!snapScrollToBottom && !!waitForPreparation) {
          this._$show.next(false);
          this.cacheClean();
          this._readyToShow = this._isUserScrolling = false;
          const scrollerComponent = this._scrollerComponent;
          if (scrollerComponent) {
            scrollerComponent.prepared = false;
            scrollerComponent.stopScrolling();
          }
          this._$classes.next({ prepared: false, [READY_TO_START]: false, [WAIT_FOR_PREPARATION]: false });
          return $items.pipe(
            takeUntil(this._$unsubscribe),
            debounceTime(0),
            tap(items => {
              if (!items || items.length === 0) {
                this.cacheClean();
                this._readyToShow = this._isUserScrolling = false;
                this.refreshActualItemSize(false);
                if (snapScrollToBottom) {
                  this._trackBox.isScrollEnd = true;
                }
                this._updateIterations = 0;
                this._prevScrollStateVersion = EMPTY_SCROLL_STATE_VERSION;
                const scrollerComponent = this._scrollerComponent;
                if (scrollerComponent) {
                  scrollerComponent.prepared = false;
                  scrollerComponent.stopScrolling();
                }
                this._$classes.next({ prepared: false, [READY_TO_START]: false, [WAIT_FOR_PREPARATION]: false });
                this._$show.next(false);
              }
              this._trackBox.resetCollection(items, this._$actualItemSize.getValue());
            }),
            map(i => (i ?? []).length > 0),
            distinctUntilChanged(),
            switchMap(v => {
              if (!v) {
                return of(false);
              }
              return of(true).pipe(
                takeUntil(this._$unsubscribe),
                switchMap(() => {
                  const waitForPreparation = this._$waitForPreparation.getValue();
                  if (waitForPreparation) {
                    this.refreshActualItemSize(false);
                    this._$fireUpdateNextFrame.next();
                    return $updateComplete.pipe(
                      takeUntil(this._$unsubscribe),
                      take(1),
                      tap(() => {
                        this._readyToShow = true;
                        const waitForPreparation = this._$waitForPreparation.getValue(), scrollerComponent = this._scrollerComponent;
                        if (scrollerComponent) {
                          scrollerComponent.prepared = true;
                          scrollerComponent.stopScrolling();
                        }
                        this._$classes.next({ prepared: true, [READY_TO_START]: true, [WAIT_FOR_PREPARATION]: waitForPreparation });
                        this._$show.next(true);
                      }),
                      tap(() => {
                        this.refreshActualItemSize(true);
                        this._scrollerComponent?.refresh(true, true);
                      }),
                    );
                  }
                  this._readyToShow = true;
                  const scrollerComponent = this._scrollerComponent;
                  if (scrollerComponent) {
                    scrollerComponent.prepared = true;
                    scrollerComponent.stopScrolling();
                  }
                  this._$classes.next({ prepared: true, [READY_TO_START]: true, [WAIT_FOR_PREPARATION]: waitForPreparation });
                  this._$show.next(true);
                  return of(false);
                }),
              );
            }),
          );
        } else {
          return $items.pipe(
            takeUntil(this._$unsubscribe),
            debounceTime(0),
            tap(items => {
              if (!items || items.length === 0) {
                this.cacheClean();
                const scrollerComponent = this._scrollerComponent;
                if (scrollerComponent) {
                  scrollerComponent.prepared = false;
                  scrollerComponent.stopScrolling();
                }
                this._$classes.next({ prepared: false, [READY_TO_START]: false, [WAIT_FOR_PREPARATION]: false });
                this._$show.next(false);
              }
              this._trackBox.resetCollection(items, this._$actualItemSize.getValue());
            }),
            map(i => (i ?? []).length > 0),
            distinctUntilChanged(),
            filter(v => !!v),
            tap(() => {
              this._readyToShow = true;
              this.refreshActualItemSize(false);
              if (snapScrollToBottom) {
                this._trackBox.isScrollEnd = true;
              }
              const scrollerComponent = this._scrollerComponent;
              if (scrollerComponent) {
                scrollerComponent.prepared = true;
              }
              this._$classes.next({ prepared: true, [READY_TO_START]: true, [WAIT_FOR_PREPARATION]: true });
              this._$show.next(true);
              this._$fireUpdate.next();
            }),
          );
        }
      }),
    ).subscribe();

    this._service.$focusedId.pipe(
      takeUntil(this._$unsubscribe),
      distinctUntilChanged(),
      tap(v => {
        this._$focusedElement.next(v ?? undefined);
      }),
    ).subscribe();

    this.$list.pipe(
      takeUntil(this._$unsubscribe),
      filter(v => !!v),
      tap(list => {
        this._service.listElement = list?.nativeElement ?? null;
      }),
    ).subscribe();

    const $defaultItemValue = this.$defaultItemValue,
      $trackBy = this.$trackBy,
      $selectByClick = this.$selectByClick,
      $collapseByClick = this.$collapseByClick,
      $isScrollStart = this._$isScrollStart.asObservable(),
      $isScrollFinished = this._$isScrollFinished.asObservable(),
      $scrollStartOffset = this.$scrollStartOffset,
      $scrollEndOffset = this.$scrollEndOffset,
      $isVertical = this.$direction.pipe(
        map(v => this.getIsVertical(v || DEFAULT_DIRECTION)),
      );

    $snapScrollToBottom.pipe(
      takeUntil(this._$unsubscribe),
      distinctUntilChanged(),
      tap(v => {
        this._service.snapScrollToBottom = v;
      }),
    ).subscribe();

    $isVertical.pipe(
      takeUntil(this._$unsubscribe),
      distinctUntilChanged(),
      tap(v => {
        this._service.isVertical = v;
      }),
    ).subscribe();

    $dynamicSize.pipe(
      takeUntil(this._$unsubscribe),
      distinctUntilChanged(),
      tap(v => {
        this._service.dynamic = v;
      }),
    ).subscribe();

    $defaultItemValue.pipe(
      takeUntil(this._$unsubscribe),
      distinctUntilChanged(),
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

    let isResetedReachStart = this._$isResetedReachStart.getValue();

    this.$isResetedReachStart.pipe(
      takeUntil(this._$unsubscribe),
      distinctUntilChanged(),
      tap(v => {
        if (v) {
          isResetedReachStart = v;
        }
      }),
      debounceTime(1),
      takeUntil(this._$unsubscribe),
      tap(v => {
        isResetedReachStart = v;
      }),
    ).subscribe();

    $isScrollStart.pipe(
      takeUntil(this._$unsubscribe),
      distinctUntilChanged(),
      tap(v => {
        if (this._readyToShow && v && !isResetedReachStart && this._scrollerComponent?.scrollable) {
          this._trackBox.isScrollStart = true;
          this.onScrollReachStart.emit();
        }
        this._$isResetedReachStart.next(false);
      }),
    ).subscribe();

    $isScrollFinished.pipe(
      takeUntil(this._$unsubscribe),
      distinctUntilChanged(),
      tap(v => {
        this._trackBox.isScrollEnd = v;
        if (this._readyToShow && v && this._scrollerComponent?.scrollable) {
          this.onScrollReachEnd.emit();
        }
      }),
    ).subscribe();

    $selectByClick.pipe(
      takeUntil(this._$unsubscribe),
      distinctUntilChanged(),
      tap(v => {
        this._service.selectByClick = v;
      }),
    ).subscribe();

    $collapseByClick.pipe(
      takeUntil(this._$unsubscribe),
      distinctUntilChanged(),
      tap(v => {
        this._service.collapseByClick = v;
      }),
    ).subscribe();

    $trackBy.pipe(
      takeUntil(this._$unsubscribe),
      distinctUntilChanged(),
      tap(v => {
        this._trackBox.trackingPropertyName = v;
      }),
    ).subscribe();

    const $bounds = this._$bounds.asObservable().pipe(
      filter(b => !!b),
    ),
      $listBounds = this._$listBounds.asObservable().pipe(
        filter(b => !!b),
      ), $scrollSize = this._$scrollSize.asObservable(),
      $itemSize = this.$itemSize.pipe(
        map(v => v <= 0 ? DEFAULT_ITEM_SIZE : v),
      ),
      $actualItemSize = this.$actualItemSize.pipe(
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
      $actualItems = this._$actualItems.asObservable(),
      $screenReaderMessage = this.$screenReaderMessage,
      $displayItems = this._service.$displayItems,
      $cacheVersion = this._$cacheVersion.asObservable();

    $itemSize.pipe(
      takeUntil(this._$unsubscribe),
      distinctUntilChanged(),
      tap(size => {
        this._$actualItemSize.next(size);
      }),
    ).subscribe();

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
      distinctUntilChanged(),
      tap(v => {
        this._trackBox.isLazy = v;
      }),
    ).subscribe();

    combineLatest([$items, $collapsedItemIds, $itemConfigMap, $trackBy]).pipe(
      takeUntil(this._$unsubscribe),
      debounceTime(0),
      tap(([items, collapsedIds, itemConfigMap, trackBy]) => {
        const hiddenItems = new CMap<Id, boolean>();

        let isCollapsed = false;
        if (!!items) {
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
        }

        const actualItems: IVirtualListCollection = [];
        if (!!items) {
          for (let i = 0, l = items.length; i < l; i++) {
            const item = items[i], id = item[trackBy];
            if (hiddenItems.has(id)) {
              continue;
            }
            actualItems.push(item);
          }
        }

        this._$actualItems.next(actualItems);
      }),
    ).subscribe();

    $isVertical.pipe(
      takeUntil(this._$unsubscribe),
      distinctUntilChanged(),
      tap(v => {
        this._isVertical = v;
        const el: HTMLElement = this._elementRef.nativeElement;
        toggleClassName(el, v ? CLASS_LIST_VERTICAL : CLASS_LIST_HORIZONTAL, v ? CLASS_LIST_HORIZONTAL : CLASS_LIST_VERTICAL);
      }),
    ).subscribe();

    $snappingMethod.pipe(
      takeUntil(this._$unsubscribe),
      distinctUntilChanged(),
      tap(v => {
        this._isSnappingMethodAdvanced = this._trackBox.isSnappingMethodAdvanced = v;
      }),
    ).subscribe();

    $methodForSelecting.pipe(
      takeUntil(this._$unsubscribe),
      distinctUntilChanged(),
      tap(v => {
        const el = this._$list.getValue()?.nativeElement as any;
        if (this.getIsMultiSelecting(v || DEFAULT_SNAPPING_METHOD)) {
          this._isMultiSelecting = true;
          this._isNotSelecting = this._isSingleSelecting = false;
          if (!!el) {
            el.role = ROLE_LIST_BOX;
          }
          this._service.methodOfSelecting = MethodsForSelectingTypes.MULTI_SELECT;
        } else if (this.getIsSingleSelecting(v || DEFAULT_SNAPPING_METHOD)) {
          this._isSingleSelecting = true;
          this._isNotSelecting = this._isMultiSelecting = false;
          if (!!el) {
            el.role = ROLE_LIST_BOX;
          }
          this._service.methodOfSelecting = MethodsForSelectingTypes.SELECT;
        } else if (this.getIsNotSelecting(v || DEFAULT_SNAPPING_METHOD)) {
          this._isNotSelecting = true;
          this._isSingleSelecting = this._isMultiSelecting = false;
          if (!!el) {
            el.role = ROLE_LIST;
          }
          this._service.methodOfSelecting = MethodsForSelectingTypes.NONE;
        }
      }),
    ).subscribe();

    $dynamicSize.pipe(
      takeUntil(this._$unsubscribe),
      distinctUntilChanged(),
      tap(dynamicSize => {
        this.listenCacheChangesIfNeed(dynamicSize);
      })
    ).subscribe();

    const $snapScrollToEndCanceller = this.$snapScrollToEndCanceller;

    $snapScrollToEndCanceller.pipe(
      takeUntil(this._$unsubscribe),
      filter(v => !!v),
      tap((v) => {
        if (this._readyToShow) {
          const scroller = this._scrollerComponent;
          if (scroller) {
            this._trackBox.cancelScrollSnappingToEnd(true);
          }
        }
      }),
      tap(() => {
        if (this._readyToShow) {
          this._$snapScrollToEndCanceller.next(false);
        }
      }),
    ).subscribe();

    const update = (params: {
      snapScrollToBottom: boolean; bounds: IRect; listBounds: IRect; scrollEndOffset: number; items: IVirtualListCollection<Object>;
      itemConfigMap: IVirtualListItemConfigMap; scrollSize: number; itemSize: number; bufferSize: number; maxBufferSize: number;
      snap: boolean; isVertical: boolean; dynamicSize: boolean; enabledBufferOptimization: boolean; cacheVersion: number;
    }, emitable: boolean = true) => {
      const {
        snapScrollToBottom, bounds, listBounds, scrollEndOffset, items, itemConfigMap, scrollSize, itemSize,
        bufferSize, maxBufferSize, snap, isVertical, dynamicSize, enabledBufferOptimization, cacheVersion,
      } = params;
      const scroller = this._scrollerComponent;
      if (scroller) {
        let actualScrollSize = !this._readyToShow && snapScrollToBottom ? (isVertical ? scroller.scrollHeight ?? 0 : scroller.scrollWidth ?? 0) :
          (isVertical ? scroller.scrollTop ?? 0 : scroller.scrollLeft ?? 0),
          totalSize = 0, displayItems: IRenderVirtualListCollection;

        const { width, height, x, y } = bounds, viewportSize = (isVertical ? height : width);

        let scrollLength = Math.round(this._$totalSize.getValue()) ?? 0,
          actualScrollLength = Math.round(scrollLength === 0 ? 0 : scrollLength > viewportSize ? scrollLength - viewportSize : scrollLength),
          roundedMaxPosition = Math.round(actualScrollLength),
          scrollPosition = Math.round(actualScrollSize);

        const opts: IUpdateCollectionOptions<IVirtualListItem, IVirtualListCollection> = {
          bounds: { width, height, x, y }, dynamicSize, isVertical, itemSize,
          bufferSize, maxBufferSize, scrollSize: actualScrollSize, snap, enabledBufferOptimization,
        };

        if (snapScrollToBottom && !this._readyToShow) {
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

        this._$totalSize.next(totalSize);

        this._service.collection = displayItems;

        this.resetBoundsSize(isVertical, totalSize);

        this.createDisplayComponentsIfNeed(displayItems);

        this.tracking();

        if (emitable && this._readyToShow && actualScrollLength > 0) {
          const isScrollStart = this._isUserScrolling && scrollPosition < MIN_SCROLL_TO_START_PIXELS;
          this._$isScrollStart.next(isScrollStart);
          if (isScrollStart) {
            this._$isScrollFinished.next(false);
          } else {
            this._$isScrollFinished.next(scrollPosition >= roundedMaxPosition);
          }
        }

        actualScrollSize = ((!this._readyToShow && snapScrollToBottom) || this._trackBox.isSnappedToEnd) ?
          (isVertical ? scroller.scrollHeight ?? 0 : scroller.scrollWidth ?? 0) :
          (isVertical ? scroller.scrollTop ?? 0 : scroller.scrollLeft ?? 0);
        const delta = this._trackBox.delta,
          roundedActualScrollSize = Math.round(actualScrollSize),
          scrollPositionAfterUpdate = actualScrollSize + delta,
          roundedScrollPositionAfterUpdate = Math.round(scrollPositionAfterUpdate),
          roundedMaxPositionAfterUpdate = Math.round(totalSize - viewportSize);

        if (this._isSnappingMethodAdvanced) {
          this.updateRegularRenderer();
        }

        scroller.delta = delta;

        this._trackBox.clearDelta();

        if ((snapScrollToBottom && this._trackBox.isSnappedToEnd) ||
          (snapScrollToBottom && actualScrollSize > 0 &&
            ((roundedScrollPositionAfterUpdate >= scrollPosition) &&
              (scrollPosition >= roundedMaxPosition) &&
              (roundedMaxPositionAfterUpdate >= roundedMaxPosition)))) {
          if (!this._trackBox.isSnappedToEnd) {
            this._$isScrollFinished.next(true);
          }
          this._trackBox.isScrollEnd = true;
          if (emitable && this._readyToShow) {
            this.emitScrollEvent(true, false);
          }
          if ((this._readyToShow && roundedMaxPositionAfterUpdate > 0) ||
            (roundedMaxPositionAfterUpdate >= 0 && this._$scrollSize.getValue() !== roundedMaxPositionAfterUpdate)) {
            const params: IScrollToParams = {
              [isVertical ? TOP_PROP_NAME : LEFT_PROP_NAME]: roundedMaxPositionAfterUpdate,
              fireUpdate: !this._readyToShow, behavior: BEHAVIOR_INSTANT,
              blending: false, duration: this._$animationParams.getValue().scrollToItem,
            };
            scroller?.scrollTo?.(params);
            if (emitable && !this._readyToShow) {
              this._$update.next(this.getScrollStateVersion(totalSize, this._isVertical ? scroller.scrollTop : scroller.scrollLeft, cacheVersion));
            }
            return;
          }
        } else if (roundedActualScrollSize !== roundedScrollPositionAfterUpdate && scrollPositionAfterUpdate > 0) {
          if (!snapScrollToBottom && scrollPositionAfterUpdate >= roundedMaxPosition) {
            if (!this._trackBox.isSnappedToEnd) {
              this._$isScrollFinished.next(true);
            }
          }
          if (this._$scrollSize.getValue() !== scrollPositionAfterUpdate) {
            const params: IScrollToParams = {
              [isVertical ? TOP_PROP_NAME : LEFT_PROP_NAME]: scrollPositionAfterUpdate, blending: true,
              fireUpdate: !this._readyToShow, behavior: BEHAVIOR_INSTANT, duration: this._$animationParams.getValue().scrollToItem,
            };
            scroller.scrollTo(params);
            if (emitable && !this._readyToShow) {
              this._$update.next(this.getScrollStateVersion(totalSize, this._isVertical ? scroller.scrollTop : scroller.scrollLeft, cacheVersion));
            }
            return;
          }
        }

        if (emitable && !this._readyToShow) {
          this._$update.next(this.getScrollStateVersion(totalSize, this._isVertical ? scroller.scrollTop : scroller.scrollLeft, cacheVersion));
        }
      }
    };

    combineLatest([$snapScrollToBottom, $bounds, $listBounds, $scrollEndOffset, $actualItems, $itemConfigMap, $scrollSize, $actualItemSize,
      $bufferSize, $maxBufferSize, $snap, $isVertical, $dynamicSize, $enabledBufferOptimization, $cacheVersion, this.$fireUpdate,
    ]).pipe(
      takeUntil(this._$unsubscribe),
      distinctUntilChanged(),
      tap(([
        snapScrollToBottom, bounds, listBounds, scrollEndOffset, items, itemConfigMap, scrollSize, itemSize,
        bufferSize, maxBufferSize, snap, isVertical, dynamicSize, enabledBufferOptimization, cacheVersion,
      ]) => {
        update({
          snapScrollToBottom, bounds: bounds!, listBounds: listBounds!, scrollEndOffset, items, itemConfigMap, scrollSize, itemSize,
          bufferSize, maxBufferSize, snap, isVertical, dynamicSize, enabledBufferOptimization, cacheVersion,
        });
      }),
    ).subscribe();

    const $scroller = this.$scroller.pipe(
      takeUntil(this._$unsubscribe),
      filter(v => !!v),
      map(v => v!.nativeElement),
      take(1),
    ),
      $list = this.$list.pipe(
        takeUntil(this._$unsubscribe),
        filter(v => !!v),
        map(v => v!.nativeElement),
        take(1),
      ),
      $scrollerScroll = this._scrollerComponent!.$scroll,
      $scrollerScrollEnd = this._scrollerComponent!.$scrollEnd;

    $scroller.pipe(
      takeUntil(this._$unsubscribe),
      distinctUntilChanged(),
      switchMap(scroller => {
        return fromEvent(scroller, SCROLLER_WHEEL, { passive: true }).pipe(
          takeUntil(this._$unsubscribe),
          filter(() => {
            return !!this._trackBox.isSnappedToEnd && this._readyToShow;
          }),
          tap(() => {
            if (this._readyToShow) {
              this._$snapScrollToEndCanceller.next(true);
            }
          }),
        );
      }),
    ).subscribe();

    $scroller.pipe(
      takeUntil(this._$unsubscribe),
      distinctUntilChanged(),
      switchMap(scroller => {
        return fromEvent(scroller, SCROLLER_SCROLLBAR_SCROLL, { passive: true }).pipe(
          takeUntil(this._$unsubscribe),
          filter(() => {
            return !!this._trackBox.isSnappedToEnd;
          }),
          tap(() => {
            if (this._readyToShow) {
              this._$snapScrollToEndCanceller.next(true);
            }
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
        takeUntil(this._$unsubscribe),
        take(1),
      );

    $scroller.pipe(
      takeUntil(this._$unsubscribe),
      distinctUntilChanged(),
      switchMap(scroller => {
        return fromEvent(scroller, MOUSE_DOWN, { passive: true }).pipe(
          takeUntil(this._$unsubscribe),
          switchMap(e => {
            return $scrollerScroll.pipe(
              takeUntil(this._$unsubscribe),
              takeUntil($pointerMoveTakeUntil),
              filter(() => {
                return !!this._trackBox.isSnappedToEnd;
              }),
            );
          }),
          map(e => {
            const scroller = this._scrollerComponent;
            if (scroller) {
              const isVertical = this._isVertical, scrollSize = isVertical ? scroller.scrollTop : scroller.scrollLeft;
              return scrollSize;
            }
            return 0;
          }),
          tap(() => {
            if (this._readyToShow) {
              this._$snapScrollToEndCanceller.next(true);
            }
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
        takeUntil(this._$unsubscribe),
        take(1),
      );

    $scroller.pipe(
      takeUntil(this._$unsubscribe),
      distinctUntilChanged(),
      switchMap(scroller => {
        return fromEvent(scroller, TOUCH_START, { passive: true }).pipe(
          takeUntil(this._$unsubscribe),
          switchMap(e => {
            return $scrollerScroll.pipe(
              takeUntil(this._$unsubscribe),
              takeUntil($touchMoveTakeUntil),
              filter(() => {
                return !!this._trackBox.isSnappedToEnd && this._readyToShow;
              }),
            );
          }),
          map(e => {
            const scroller = this._scrollerComponent;
            if (scroller) {
              const isVertical = this._isVertical, scrollSize = isVertical ? scroller.scrollTop : scroller.scrollLeft;
              return scrollSize;
            }
            return 0;
          }),
          tap(() => {
            if (this._readyToShow) {
              this._$snapScrollToEndCanceller.next(true);
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
        this._isUserScrolling = userAction;
        const scrollerEl = this._$scroller.getValue()?.nativeElement, scrollerComponent = this._scrollerComponent;
        if (scrollerEl && scrollerComponent) {
          const event = this.emitScrollEvent(false, this._readyToShow);
          if (userAction) {
            if (this._readyToShow) {
              this._$snapScrollToEndCanceller.next(true);
            }
            if (!this._$dynamicSize.getValue()) {
              this._$fireUpdate.next(event);
            }
          }
        }
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
        this._isUserScrolling = userAction;
        const scrollerEl = this._$scroller.getValue()?.nativeElement, scrollerComponent = this._scrollerComponent;
        if (scrollerEl && scrollerComponent) {
          const event = this.emitScrollEvent(true, this._readyToShow);
          if (userAction) {
            if (this._readyToShow) {
              this._$snapScrollToEndCanceller.next(true);
            }
            if (!this._$dynamicSize.getValue()) {
              this._$fireUpdate.next(event);
            }
          }
        }
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
      tap(e => {
        const scroller = this._scrollerComponent;
        if (scroller) {
          const isVertical = this._isVertical, bounds = this._$bounds.getValue(), listBounds = this._$listBounds.getValue(),
            scrollSize = (isVertical ? scroller.scrollTop : scroller.scrollLeft),
            scrollLength = isVertical ? (listBounds?.height ?? 0) - (bounds?.height ?? 0) : (listBounds?.width ?? 0) - (bounds?.width ?? 0),
            actualScrollSize = scrollSize;

          if (this._readyToShow) {
            if (this._trackBox.isSnappedToEnd) {
              if (scrollSize < scrollLength) {
                this._trackBox.cancelScrollSnappingToEnd();
              }
            }
          }

          this._$scrollSize.next(actualScrollSize);
        }
      }),
    ).subscribe();

    $scroller.pipe(
      takeUntil(this._$unsubscribe),
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
      takeUntil(this._$unsubscribe),
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
      takeUntil(this._$unsubscribe),
      filter(([scroller]) => scroller !== undefined),
      map(([scroller, trackBy, event]) => ({ scroller: scroller, trackBy, event })),
      switchMap(({ scroller, trackBy, event }) => {
        if (!this._readyToShow) {
          return of([false]);
        }
        const scrollerComponent = this._scrollerComponent,
          {
            id, iteration = 0, blending = false,
            isLastIteration = false, scrollCalled = false, cb,
          } = event;
        if (scrollerComponent) {
          const items = this._$actualItems.getValue();
          if (items && items.length) {
            const dynamicSize = this._$dynamicSize.getValue(), itemSize = this._$actualItemSize.getValue();

            if (dynamicSize) {
              const { width, height, x, y } = this._$bounds.getValue() || { x: 0, y: 0, width: DEFAULT_LIST_SIZE, height: DEFAULT_LIST_SIZE },
                itemConfigMap = this._$itemConfigMap.getValue(), items = this._$actualItems.getValue(), isVertical = this._isVertical,
                currentScrollSize = (isVertical ? scrollerComponent.scrollTop : scrollerComponent.scrollLeft), delta = this._trackBox.delta,
                opts: IGetItemPositionOptions<IVirtualListItem, IVirtualListCollection> = {
                  bounds: { width, height, x, y }, collection: items, dynamicSize, isVertical: this._isVertical, itemSize,
                  bufferSize: this._$bufferSize.getValue(), maxBufferSize: this._$maxBufferSize.getValue(),
                  scrollSize: (isVertical ? scrollerComponent.scrollTop : scrollerComponent.scrollLeft) + delta,
                  snap: this._$snap.getValue(), fromItemId: id, enabledBufferOptimization: this._$enabledBufferOptimization.getValue(),
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
              this._$snapScrollToEndCanceller.next(true);
              const notChanged = actualScrollSize === currentScrollSize;
              if ((!notChanged && iteration < MAX_SCROLL_TO_ITERATIONS) ||
                (!this._$snapScrollToBottom.getValue() && iteration < MAX_SCROLL_TO_ITERATIONS)) {
                scrollerComponent?.scrollTo?.(params);
                this._$scrollTo.next(params as IScrollParams);
                return of([false, {
                  id, scroller: scrollerComponent, iteration: iteration + 1, blending,
                  isLastIteration: notChanged, scrollCalled: true, cb
                }]).pipe(
                  delay(0),
                );
              } else {
                this._$scrollSize.next(actualScrollSize);
                return of([true, { id, blending, scroller: scrollerComponent, scrollCalled, cb }]);
              }
            } else {
              const index = items.findIndex(item => item[trackBy] === id);
              if (index > -1) {
                const isVertical = this._isVertical,
                  currentScrollSize = (isVertical ? scrollerComponent.scrollTop : scrollerComponent.scrollLeft), scrollSize = index * this._$actualItemSize.getValue();
                if (currentScrollSize !== scrollSize) {
                  this._$snapScrollToEndCanceller.next(true);
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
      takeUntil(this._$unsubscribe),
      filter(params => !!params),
      tap(([finished, params]) => {
        if (!finished) {
          if (!!params) {
            this._$scrollTo.next(params as IScrollParams);
            return;
          }
        }

        if (this._readyToShow) {
          this._trackBox.cancelScrollSnappingToEnd(true);
        }

        const p = params as Pick<IScrollParams, 'cb' | 'scrollCalled' | 'scroller'>;
        if (p.scrollCalled && p.scroller) {
          this._scrollerComponent?.refresh();
          this.emitScrollEvent(true, false);
          p.cb?.();
          return;
        }

        if (p) {
          this._scrollerComponent?.refresh();
          this.emitScrollEvent(true, false);
          p.cb?.();
          return;
        }

        this._scrollerComponent?.refresh();
        this.emitScrollEvent(true, false);
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
      filter(v => !!v),
      tap(value => {
        if (!!value) {
          const size: ISize = { width: value.width, height: value.height };
          this.onViewportChange.emit(objectAsReadonly(size));
        }
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
          const curr = this._$selectedIds.getValue();
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
        this._service.setSelectedIds(v);
      }),
    ).subscribe();

    let isCollapsedIdsFirstEmit = 0;

    this._service.$collapsedIds.pipe(
      takeUntil(this._$unsubscribe),
      distinctUntilChanged(),
      tap(v => {
        this._$collapsedItemIds.next(v);

        if (isCollapsedIdsFirstEmit >= 2) {
          const curr = this._$collapsedIds.getValue();
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
        this._service.setCollapsedIds(v);
      }),
    ).subscribe();

    of(true).pipe(
      takeUntil(this._$unsubscribe),
      delay(1),
      tap(() => {
        this._$fireUpdate.next({
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
      }),
    ).subscribe();
  }

  private emitScrollEvent(isScrollEnd: boolean = false, update: boolean = true) {
    const scrollerEl = this._$scroller.getValue()?.nativeElement, scrollerComponent = this._scrollerComponent;
    if (scrollerEl && scrollerComponent) {
      const isVertical = this._isVertical, scrollSize = (isVertical ? scrollerComponent.scrollTop : scrollerComponent.scrollLeft),
        bounds = this._$bounds.getValue() || { x: 0, y: 0, width: DEFAULT_LIST_SIZE, height: DEFAULT_LIST_SIZE },
        currentScrollSize = this._$scrollSize.getValue();
      this._trackBox.deltaDirection = currentScrollSize > scrollSize ? -1 : currentScrollSize < scrollSize ? 1 : 0;
      const itemsRange = formatActualDisplayItems(this._service.displayItems, this._$scrollStartOffset.getValue(), this._$scrollEndOffset.getValue(),
        scrollSize, isVertical, bounds),
        event = new ScrollEvent({
          direction: this._trackBox.scrollDirection, container: scrollerEl,
          list: this._$list.getValue()!.nativeElement, delta: this._trackBox.delta,
          scrollDelta: this._trackBox.scrollDelta, isVertical,
          scrollSize,
          itemsRange,
          isEnd: this._trackBox.isSnappedToEnd,
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

  private refreshActualItemSize(value: boolean) {
    if (!this._$waitForPreparation.getValue() || !this._$dynamicSize.getValue()) {
      return;
    }
    let size: number;
    const bounds = this._$bounds.getValue(), dynamicSize = this._$dynamicSize.getValue();
    if (dynamicSize && value === false) {
      size = (this._isVertical ?
        bounds?.height || DEFAULT_LIST_SIZE :
        bounds?.width || DEFAULT_LIST_SIZE);
      this._$actualItemSize.next(size);
    } else {
      size = this._$itemSize.getValue();
      this._$actualItemSize.next(size);
    }
    this._trackBox.resetCache(this._$actualItems.getValue(), this._$trackBy.getValue(), this._isVertical, size, bounds!);
  }

  private getIsSnappingMethodAdvanced(m?: SnappingMethod) {
    const method = m || this._$snappingMethod.getValue();
    return isSnappingMethodAdvenced(method);
  }

  private getIsNotSelecting(m?: MethodForSelecting) {
    const method = m || this._$methodForSelecting.getValue();
    return isMethodForSelecting(method, MethodsForSelecting.NONE);
  }

  private getIsSingleSelecting(m?: MethodForSelecting) {
    const method = m || this._$methodForSelecting.getValue();
    return isMethodForSelecting(method, MethodsForSelecting.SELECT);
  }

  private getIsMultiSelecting(m?: MethodForSelecting) {
    const method = m || this._$methodForSelecting.getValue();
    return isMethodForSelecting(method, MethodsForSelecting.MULTI_SELECT);
  }

  private getIsVertical(d?: Direction) {
    const dir = d || this._$direction.getValue();
    return isDirection(dir, Directions.VERTICAL);
  }

  private getIsLazy(m?: CollectionMode) {
    const mode = m || this._$collectionMode.getValue();
    return isCollectionMode(mode, CollectionModes.LAZY);
  }

  private createDisplayComponentsIfNeed(displayItems: IRenderVirtualListCollection | null) {
    if (!displayItems || !this._listContainerRef) {
      this._trackBox.setDisplayObjectIndexMapById({});
      return;
    }

    if (this._isSnappingMethodAdvanced && this._$snap.getValue()) {
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
        item.instance.renderer = itemRenderer || this._$itemRenderer.getValue();
        doMap[id] = i;
      }
    }

    if (this._isSnappingMethodAdvanced && this._$snap.getValue() && this._snapedDisplayComponent && this._snapContainerRef) {
      const comp = this._snapedDisplayComponent;
      comp.instance.renderer = itemRenderer || this._$itemRenderer.getValue();
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
    const l = this._$list.getValue(), prop = isVertical ? HEIGHT_PROP_NAME : WIDTH_PROP_NAME,
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
    const el = this._$list.getValue()?.nativeElement.querySelector<HTMLDivElement>(`[${ITEM_ID}="${id}"]`);
    if (el) {
      const focusedEl = el.querySelector<HTMLDivElement>(`.${ITEM_CONTAINER}`);
      if (focusedEl) {
        this._service.focus(focusedEl, align, this._$scrollBehavior.getValue());
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
    validateScrollBehavior(behavior as ScrollBehavior);
    validateIteration(iteration);
    const actualIteration = validateScrollIteration(iteration);
    this._$scrollTo.next({ id, behavior, blending, iteration: actualIteration, isLastIteration: actualIteration === MAX_SCROLL_TO_ITERATIONS, cb });
    this._elementRef.nativeElement.focus();
  }

  /**
   * Scrolls the scroll area to the first item in the collection.
   */
  scrollToStart(cb?: () => void, options?: IScrollOptions) {
    const scroller = this._scrollerComponent;
    if (scroller) {
      scroller.stopScrolling();
    }
    const behavior = options?.behavior ?? BEHAVIOR_INSTANT,
      blending = options?.blending ?? false,
      iteration = options?.iteration ?? 0;
    validateScrollBehavior(behavior as ScrollBehavior);
    validateIteration(iteration);
    const trackBy = this._$trackBy.getValue(), items = this._$items.getValue(), firsItem = items && items.length > 0 ? items[0] : undefined, id = firsItem?.[trackBy],
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
    const scroller = this._scrollerComponent;
    if (scroller) {
      scroller.stopScrolling();
    }
    const behavior = options?.behavior ?? BEHAVIOR_INSTANT as ScrollBehavior,
      blending = options?.blending ?? false,
      iteration = options?.iteration ?? 0;
    validateScrollBehavior(behavior as ScrollBehavior);
    validateIteration(iteration);
    const trackBy = this._$trackBy.getValue(), items = this._$items.getValue(), latItem = items?.[items.length > 0 ? items.length - 1 : 0], id = latItem?.[trackBy],
      actualIteration = validateScrollIteration(iteration);
    this._$scrollTo.next({ id, behavior, blending, iteration: actualIteration, isLastIteration: actualIteration === MAX_SCROLL_TO_ITERATIONS, cb });
    this._elementRef.nativeElement.focus();
  }

  /**
   * Scrolls the list to the end of the content height.
   */
  scrollToEnd() {
    this._$isScrollFinished.next(true);
    this._trackBox.isScrollEnd = true;
    const scroller = this._scrollerComponent;
    if (scroller) {
      scroller.stopScrolling();
      const isVertical = this._isVertical, scrollSize = isVertical ? scroller.actualScrollHeight : scroller.actualScrollWidth;
      this._$scrollSize.next(scrollSize);
      this._trackBox.changes();
      this._elementRef.nativeElement.focus();
    }
  }

  /**
   * Force clearing the cache.
   */
  protected cacheClean() {
    if (this._$dynamicSize.getValue()) {
      this._trackBox.cacheClean();
    }
    this._$collapsedItemIds.next([]);
    this._$isScrollStart.next(true);
    this._$isScrollFinished.next(false);
    this._$totalSize.next(0);
    this._$scrollSize.next(0);
    const scrollerComponent = this._scrollerComponent;
    if (scrollerComponent) {
      scrollerComponent.reset();
    }
    if (this._scrollerComponent?.scrollable) {
      this._$isResetedReachStart.next(true);
    }
  }

  /**
   * Stops the list from snapping to the bottom edge.
   */
  stopSnappingScrollToEnd() {
    const scroller = this._scrollerComponent;
    this._$isScrollFinished.next(false);
    this._trackBox.cancelScrollSnappingToEnd(true);
    if (scroller) {
      scroller.stopScrolling();
    }
  }

  override ngOnDestroy(): void {
    this.ngOnDestroy();

    this.dispose();
  }

  private dispose() {
    const updateId = this._updateId;
    if (updateId !== undefined) {
      cancelAnimationFrame(updateId);
      this._updateId = undefined;
    }

    if (this._service) {
      this._service.dispose();
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
