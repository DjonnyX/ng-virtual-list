import {
  AfterViewInit, ChangeDetectionStrategy, Component, ComponentRef, ElementRef, inject, input,
  OnDestroy, OnInit, output, signal, TemplateRef, ViewChild, viewChild, ViewContainerRef, ViewEncapsulation,
  WritableSignal,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { takeUntilDestroyed, toObservable } from '@angular/core/rxjs-interop';
import { combineLatest, debounceTime, distinctUntilChanged, filter, map, Observable, of, switchMap, tap } from 'rxjs';
import { NgVirtualListItemComponent } from './components/ng-virtual-list-item.component';
import {
  BEHAVIOR_AUTO, BEHAVIOR_INSTANT, CLASS_LIST_HORIZONTAL, CLASS_LIST_VERTICAL, DEFAULT_DIRECTION, DEFAULT_DYNAMIC_SIZE,
  DEFAULT_ENABLED_BUFFER_OPTIMIZATION, DEFAULT_ITEM_SIZE, DEFAULT_BUFFER_SIZE, DEFAULT_LIST_SIZE, DEFAULT_SNAP, DEFAULT_SNAPPING_METHOD,
  HEIGHT_PROP_NAME, LEFT_PROP_NAME, MAX_SCROLL_TO_ITERATIONS, PX, SCROLL, SCROLL_END, TOP_PROP_NAME, TRACK_BY_PROPERTY_NAME, WIDTH_PROP_NAME,
  DEFAULT_MAX_BUFFER_SIZE, DEFAULT_SELECT_METHOD, DEFAULT_SELECT_BY_CLICK, DEFAULT_COLLAPSE_BY_CLICK, DEFAULT_COLLECTION_MODE,
  DEFAULT_SCREEN_READER_MESSAGE,
} from './const';
import { IRenderVirtualListItem, IScrollEvent, IVirtualListCollection, IVirtualListItem, IVirtualListItemConfigMap } from './models';
import { FocusAlignment, Id, ISize } from './types';
import { IRenderVirtualListCollection } from './models/render-collection.model';
import { CollectionMode, CollectionModes, Direction, Directions, FocusAlignments, MethodForSelecting, MethodsForSelecting, SnappingMethod } from './enums';
import { ScrollEvent, toggleClassName } from './utils';
import { IGetItemPositionOptions, IUpdateCollectionOptions, TrackBoxEvents, TrackBox } from './utils/trackBox';
import { isSnappingMethodAdvenced } from './utils/snapping-method';
import { FIREFOX_SCROLLBAR_OVERLAP_SIZE, IS_FIREFOX } from './utils/browser';
import { BaseVirtualListItemComponent } from './models/base-virtual-list-item-component';
import { Component$1 } from './models/component.model';
import { isDirection } from './utils/isDirection';
import { NgVirtualListService } from './ng-virtual-list.service';
import { isMethodForSelecting } from './utils/isMethodForSelecting';
import { MethodsForSelectingTypes } from './enums/method-for-selecting-types';
import { CMap } from './utils/cacheMap';
import { validateArray, validateBoolean, validateFloat, validateInt, validateObject, validateString } from './utils/validation';
import { copyValueAsReadonly, objectAsReadonly } from './utils/object';
import { isCollectionMode } from './utils/isCollectionMode';

const ROLE_LIST = 'list',
  ROLE_LIST_BOX = 'listbox',
  ITEM_ID = 'item-id',
  ITEM_CONTAINER = 'ngvl-item__container';

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

/**
 * Virtual list component.
 * Maximum performance for extremely large lists.
 * It is based on algorithms for virtualization of screen objects.
 * @link https://github.com/DjonnyX/ng-virtual-list/blob/20.x/projects/ng-virtual-list/src/lib/ng-virtual-list.component.ts
 * @author Evgenii Grebennikov
 * @email djonnyx@gmail.com
 */
@Component({
  selector: 'ng-virtual-list',
  imports: [CommonModule],
  templateUrl: './ng-virtual-list.component.html',
  styleUrl: './ng-virtual-list.component.scss',
  host: {
    'style': 'position: relative;'
  },
  changeDetection: ChangeDetectionStrategy.OnPush,
  encapsulation: ViewEncapsulation.ShadowDom,
  providers: [NgVirtualListService],
})
export class NgVirtualListComponent implements AfterViewInit, OnInit, OnDestroy {
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

  private _snappedContainer = viewChild<ElementRef<HTMLDivElement>>('snapped');

  private _container = viewChild<ElementRef<HTMLDivElement>>('container');

  private _list = viewChild<ElementRef<HTMLDivElement>>('list');

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

  private _itemsOptions = {
    transform: (v: IVirtualListCollection | undefined) => {
      let valid = validateArray(v, true);
      if (valid) {
        if (v) {
          for (let i = 0, l = v.length; i < l; i++) {
            const item = v[i];
            valid = validateObject(item, true);
            if (valid) {
              if (item && !(validateFloat(item.id as number, true) || validateString(item.id as string, true))) {
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
   * If the `sticky` value is greater than `0`, then the `sticky` position mode is enabled for the element. `1` - position start, `2` - position end. Default value is `0`.
   * `selectable` determines whether an element can be selected or not. Default value is `true`.
   * `collapsable` determines whether an element with a `sticky` property greater than zero can collapse and collapse elements in front that do not have a `sticky` property.
   * @link https://github.com/DjonnyX/ng-virtual-list/blob/20.x/projects/ng-virtual-list/src/lib/models/item-config-map.model.ts
   * @author Evgenii Grebennikov
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
      const valid = validateString(v) && (v === 'normal' || v === 'advanced');
      if (!valid) {
        console.error('The "snappingMethod" parameter must have the value `normal` or `advanced`.');
        return DEFAULT_SNAPPING_METHOD;
      }
      return v;
    },
  } as any;

  /**
   * Snapping method.
   * 'default' - Normal group rendering.
   * 'advanced' - The group is rendered on a transparent background. List items below the group are not rendered.
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

  private _isNotSelecting = this.getIsNotSelecting();
  get isNotSelecting() { return this._isNotSelecting; }

  private _isSingleSelecting = this.getIsSingleSelecting();
  get isSingleSelecting() { return this._isSingleSelecting; }

  private _isMultiSelecting = this.getIsMultiSelecting();
  get isMultiSelecting() { return this._isMultiSelecting; }

  private _isSnappingMethodAdvanced: boolean = this.getIsSnappingMethodAdvanced();
  get isSnappingMethodAdvanced() { return this._isSnappingMethodAdvanced; }

  private _isLazy = this.getIsLazy();

  private _isVertical = this.getIsVertical();

  get orientation() {
    return this._isVertical ? Directions.VERTICAL : Directions.HORIZONTAL;
  }

  readonly focusedElement = signal<Id | undefined>(undefined);

  private _actualItems = signal<IVirtualListCollection>([]);

  private _collapsedItemIds = signal<Array<Id>>([]);

  private _displayComponents: Array<ComponentRef<BaseVirtualListItemComponent>> = [];

  private _snapedDisplayComponent: ComponentRef<BaseVirtualListItemComponent> | undefined;

  private _bounds = signal<ISize | null>(null);

  private _scrollSize = signal<number>(0);

  private _isScrollStart = signal<boolean>(true);

  private _isScrollFinished = signal<boolean>(false);

  private _resizeObserver: ResizeObserver | null = null;

  private _resizeSnappedComponentHandler = () => {
    const list = this._list(), container = this._container(), bounds = this._bounds(), snappedComponent = this._snapedDisplayComponent?.instance;
    if (list && container && snappedComponent) {
      const isVertical = this._isVertical, listBounds = list.nativeElement.getBoundingClientRect(), listElement = list?.nativeElement,
        { width: lWidth, height: lHeight } = listElement?.getBoundingClientRect() ?? { width: 0, height: 0 },
        { width, height } = bounds ?? { width: 0, height: 0 },
        isScrollable = isVertical ? container.nativeElement.scrollHeight > 0 : container.nativeElement.scrollWidth > 0;

      let scrollBarSize = isVertical ? width - lWidth : height - lHeight, isScrollBarOverlap = true, overlapScrollBarSize = 0;
      if (scrollBarSize === 0 && isScrollable) {
        isScrollBarOverlap = true;
      }

      if (isScrollBarOverlap && IS_FIREFOX) {
        scrollBarSize = overlapScrollBarSize = FIREFOX_SCROLLBAR_OVERLAP_SIZE;
      }

      snappedComponent.element.style.clipPath = `path("M 0 0 L 0 ${snappedComponent.element.offsetHeight} L ${snappedComponent.element.offsetWidth - overlapScrollBarSize} ${snappedComponent.element.offsetHeight} L ${snappedComponent.element.offsetWidth - overlapScrollBarSize} 0 Z")`;

      snappedComponent.regularLength = `${isVertical ? listBounds.width : listBounds.height}${PX}`;
      const { width: sWidth, height: sHeight } = snappedComponent.getBounds() ?? { width: 0, height: 0 },
        containerElement = container.nativeElement, delta = snappedComponent.item?.measures.delta ?? 0;

      let left: number, right: number, top: number, bottom: number;
      if (isVertical) {
        left = 0;
        right = width - scrollBarSize;
        top = sHeight;
        bottom = height;
        containerElement.style.clipPath = `path("M 0 ${top + delta} L 0 ${height} L ${width} ${height} L ${width} 0 L ${right} 0 L ${right} ${top + delta} Z")`;
      } else {
        left = sWidth;
        right = width;
        top = 0;
        bottom = height - scrollBarSize;
        containerElement.style.clipPath = `path("M ${left + delta} 0 L ${left + delta} ${bottom} L 0 ${bottom} L 0 ${height} L ${width} ${height} L ${width} 0 Z")`;
      }
    }
  };

  private _resizeSnappedObserver: ResizeObserver | null = null;

  private _componentsResizeObserver = new ResizeObserver(() => {
    this._trackBox.changes();
  });

  private _onResizeHandler = () => {
    const bounds = this._container()?.nativeElement?.getBoundingClientRect();
    if (bounds) {
      this._bounds.set({ width: bounds.width, height: bounds.height });
    } else {
      this._bounds.set({ width: DEFAULT_LIST_SIZE, height: DEFAULT_LIST_SIZE });
    }

    if (this._isSnappingMethodAdvanced) {
      this.updateRegularRenderer();
    }
  }

  private _onScrollHandler = (e?: Event) => {
    this.clearScrollToRepeatExecutionTimeout();

    const container = this._container()?.nativeElement;
    if (container) {
      const scrollSize = (this._isVertical ? container.scrollTop : container.scrollLeft),
        actualScrollSize = scrollSize;
      this._scrollSize.set(actualScrollSize);
    }
  }

  private itemToFocus = (element: HTMLElement, position: number, align: FocusAlignment = FocusAlignments.CENTER) => {
    const container = this._container()?.nativeElement;
    if (container) {
      const { width, height } = this._bounds()!, { width: elementWidth, height: elementHeight } = element.getBoundingClientRect(),
        isVertical = this._isVertical;
      let pos: number = Number.NaN;
      switch (align) {
        case FocusAlignments.START: {
          pos = isVertical ? position : position;
          break;
        }
        case FocusAlignments.CENTER: {
          pos = isVertical ? position - (height - elementHeight) * .5 : position - (width - elementWidth) * .5;
          break;
        }
        case FocusAlignments.END: {
          pos = isVertical ? position - (height - elementHeight) : position - (width - elementWidth);
          break;
        }
        case FocusAlignments.NONE:
        default: {
          break;
        }
      }
      if (!Number.isNaN(pos)) {
        const params: ScrollToOptions = { [this._isVertical ? TOP_PROP_NAME : LEFT_PROP_NAME]: pos, behavior: 'instant' };
        container.scrollTo(params);
      }
    }
  }

  private _elementRef = inject(ElementRef<HTMLDivElement>);

  private _initialized!: WritableSignal<boolean>;

  readonly $initialized!: Observable<boolean>;

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

  private _isResetedReachStart = true;

  private _onTrackBoxResetHandler = (v: boolean) => {
    if (v) {
      this._isResetedReachStart = true;

      const container = this._container()?.nativeElement;
      if (container) {
        const params: ScrollToOptions = {
          [this._isVertical ? TOP_PROP_NAME : LEFT_PROP_NAME]: 0,
          behavior: BEHAVIOR_INSTANT,
        };

        container.scrollTo(params);
      }
    }
  };

  constructor() {
    NgVirtualListComponent.__nextId = NgVirtualListComponent.__nextId + 1 === Number.MAX_SAFE_INTEGER
      ? 0 : NgVirtualListComponent.__nextId + 1;
    this._id = NgVirtualListComponent.__nextId;

    this._trackBox.addEventListener(TrackBoxEvents.RESET, this._onTrackBoxResetHandler);

    this._service.initialize(this._trackBox);
    this._service.itemToFocus = this.itemToFocus;

    this._initialized = signal<boolean>(false);
    this.$initialized = toObservable(this._initialized);

    this._trackBox.displayComponents = this._displayComponents;

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

    const $trackBy = toObservable(this.trackBy),
      $selectByClick = toObservable(this.selectByClick),
      $collapseByClick = toObservable(this.collapseByClick),
      $isScrollStart = toObservable(this._isScrollStart),
      $isScrollFinished = toObservable(this._isScrollFinished);

    $isScrollStart.pipe(
      takeUntilDestroyed(),
      distinctUntilChanged(),
      tap(v => {
        if (v && !this._isResetedReachStart) {
          this.onScrollReachStart.emit();
        }
        this._isResetedReachStart = false;
      }),
    ).subscribe()

    $isScrollFinished.pipe(
      takeUntilDestroyed(),
      distinctUntilChanged(),
      tap(v => {
        if (v) {
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
    ), $items = toObservable(this.items).pipe(
      map(i => !i ? [] : i),
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
      $isVertical = toObservable(this.direction).pipe(
        map(v => this.getIsVertical(v || DEFAULT_DIRECTION)),
      ),
      $isLazy = toObservable(this.collectionMode).pipe(
        map(v => this.getIsLazy(v || DEFAULT_COLLECTION_MODE)),
      ),
      $dynamicSize = toObservable(this.dynamicSize),
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

    combineLatest([$items, $collapsedItemIds, $itemConfigMap]).pipe(
      takeUntilDestroyed(),
      tap(([items, collapsedIds, itemConfigMap]) => {
        const hiddenItems = new CMap<Id, boolean>();

        let isCollapsed = false;
        for (let i = 0, l = items.length; i < l; i++) {
          const item = items[i], id = item.id, group = (itemConfigMap[id]?.sticky ?? 0) > 0, collapsed = collapsedIds.includes(id);
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
          const item = items[i], id = item.id;
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

    combineLatest([this.$initialized, $bounds, $actualItems, $itemConfigMap, $scrollSize, $itemSize,
      $bufferSize, $maxBufferSize, $snap, $isVertical, $dynamicSize, $enabledBufferOptimization, $cacheVersion,
    ]).pipe(
      takeUntilDestroyed(),
      distinctUntilChanged(),
      filter(([initialized]) => !!initialized),
      switchMap(([,
        bounds, items, itemConfigMap, scrollSize, itemSize,
        bufferSize, maxBufferSize, snap, isVertical, dynamicSize, enabledBufferOptimization, cacheVersion,
      ]) => {
        let actualScrollSize = (this._isVertical ? this._container()?.nativeElement.scrollTop ?? 0 : this._container()?.nativeElement.scrollLeft) ?? 0;
        const { width, height } = bounds,
          opts: IUpdateCollectionOptions<IVirtualListItem, IVirtualListCollection> = {
            bounds: { width, height }, dynamicSize, isVertical, itemSize,
            bufferSize, maxBufferSize, scrollSize: actualScrollSize, snap, enabledBufferOptimization,
          },
          { displayItems, totalSize } = this._trackBox.updateCollection(items, itemConfigMap, opts);

        this._service.collection = displayItems;

        this.resetBoundsSize(isVertical, totalSize);

        this.createDisplayComponentsIfNeed(displayItems);

        this.tracking();

        const scrollLength = (this._isVertical ? this._container()?.nativeElement.scrollHeight ?? 0 : this._container()?.nativeElement.scrollWidth) ?? 0,
          actualScrollLength = scrollLength === 0 ? 0 : Math.round(scrollLength - (this._isVertical ? height : width)),
          scrollPosition = actualScrollSize + this._trackBox.delta;

        if (actualScrollLength > 0) {
          this._isScrollStart.set(scrollPosition === 0);
          this._isScrollFinished.set(scrollPosition === actualScrollLength);
        }

        if (this._isSnappingMethodAdvanced) {
          this.updateRegularRenderer();
        }

        const container = this._container();

        if (container) {
          const delta = this._trackBox.delta;
          actualScrollSize = actualScrollSize + delta;

          this._trackBox.clearDelta();

          if (scrollSize !== actualScrollSize) {
            const params: ScrollToOptions = {
              [this._isVertical ? TOP_PROP_NAME : LEFT_PROP_NAME]: actualScrollSize,
              behavior: BEHAVIOR_INSTANT
            };

            container.nativeElement.scrollTo(params);
          }
        }

        return of(displayItems);
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
        this.onViewportChange.emit(objectAsReadonly(value));
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
          if ((this.isSingleSelecting && JSON.stringify(v) !== JSON.stringify(curr)) || (isSelectedIdsFirstEmit === 2 && JSON.stringify(v) !== JSON.stringify(curr)) || isSelectedIdsFirstEmit > 2) {
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
  }

  ngOnInit() {
    this.onInit();
  }

  private onInit() {
    this._initialized.set(true);
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

    while (components.length < maxLength) {
      if (_listContainerRef) {
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
    const l = this._list();
    if (l) {
      l.nativeElement.style[isVertical ? HEIGHT_PROP_NAME : WIDTH_PROP_NAME] = `${totalSize}${PX}`;
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
    validateId(id);
    validateFocusAlignment(align);
    const el = this._list()?.nativeElement.querySelector<HTMLDivElement>(`[${ITEM_ID}="${id}"]`);
    if (el) {
      const focusedEl = el.querySelector<HTMLDivElement>(`.${ITEM_CONTAINER}`);
      if (focusedEl) {
        this._service.focus(focusedEl, align);
      }
    }
  }

  /**
   * The method scrolls the list to the element with the given id and returns the value of the scrolled area.
   * Behavior accepts the values ​​"auto", "instant" and "smooth".
   */
  scrollTo(id: Id, behavior: ScrollBehavior = BEHAVIOR_AUTO, iteration: number = 0) {
    validateId(id);
    validateScrollBehavior(behavior);
    validateIteration(iteration);
    this.scrollToExecutor(id, behavior, validateScrollIteration(iteration));
  }

  private _scrollToRepeatExecutionTimeout: number | undefined;

  private clearScrollToRepeatExecutionTimeout() {
    clearTimeout(this._scrollToRepeatExecutionTimeout);
  }

  private scrollToExecutor(id: Id, behavior: ScrollBehavior, iteration: number = 0, isLastIteration = false) {
    const items = this._actualItems();
    if (!items || !items.length) {
      return;
    }

    const dynamicSize = this.dynamicSize(), container = this._container(), itemSize = this.itemSize();
    if (container) {
      this.clearScrollToRepeatExecutionTimeout();

      if (dynamicSize) {
        if (container) {
          container.nativeElement.removeEventListener(SCROLL, this._onScrollHandler);
        }

        const { width, height } = this._bounds() || { width: DEFAULT_LIST_SIZE, height: DEFAULT_LIST_SIZE },
          itemConfigMap = this.itemConfigMap(), items = this._actualItems(), isVertical = this._isVertical, delta = this._trackBox.delta,
          opts: IGetItemPositionOptions<IVirtualListItem, IVirtualListCollection> = {
            bounds: { width, height }, collection: items, dynamicSize, isVertical: this._isVertical, itemSize,
            bufferSize: this.bufferSize(), maxBufferSize: this.maxBufferSize(),
            scrollSize: (isVertical ? container.nativeElement.scrollTop : container.nativeElement.scrollLeft) + delta,
            snap: this.snap(), fromItemId: id, enabledBufferOptimization: this.enabledBufferOptimization(),
          },
          scrollSize = this._trackBox.getItemPosition(id, itemConfigMap, opts),
          params: ScrollToOptions = { [isVertical ? TOP_PROP_NAME : LEFT_PROP_NAME]: scrollSize, behavior };

        if (scrollSize === -1) {
          container.nativeElement.addEventListener(SCROLL, this._onScrollHandler);
          return;
        }

        this._trackBox.clearDelta();

        if (container) {
          const { displayItems, totalSize } = this._trackBox.updateCollection(items, itemConfigMap, {
            ...opts, scrollSize, fromItemId: isLastIteration ? undefined : id,
          }), delta = this._trackBox.delta;

          this._service.collection = displayItems;

          this._trackBox.clearDelta();

          let actualScrollSize = scrollSize + delta;

          this.resetBoundsSize(isVertical, totalSize);

          this.createDisplayComponentsIfNeed(displayItems);

          this.tracking();

          const _scrollSize = this._trackBox.getItemPosition(id, itemConfigMap, { ...opts, scrollSize: actualScrollSize, fromItemId: id });

          if (_scrollSize === -1) {
            container.nativeElement.addEventListener(SCROLL, this._onScrollHandler);
            return;
          }

          const notChanged = actualScrollSize === _scrollSize;

          if (!notChanged || iteration < MAX_SCROLL_TO_ITERATIONS) {
            this.clearScrollToRepeatExecutionTimeout();
            this._scrollToRepeatExecutionTimeout = setTimeout(() => {
              this.scrollToExecutor(id, BEHAVIOR_INSTANT, iteration + 1, notChanged);
            }) as unknown as number;
          } else {
            this._scrollSize.set(actualScrollSize);

            container.nativeElement.addEventListener(SCROLL, this._onScrollHandler);
          }
        }

        container.nativeElement.scrollTo(params);

        this._scrollSize.set(scrollSize);
      } else {
        const index = items.findIndex(item => item.id === id);
        if (index > -1) {
          const scrollSize = index * this.itemSize();
          const params: ScrollToOptions = { [this._isVertical ? TOP_PROP_NAME : LEFT_PROP_NAME]: scrollSize, behavior };
          container.nativeElement.scrollTo(params);
        }
      }
    }
  }

  /**
   * Scrolls the scroll area to the desired element with the specified ID.
   */
  scrollToEnd(behavior: ScrollBehavior = BEHAVIOR_INSTANT, iteration: number = 0) {
    validateScrollBehavior(behavior);
    validateIteration(iteration);
    const items = this.items(), latItem = items[items.length > 0 ? items.length - 1 : 0];
    this.scrollTo(latItem.id, behavior, validateScrollIteration(iteration));
  }

  private _onContainerScrollHandler = (e: Event) => {
    const containerEl = this._container();
    if (containerEl) {
      const scrollSize = (this._isVertical ? containerEl.nativeElement.scrollTop : containerEl.nativeElement.scrollLeft),
        currentScollSize = this._scrollSize();
      this._trackBox.deltaDirection = currentScollSize > scrollSize ? -1 : currentScollSize < scrollSize ? 1 : 0;

      const event = new ScrollEvent({
        direction: this._trackBox.scrollDirection, container: containerEl.nativeElement,
        list: this._list()!.nativeElement, delta: this._trackBox.delta,
        scrollDelta: this._trackBox.scrollDelta, isVertical: this._isVertical,
      });

      this.onScroll.emit(event);
    }
  }

  private _onContainerScrollEndHandler = (e: Event) => {
    const containerEl = this._container();
    if (containerEl) {
      const scrollSize = (this._isVertical ? containerEl.nativeElement.scrollTop : containerEl.nativeElement.scrollLeft),
        currentScollSize = this._scrollSize();
      this._trackBox.deltaDirection = currentScollSize > scrollSize ? -1 : 0;

      const event = new ScrollEvent({
        direction: this._trackBox.scrollDirection, container: containerEl.nativeElement,
        list: this._list()!.nativeElement, delta: this._trackBox.delta,
        scrollDelta: this._trackBox.scrollDelta, isVertical: this._isVertical,
      });

      this.onScrollEnd.emit(event);
    }
  }

  ngAfterViewInit(): void {
    this.afterViewInit();
  }

  private afterViewInit() {
    const containerEl = this._container();
    if (containerEl) {
      // for direction calculation
      containerEl.nativeElement.addEventListener(SCROLL, this._onContainerScrollHandler);
      containerEl.nativeElement.addEventListener(SCROLL_END, this._onContainerScrollEndHandler);

      containerEl.nativeElement.addEventListener(SCROLL, this._onScrollHandler);

      this._resizeObserver = new ResizeObserver(this._onResizeHandler);
      this._resizeObserver.observe(containerEl.nativeElement);

      this._onResizeHandler();
    }
  }

  ngOnDestroy(): void {
    this.dispose();
  }

  private dispose() {
    this.clearScrollToRepeatExecutionTimeout();

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

    const containerEl = this._container();
    if (containerEl) {
      containerEl.nativeElement.removeEventListener(SCROLL, this._onScrollHandler);
      containerEl.nativeElement.removeEventListener(SCROLL, this._onContainerScrollHandler);
      containerEl.nativeElement.removeEventListener(SCROLL_END, this._onContainerScrollEndHandler);
    }

    if (this._snapedDisplayComponent) {
      this._snapedDisplayComponent.destroy();
    }

    if (this._displayComponents) {
      while (this._displayComponents.length > 0) {
        const comp = this._displayComponents.pop();
        comp?.destroy();
      }
    }
  }
}
