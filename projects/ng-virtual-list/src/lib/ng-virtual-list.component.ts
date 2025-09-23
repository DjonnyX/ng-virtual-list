import {
  AfterViewInit, ChangeDetectionStrategy, ChangeDetectorRef, Component, ComponentRef, ElementRef, EventEmitter, Input,
  OnDestroy, OnInit, Output, TemplateRef, ViewChild, ViewContainerRef, ViewEncapsulation,
} from '@angular/core';
import { BehaviorSubject, combineLatest, debounceTime, distinctUntilChanged, filter, map, of, skip, switchMap, takeUntil, tap } from 'rxjs';
import {
  BEHAVIOR_AUTO, BEHAVIOR_INSTANT, CLASS_LIST_HORIZONTAL, CLASS_LIST_VERTICAL, DEFAULT_BUFFER_SIZE, DEFAULT_COLLAPSE_BY_CLICK, DEFAULT_DIRECTION,
  DEFAULT_DYNAMIC_SIZE, DEFAULT_ENABLED_BUFFER_OPTIMIZATION, DEFAULT_ITEM_SIZE, DEFAULT_LIST_SIZE, DEFAULT_MAX_BUFFER_SIZE, DEFAULT_SELECT_BY_CLICK,
  DEFAULT_SELECT_METHOD, DEFAULT_SNAP, DEFAULT_SNAPPING_METHOD, HEIGHT_PROP_NAME, LEFT_PROP_NAME, MAX_SCROLL_TO_ITERATIONS, PX, SCROLL, SCROLL_END,
  TOP_PROP_NAME, TRACK_BY_PROPERTY_NAME, WIDTH_PROP_NAME,
} from './const';
import { IRenderVirtualListItem, IScrollEvent, IVirtualListCollection, IVirtualListItem, IVirtualListItemConfigMap } from './models';
import { Id, ISize } from './types';
import { IRenderVirtualListCollection } from './models/render-collection.model';
import { Direction, Directions, MethodForSelecting, MethodsForSelecting, SnappingMethod } from './enums';
import { ScrollEvent, toggleClassName } from './utils';
import { IGetItemPositionOptions, IUpdateCollectionOptions, TRACK_BOX_CHANGE_EVENT_NAME, TrackBox } from './utils/trackBox';
import { DisposableComponent } from './utils/disposableComponent';
import { isSnappingMethodAdvenced } from './utils/snapping-method';
import { FIREFOX_SCROLLBAR_OVERLAP_SIZE, IS_FIREFOX } from './utils/browser';
import { NgVirtualListItemComponent } from './components/ng-virtual-list-item.component';
import { BaseVirtualListItemComponent } from './models/base-virtual-list-item-component';
import { Component$1 } from './models/component.model';
import { isDirection } from './utils/isDirection';
import { NgVirtualListService } from './ng-virtual-list.service';
import { isMethodForSelecting } from './utils/isMethodForSelecting';
import { MethodsForSelectingTypes } from './enums/method-for-selecting-types';
import { CMap } from './utils/cacheMap';
import { validateArray, validateBoolean, validateFloat, validateInt, validateObject, validateString } from './utils/validation';
import { copyValueAsReadonly, objectAsReadonly } from './utils/object';

const ROLE_LIST = 'list',
  ROLE_LIST_BOX = 'listbox';

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
    const valid = validateString(behavior as string) &&
      (behavior === 'auto' as ScrollBehavior || behavior === 'instant' as ScrollBehavior || behavior === 'smooth' as ScrollBehavior);
    if (!valid) {
      throw Error('The "behavior" parameter must have the value `auto`, `instant` or `smooth`.');
    }
  },
  validateIteration = (iteration: number | undefined) => {
    const valid = validateInt(iteration, true);
    if (!valid) {
      throw Error('The "iteration" parameter must be of type `number`.');
    }
  };

/**
 * Virtual list component.
 * Maximum performance for extremely large lists.
 * It is based on algorithms for virtualization of screen objects.
 * @link https://github.com/DjonnyX/ng-virtual-list/blob/15.x/projects/ng-virtual-list/src/lib/ng-virtual-list.component.ts
 * @author Evgenii Grebennikov
 * @email djonnyx@gmail.com
 */
@Component({
  selector: 'ng-virtual-list',
  templateUrl: './ng-virtual-list.component.html',
  styleUrls: ['./ng-virtual-list.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
  encapsulation: ViewEncapsulation.ShadowDom,
  providers: [NgVirtualListService],
  host: {
    'style': 'position: relative;'
  },
})
export class NgVirtualListComponent extends DisposableComponent implements AfterViewInit, OnInit, OnDestroy {
  private static __nextId: number = 0;

  private _id: number = NgVirtualListComponent.__nextId;
  /**
   * Readonly. Returns the unique identifier of the component.
   */
  get id() { return this._id; }

  @ViewChild('renderersContainer', { read: ViewContainerRef })
  private _listContainerRef: ViewContainerRef | undefined;

  @ViewChild('container', { read: ElementRef<HTMLDivElement> })
  private _container: ElementRef<HTMLDivElement> | undefined;

  @ViewChild('list', { read: ElementRef<HTMLDivElement> })
  private _list: ElementRef<HTMLDivElement> | undefined;

  @ViewChild('snapRendererContainer', { read: ViewContainerRef })
  private _snapContainerRef: ViewContainerRef | undefined;

  @ViewChild('snapped', { read: ViewContainerRef })
  private _snappedContainer: ViewContainerRef | undefined;

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

  private _$items = new BehaviorSubject<IVirtualListCollection | undefined>(undefined);
  readonly $items = this._$items.asObservable();

  private _itemsTransform = (v: IVirtualListCollection | undefined) => {
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
  readonly $selectedIds = this._$selectedIds.asObservable();

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
  readonly $collapsedIds = this._$collapsedIds.asObservable();

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
  readonly $selectByClick = this._$selectByClick.asObservable();

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
  readonly $collapseByClick = this._$collapseByClick.asObservable();

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
  readonly $snap = this._$snap.asObservable();

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

  private _$enabledBufferOptimization = new BehaviorSubject<boolean>(DEFAULT_ENABLED_BUFFER_OPTIMIZATION);
  readonly $enabledBufferOptimization = this._$enabledBufferOptimization.asObservable();

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
  readonly $itemRenderer = this._$itemRenderer.asObservable();

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
  readonly $itemConfigMap = this._$itemConfigMap.asObservable();

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
   * @link https://github.com/DjonnyX/ng-virtual-list/blob/15.x/projects/ng-virtual-list/src/lib/models/item-config-map.model.ts
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
  readonly $itemSize = this._$itemSize.asObservable();

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
   * Ignored if the dynamicSize property is true.
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

  private _$dynamicSize = new BehaviorSubject<boolean>(DEFAULT_DYNAMIC_SIZE);
  readonly $dynamicSize = this._$dynamicSize.asObservable();

  private _dynamicSizeTransform = (v: boolean) => {
    const valid = validateBoolean(v);
    if (!valid) {
      console.error('The "dynamicSize" parameter must be of type `boolean`.');
      return DEFAULT_DYNAMIC_SIZE;
    }
    return v;
  };

  /**
   * If true then the items in the list can have different sizes and the itemSize property is ignored.
   * If false then the items in the list have a fixed size specified by the itemSize property. The default value is false.
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
  readonly $direction = this._$direction.asObservable();

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

  private _$bufferSize = new BehaviorSubject<number>(DEFAULT_BUFFER_SIZE);
  readonly $bufferSize = this._$bufferSize.asObservable();

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
  readonly $maxBufferSize = this._$maxBufferSize.asObservable();

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
  readonly $snappingMethod = this._$snappingMethod.asObservable();

  private _snappingMethodTransform = (v: SnappingMethod) => {
    const valid = validateString(v) && (v === 'normal' || v === 'advanced');
    if (!valid) {
      console.error('The "snappingMethod" parameter must have the value `normal` or `advanced`.');
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
  readonly $methodForSelecting = this._$methodForSelecting.asObservable();

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
  readonly $trackBy = this._$trackBy.asObservable();

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

  private _isVertical = this.getIsVertical();

  get orientation() {
    return this._isVertical ? Directions.VERTICAL : Directions.HORIZONTAL;
  }

  private _$focusedElement = new BehaviorSubject<Id | undefined>(undefined);
  readonly $focusedElement = this._$focusedElement.asObservable();

  private _isSnappingMethodAdvanced: boolean = this.getIsSnappingMethodAdvanced();
  get isSnappingMethodAdvanced() { return this._isSnappingMethodAdvanced; }

  private _isNotSelecting = this.getIsNotSelecting();
  get isNotSelecting() { return this._isNotSelecting; }

  private _isSingleSelecting = this.getIsSingleSelecting();
  get isSingleSelecting() { return this._isSingleSelecting; }

  private _isMultiSelecting = this.getIsMultiSelecting();
  get isMultiSelecting() { return this._isMultiSelecting; }

  private _$actualItems = new BehaviorSubject<IVirtualListCollection>([]);

  private _$collapsedItemIds = new BehaviorSubject<Array<Id>>([]);

  private _displayComponents: Array<ComponentRef<BaseVirtualListItemComponent>> = [];

  private _snapedDisplayComponent: ComponentRef<BaseVirtualListItemComponent> | undefined;

  private _$bounds = new BehaviorSubject<ISize | null>(null);

  private _$scrollSize = new BehaviorSubject<number>(0);

  private _$isScrollStart = new BehaviorSubject<boolean>(true);

  private _$isScrollFinished = new BehaviorSubject<boolean>(false);

  private _resizeObserver: ResizeObserver | null = null;

  private _resizeSnappedComponentHandler = () => {
    const list = this._list, container = this._container, snappedComponent = this._snapedDisplayComponent?.instance;
    if (list && container && snappedComponent) {
      const isVertical = this._isVertical, listBounds = list.nativeElement.getBoundingClientRect(), listElement = list?.nativeElement,
        { width: lWidth, height: lHeight } = listElement?.getBoundingClientRect() ?? { width: 0, height: 0 },
        { width, height } = this._$bounds.getValue() ?? { width: 0, height: 0 },
        isScrollable = isVertical ? container.nativeElement.scrollHeight > 0 : container.nativeElement.scrollWidth > 0;

      let scrollBarSize = isVertical ? width - lWidth : height - lHeight, isScrollBarOverlap = true, overlapScrollBarSize = 0;
      if (scrollBarSize === 0 && isScrollable) {
        isScrollBarOverlap = true;
      }

      if (isScrollBarOverlap && IS_FIREFOX) {
        scrollBarSize = overlapScrollBarSize = FIREFOX_SCROLLBAR_OVERLAP_SIZE;
      }

      const { width: sWidth, height: sHeight } = snappedComponent.getBounds() ?? { width: 0, height: 0 };
      snappedComponent.element.style.clipPath = `path("M 0 0 L 0 ${sHeight} L ${sWidth - overlapScrollBarSize} ${sHeight} L ${sWidth - overlapScrollBarSize} 0 Z")`;

      snappedComponent.regularLength = `${isVertical ? listBounds.width : listBounds.height}${PX}`;
      const containerElement = container.nativeElement, delta = snappedComponent.item?.measures.delta ?? 0;

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

  private _onResizeHandler = () => {
    const bounds = this._container?.nativeElement?.getBoundingClientRect();
    if (bounds) {
      this._$bounds.next({ width: bounds.width, height: bounds.height });
    } else {
      this._$bounds.next({ width: DEFAULT_LIST_SIZE, height: DEFAULT_LIST_SIZE });
    }

    if (this._isSnappingMethodAdvanced) {
      this.updateRegularRenderer();
    }
  }

  private _onScrollHandler = (e?: Event) => {
    this.clearScrollToRepeatExecutionTimeout();

    const container = this._container?.nativeElement;
    if (container) {
      const scrollSize = (this._isVertical ? container.scrollTop : container.scrollLeft);

      this._$scrollSize.next(scrollSize);
    }
  }

  private itemToFocus = (element: HTMLElement, position: number) => {
    const container = this._container?.nativeElement;
    if (container) {
      const { width, height } = this._$bounds.getValue()!, { width: elementWidth, height: elementHeight } = element.getBoundingClientRect(),
        isVertical = this._isVertical, pos = isVertical ? position - (height - elementHeight) * .5 : position - (width - elementWidth) * .5;
      const params: ScrollToOptions = { [this._isVertical ? TOP_PROP_NAME : LEFT_PROP_NAME]: pos, behavior: 'instant' as ScrollBehavior };
      container.scrollTo(params);
    }
  }

  private _$initialized = new BehaviorSubject<boolean>(false);
  readonly $initialized = this._$initialized.asObservable();

  private _$viewInitialized = new BehaviorSubject<boolean>(false);
  readonly $viewInitialized = this._$viewInitialized.asObservable();

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
  private _trackBox: TrackBox = new this._trackBoxClass(this.trackBy);

  private _onTrackBoxChangeHandler = (v: number) => {
    this._$cacheVersion.next(v);
  }

  private _$cacheVersion = new BehaviorSubject<number>(-1);
  get $cacheVersion() { return this._$cacheVersion.asObservable(); }

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

    this._service.$focusedId.pipe(
      takeUntil(this._$unsubscribe),
      tap(v => {
        this._$focusedElement.next(v ?? undefined);
      }),
    ).subscribe();

    this.$viewInitialized.pipe(
      takeUntil(this._$unsubscribe),
      filter(v => !!v),
      tap(v => {
        this._service.listElement = this._list?.nativeElement ?? null;
      }),
    ).subscribe();

    this._trackBox.displayComponents = this._displayComponents;

    const $trackBy = this.$trackBy,
      $selectByClick = this.$selectByClick,
      $collapseByClick = this.$collapseByClick,
      $isScrollStart = this._$isScrollStart.asObservable(),
      $isScrollFinished = this._$isScrollFinished.asObservable();

    $isScrollStart.pipe(
      takeUntil(this._$unsubscribe),
      distinctUntilChanged(),
      skip(1),
      tap(v => {
        if (v) {
          this.onScrollReachStart.emit();
        }
      }),
    ).subscribe();

    $isScrollFinished.pipe(
      takeUntil(this._$unsubscribe),
      distinctUntilChanged(),
      skip(1),
      tap(v => {
        if (v) {
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

    const $bounds = this._$bounds.asObservable().pipe(
      filter(b => !!b),
    ), $items = this.$items.pipe(
      map(i => !i ? [] : i),
    ), $scrollSize = this._$scrollSize.asObservable(),
      $itemSize = this.$itemSize.pipe(
        map(v => v <= 0 ? DEFAULT_ITEM_SIZE : v),
      ),
      $bufferSize = this.$bufferSize.pipe(
        map(v => v < 0 ? DEFAULT_BUFFER_SIZE : v),
      ),
      $maxBufferSize = this.$maxBufferSize.pipe(
        map(v => v < 0 ? DEFAULT_MAX_BUFFER_SIZE : v),
      ),
      $itemConfigMap = this.$itemConfigMap.pipe(
        map(v => !v ? {} : v),
      ),
      $snap = this.$snap,
      $isVertical = this.$direction.pipe(
        map(v => this.getIsVertical(v || DEFAULT_DIRECTION)),
      ),
      $dynamicSize = this.$dynamicSize,
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
      $cacheVersion = this.$cacheVersion;

    combineLatest([$items, $itemSize, this.$initialized]).pipe(
      takeUntil(this._$unsubscribe),
      distinctUntilChanged(),
      filter(([, , init]) => !!init),
      map(([items, itemSize]) => ({ items, itemSize })),
      tap(({ items, itemSize }) => {
        this._trackBox.resetCollection(items, itemSize);
      }),
    ).subscribe();

    combineLatest([$items, $collapsedItemIds, $itemConfigMap]).pipe(
      takeUntil(this._$unsubscribe),
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

    combineLatest([$methodForSelecting, this.$initialized]).pipe(
      takeUntil(this._$unsubscribe),
      debounceTime(0),
      filter(([, init]) => init === true),
      map(([v]) => (v)),
      tap(v => {
        const el = this._list?.nativeElement;
        if (this.getIsMultiSelecting(v || DEFAULT_SNAPPING_METHOD)) {
          this._isMultiSelecting = true;
          this._isNotSelecting = this._isSingleSelecting = false;
          if (el) {
            el.setAttribute('role', ROLE_LIST_BOX);
          }
          this._service.methodOfSelecting = MethodsForSelectingTypes.MULTI_SELECT;
        } else if (this.getIsSingleSelecting(v || DEFAULT_SNAPPING_METHOD)) {
          this._isSingleSelecting = true;
          this._isNotSelecting = this._isMultiSelecting = false;
          if (el) {
            el.setAttribute('role', ROLE_LIST_BOX);
          }
          this._service.methodOfSelecting = MethodsForSelectingTypes.SELECT;
        } else if (this.getIsNotSelecting(v || DEFAULT_SNAPPING_METHOD)) {
          this._isNotSelecting = true;
          this._isSingleSelecting = this._isMultiSelecting = false;
          if (el) {
            el.setAttribute('role', ROLE_LIST);
          }
          this._service.methodOfSelecting = MethodsForSelectingTypes.NONE;
        }
      }),
    ).subscribe();

    $dynamicSize.pipe(
      takeUntil(this._$unsubscribe),
      tap(dynamicSize => {
        this.listenCacheChangesIfNeed(dynamicSize);
      })
    ).subscribe();

    combineLatest([this.$initialized, $bounds, $actualItems, $itemConfigMap, $scrollSize, $itemSize,
      $bufferSize, $maxBufferSize, $snap, $isVertical, $dynamicSize, $enabledBufferOptimization, $cacheVersion,
    ]).pipe(
      takeUntil(this._$unsubscribe),
      distinctUntilChanged(),
      filter(([initialized]) => !!initialized),
      switchMap(([,
        bounds, items, itemConfigMap, scrollSize, itemSize,
        bufferSize, maxBufferSize, snap, isVertical, dynamicSize, enabledBufferOptimization, cacheVersion,
      ]) => {
        let actualScrollSize = (this._isVertical ? this._container?.nativeElement.scrollTop ?? 0 : this._container?.nativeElement.scrollLeft) ?? 0;
        const { width, height } = bounds!,
          opts: IUpdateCollectionOptions<IVirtualListItem, IVirtualListCollection> = {
            bounds: { width, height }, dynamicSize, isVertical, itemSize,
            bufferSize, maxBufferSize, scrollSize: actualScrollSize, snap, enabledBufferOptimization,
          },
          { displayItems, totalSize } = this._trackBox.updateCollection(items, itemConfigMap, opts);

        this._service.collection = displayItems;

        this.resetBoundsSize(isVertical, totalSize);

        this.createDisplayComponentsIfNeed(displayItems);

        this.tracking();

        const scrollLength = (this._isVertical ? this._container?.nativeElement.scrollHeight ?? 0 : this._container?.nativeElement.scrollWidth) ?? 0,
          actualScrollLength = scrollLength === 0 ? 0 : scrollLength - (this._isVertical ? height : width),
          scrollPosition = actualScrollSize + this._trackBox.delta;

        this._$isScrollStart.next(scrollPosition === 0);
        this._$isScrollFinished.next(scrollPosition === actualScrollLength);

        if (this._isSnappingMethodAdvanced) {
          this.updateRegularRenderer();
        }

        const container = this._container;

        if (container) {
          const delta = this._trackBox.delta;
          actualScrollSize = actualScrollSize + delta;

          this._trackBox.clearDelta();

          if (scrollSize !== actualScrollSize) {
            const params: ScrollToOptions = {
              [this._isVertical ? TOP_PROP_NAME : LEFT_PROP_NAME]: actualScrollSize,
              behavior: BEHAVIOR_INSTANT as ScrollBehavior
            };

            container.nativeElement.scrollTo(params);
          }
        }

        return of(displayItems);
      }),
    ).subscribe();

    const $itemRenderer = this.$itemRenderer;

    $itemRenderer.pipe(
      takeUntil(this._$unsubscribe),
      distinctUntilChanged(),
      filter(v => !!v),
      tap(v => {
        this._$renderer.next(v);
      }),
    ).subscribe();

    $bounds.pipe(
      takeUntil(this._$unsubscribe),
      distinctUntilChanged(),
      tap(v => {
        this.onViewportChange.emit(objectAsReadonly(v ?? undefined));
      }),
    ).subscribe();

    this._service.$itemClick.pipe(
      takeUntil(this._$unsubscribe),
      tap(v => {
        this.onItemClick.emit(objectAsReadonly(v ?? undefined));
      }),
    ).subscribe();

    let isSelectedIdsFirstEmit = 0;

    this._service.$selectedIds.pipe(
      takeUntil(this._$unsubscribe),
      distinctUntilChanged(),
      tap(v => {
        if (this.isSingleSelecting || (this.isMultiSelecting && isSelectedIdsFirstEmit >= 2)) {
          const curr = this._$selectedIds.getValue();
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
  }

  ngOnInit() {
    this.onInit();
  }

  private onInit() {
    this._$initialized.next(true);
  }

  private listenCacheChangesIfNeed(value: boolean) {
    if (value) {
      if (!this._trackBox.hasEventListener(TRACK_BOX_CHANGE_EVENT_NAME, this._onTrackBoxChangeHandler)) {
        this._trackBox.addEventListener(TRACK_BOX_CHANGE_EVENT_NAME, this._onTrackBoxChangeHandler);
      }
    } else {
      if (this._trackBox.hasEventListener(TRACK_BOX_CHANGE_EVENT_NAME, this._onTrackBoxChangeHandler)) {
        this._trackBox.removeEventListener(TRACK_BOX_CHANGE_EVENT_NAME, this._onTrackBoxChangeHandler);
      }
    }
  }

  private getIsSnappingMethodAdvanced(m?: SnappingMethod) {
    const method = m || this._$snappingMethod.getValue();
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

  private _componentsResizeObserver = new ResizeObserver(() => {
    this._trackBox.changes();
  });

  private createDisplayComponentsIfNeed(displayItems: IRenderVirtualListCollection | null) {
    if (!displayItems || !this._listContainerRef) {
      this._trackBox.setDisplayObjectIndexMapById({});
      return;
    }

    if (this._isSnappingMethodAdvanced && this.snap) {
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
    const doMap: { [id: number]: number } = {};
    for (let i = 0, l = this._displayComponents.length; i < l; i++) {
      const item = this._displayComponents[i];
      item.instance.renderer = itemRenderer || this.itemRenderer;
      doMap[item.instance.id] = i;
    }

    if (this._isSnappingMethodAdvanced && this.snap && this._snapedDisplayComponent && this._snapContainerRef) {
      const comp = this._snapedDisplayComponent;
      comp.instance.renderer = itemRenderer || this.itemRenderer;
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
    const l = this._list;
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
   * The method scrolls the list to the element with the given id and returns the value of the scrolled area.
   * Behavior accepts the values ​​"auto", "instant" and "smooth".
   */
  scrollTo(id: Id, behavior: ScrollBehavior = BEHAVIOR_AUTO, iteration: number = 0) {
    validateId(id);
    validateScrollBehavior(behavior);
    validateIteration(iteration);
    this.scrollToExecutor(id, behavior, validateScrollIteration(iteration));
  }

  private _scrollToRepeatExecutionTimeout: any;

  private clearScrollToRepeatExecutionTimeout() {
    clearTimeout(this._scrollToRepeatExecutionTimeout);
  }

  private scrollToExecutor(id: Id, behavior: ScrollBehavior, iteration: number = 0, isLastIteration = false) {
    const items = this._$actualItems.getValue();
    if (!items || !items.length) {
      return;
    }

    const dynamicSize = this.dynamicSize, container = this._container, itemSize = this.itemSize;
    if (container) {
      this.clearScrollToRepeatExecutionTimeout();

      if (dynamicSize) {
        if (container) {
          container.nativeElement.removeEventListener(SCROLL, this._onScrollHandler);
        }

        const { width, height } = this._$bounds.getValue() || { width: 0, height: 0 },
          itemConfigMap = this.itemConfigMap, items = this._$actualItems.getValue(), isVertical = this._isVertical, delta = this._trackBox.delta,
          opts: IGetItemPositionOptions<IVirtualListItem, IVirtualListCollection> = {
            bounds: { width, height }, collection: items, dynamicSize, isVertical: this._isVertical, itemSize,
            bufferSize: this.bufferSize, maxBufferSize: this.maxBufferSize, scrollSize: (isVertical ? container.nativeElement.scrollTop : container.nativeElement.scrollLeft) + delta,
            snap: this.snap, fromItemId: id, enabledBufferOptimization: this.enabledBufferOptimization,
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
              this.scrollToExecutor(id, BEHAVIOR_INSTANT as ScrollBehavior, iteration + 1, notChanged);
            });
          } else {
            this._$scrollSize.next(actualScrollSize);

            container.nativeElement.addEventListener(SCROLL, this._onScrollHandler);
          }
        }

        container.nativeElement.scrollTo(params);

        this._$scrollSize.next(scrollSize);
      } else {
        const index = items.findIndex(item => item.id === id);
        if (index > -1) {
          const scrollSize = index * this.itemSize;
          const params: ScrollToOptions = { [this._isVertical ? TOP_PROP_NAME : LEFT_PROP_NAME]: scrollSize, behavior };
          container.nativeElement.scrollTo(params);
        }
      }
    }
  }

  /**
   * Scrolls the scroll area to the desired element with the specified ID.
   */
  scrollToEnd(behavior: ScrollBehavior = BEHAVIOR_INSTANT as ScrollBehavior, iteration: number = 0) {
    validateScrollBehavior(behavior);
    validateIteration(iteration);
    const items = this._$actualItems.getValue(), latItem = items[items.length > 0 ? items.length - 1 : 0];
    this.scrollTo(latItem.id, behavior, validateScrollIteration(iteration));
  }

  private _onContainerScrollHandler = (e: Event) => {
    const containerEl = this._container;
    if (containerEl) {
      const scrollSize = (this._isVertical ? containerEl.nativeElement.scrollTop : containerEl.nativeElement.scrollLeft);
      this._trackBox.deltaDirection = this._$scrollSize.getValue() > scrollSize ? -1 : this._$scrollSize.getValue() < scrollSize ? 1 : 0;

      const event = new ScrollEvent({
        direction: this._trackBox.scrollDirection, container: containerEl.nativeElement,
        list: this._list!.nativeElement, delta: this._trackBox.delta,
        scrollDelta: this._trackBox.scrollDelta, isVertical: this._isVertical,
      });

      this.onScroll.emit(event);
    }
  }

  private _onContainerScrollEndHandler = (e: Event) => {
    const containerEl = this._container;
    if (containerEl) {
      const scrollSize = (this._isVertical ? containerEl.nativeElement.scrollTop : containerEl.nativeElement.scrollLeft);
      this._trackBox.deltaDirection = this._$scrollSize.getValue() > scrollSize ? -1 : 0;

      const event = new ScrollEvent({
        direction: this._trackBox.scrollDirection, container: containerEl.nativeElement,
        list: this._list!.nativeElement, delta: this._trackBox.delta,
        scrollDelta: this._trackBox.scrollDelta, isVertical: this._isVertical,
      });

      this.onScrollEnd.emit(event);
    }
  }

  ngAfterViewInit(): void {
    this.afterViewInit();
  }

  private afterViewInit() {
    const containerEl = this._container;
    if (containerEl) {
      // for direction calculation
      containerEl.nativeElement.addEventListener(SCROLL, this._onContainerScrollHandler);
      containerEl.nativeElement.addEventListener(SCROLL_END, this._onContainerScrollEndHandler);

      containerEl.nativeElement.addEventListener(SCROLL, this._onScrollHandler);

      this._resizeObserver = new ResizeObserver(this._onResizeHandler);
      this._resizeObserver.observe(containerEl.nativeElement);

      this._onResizeHandler();
    }

    this._$viewInitialized.next(true);
  }

  override ngOnDestroy(): void {
    super.ngOnDestroy();
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

    if (this._resizeObserver) {
      this._resizeObserver.disconnect();
    }

    if (this._resizeSnappedObserver) {
      this._resizeSnappedObserver.disconnect();
    }

    const containerEl = this._container;
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

    if (this._service) {
      this._service.destroy();
    }
  }
}
