import {
  AfterViewInit, ChangeDetectionStrategy, ChangeDetectorRef, Component, ComponentRef, ElementRef, EventEmitter, Input,
  OnDestroy, OnInit, Output, TemplateRef, ViewChild, ViewContainerRef, ViewEncapsulation,
} from '@angular/core';
import { BehaviorSubject, combineLatest, distinctUntilChanged, filter, map, Observable, of, switchMap, tap } from 'rxjs';
import {
  BEHAVIOR_AUTO, BEHAVIOR_INSTANT, CLASS_LIST_HORIZONTAL, CLASS_LIST_VERTICAL, DEFAULT_BUFFER_SIZE, DEFAULT_DIRECTION, DEFAULT_DYNAMIC_SIZE, DEFAULT_ENABLED_BUFFER_OPTIMIZATION, DEFAULT_ITEM_SIZE,
  DEFAULT_LIST_SIZE, DEFAULT_MAX_BUFFER_SIZE, DEFAULT_SNAP, DEFAULT_SNAPPING_METHOD, HEIGHT_PROP_NAME, LEFT_PROP_NAME, MAX_SCROLL_TO_ITERATIONS, PX, SCROLL, SCROLL_END, TOP_PROP_NAME,
  TRACK_BY_PROPERTY_NAME, WIDTH_PROP_NAME,
} from './const';
import { IRenderVirtualListItem, IScrollEvent, IVirtualListCollection, IVirtualListItem, IVirtualListStickyMap } from './models';
import { Id, ISize } from './types';
import { IRenderVirtualListCollection } from './models/render-collection.model';
import { Direction, Directions, SnappingMethod } from './enums';
import { ScrollEvent, toggleClassName } from './utils';
import { IGetItemPositionOptions, IUpdateCollectionOptions, TRACK_BOX_CHANGE_EVENT_NAME, TrackBox } from './utils/trackBox';
import { isSnappingMethodAdvenced } from './utils/snapping-method';
import { FIREFOX_SCROLLBAR_OVERLAP_SIZE, IS_FIREFOX } from './utils/browser';
import { NgVirtualListItemComponent } from './components/ng-virtual-list-item.component';
import { BaseVirtualListItemComponent } from './models/base-virtual-list-item-component';
import { Component$1 } from './models/component.model';
import { isDirection } from './utils/isDirection';
import { NgVirtualListService } from './ng-virtual-list.service';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';

/**
 * Virtual list component.
 * Maximum performance for extremely large lists.
 * It is based on algorithms for virtualization of screen objects.
 * @link https://github.com/DjonnyX/ng-virtual-list/blob/16.x/projects/ng-virtual-list/src/lib/ng-virtual-list.component.ts
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
})
export class NgVirtualListComponent implements AfterViewInit, OnInit, OnDestroy {
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
  private _list: ElementRef<HTMLUListElement> | undefined;

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

  private _$items = new BehaviorSubject<IVirtualListCollection | undefined>(undefined);
  readonly $items = this._$items.asObservable();

  private _itemsTransform = (v: IVirtualListCollection | undefined) => {
    this._trackBox.resetCollection(v, this._$itemSize.getValue());
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

  private _$snap = new BehaviorSubject<boolean>(DEFAULT_SNAP);
  readonly $snap = this._$snap.asObservable();

  /**
   * Determines whether elements will snap. Default value is "true".
   */
  @Input()
  set snap(v: boolean) {
    if (this._$snap.getValue() === v) {
      return;
    }

    this._$snap.next(v);

    this._cdr.markForCheck();
  };
  get snap() { return this._$snap.getValue(); }

  private _$enabledBufferOptimization = new BehaviorSubject<boolean>(DEFAULT_ENABLED_BUFFER_OPTIMIZATION);
  readonly $enabledBufferOptimization = this._$enabledBufferOptimization.asObservable();
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

    this._$enabledBufferOptimization.next(v);

    this._cdr.markForCheck();
  };
  get enabledBufferOptimization() { return this._$enabledBufferOptimization.getValue(); }


  private _$itemRenderer = new BehaviorSubject<TemplateRef<any> | undefined>(undefined);
  readonly $itemRenderer = this._$itemRenderer.asObservable();

  private _$renderer = new BehaviorSubject<TemplateRef<any> | undefined>(undefined);
  /**
  * Rendering element template.
  */
  @Input()
  set itemRenderer(v: TemplateRef<any>) {
    if (this._$itemRenderer.getValue() === v) {
      return;
    }

    this._$itemRenderer.next(v);

    this._cdr.markForCheck();
  };
  get itemRenderer() { return this._$itemRenderer.getValue() as TemplateRef<any>; }

  private _$stickyMap = new BehaviorSubject<IVirtualListStickyMap>({});
  readonly $stickyMap = this._$stickyMap.asObservable();

  /**
   * Dictionary zIndex by id of the list element. If the value is not set or equal to 0,
   * then a simple element is displayed, if the value is greater than 0, then the sticky position mode is enabled for the element.
   */
  @Input()
  set stickyMap(v: IVirtualListStickyMap) {
    if (this._$stickyMap.getValue() === v) {
      return;
    }

    this._$stickyMap.next(v);

    this._cdr.markForCheck();
  };
  get stickyMap() { return this._$stickyMap.getValue(); }

  private _itemSizeOptions = (v: number | undefined) => {
    if (v === undefined) {
      return DEFAULT_ITEM_SIZE;
    }
    const val = Number(v);
    return Number.isNaN(val) || val <= 0 ? DEFAULT_ITEM_SIZE : val;
  };

  private _$itemSize = new BehaviorSubject<number>(DEFAULT_ITEM_SIZE);
  readonly $itemSize = this._$itemSize.asObservable();

  /**
   * If direction = 'vertical', then the height of a typical element. If direction = 'horizontal', then the width of a typical element.
   * Ignored if the dynamicSize property is true.
   */
  @Input()
  set itemSize(v: number) {
    if (this._$itemSize.getValue() === v) {
      return;
    }

    this._$itemSize.next(this._itemSizeOptions(v));

    this._cdr.markForCheck();
  };
  get itemSize() { return this._$itemSize.getValue(); }

  private _$dynamicSize = new BehaviorSubject<boolean>(DEFAULT_DYNAMIC_SIZE);
  readonly $dynamicSize = this._$dynamicSize.asObservable();

  /**
   * If true then the items in the list can have different sizes and the itemSize property is ignored.
   * If false then the items in the list have a fixed size specified by the itemSize property. The default value is false.
   */
  @Input()
  set dynamicSize(v: boolean) {
    if (this._$dynamicSize.getValue() === v) {
      return;
    }

    this._$dynamicSize.next(v);

    this._cdr.markForCheck();
  };
  get dynamicSize() { return this._$dynamicSize.getValue(); }

  private _$direction = new BehaviorSubject<Direction>(DEFAULT_DIRECTION);
  readonly $direction = this._$direction.asObservable();

  /**
   * Determines the direction in which elements are placed. Default value is "vertical".
   */
  @Input()
  set direction(v: Direction) {
    if (this._$direction.getValue() === v) {
      return;
    }

    this._$direction.next(v);

    this._cdr.markForCheck();
  };
  get direction() { return this._$direction.getValue(); }

  /**
   * @deprecated "itemOffset" parameter is deprecated. Use "bufferSize" and "maxBufferSize".
   */
  @Input()
  set itemsOffset(v: number) {
    throw Error('"itemOffset" parameter is deprecated. Use "bufferSize" and "maxBufferSize".');
  };

  private _$bufferSize = new BehaviorSubject<number>(DEFAULT_BUFFER_SIZE);
  readonly $bufferSize = this._$bufferSize.asObservable();

  /**
   * Number of elements outside the scope of visibility. Default value is 2.
   */
  @Input()
  set bufferSize(v: number) {
    if (this._$bufferSize.getValue() === v) {
      return;
    }

    this._$bufferSize.next(v);
  };
  get bufferSize() { return this._$bufferSize.getValue(); }

  private _maxBufferSizeTransform = (v: number | undefined) => {
    const bufferSize = this._$bufferSize.getValue();
    if (v === undefined || v <= bufferSize) {
      return bufferSize;
    }
    return v;
  };

  private _$maxBufferSize = new BehaviorSubject<number>(DEFAULT_MAX_BUFFER_SIZE);
  readonly $maxBufferSize = this._$maxBufferSize.asObservable();

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

  private _$trackBy = new BehaviorSubject<string>(TRACK_BY_PROPERTY_NAME);
  readonly $trackBy = this._$trackBy.asObservable();

  /**
   * The name of the property by which tracking is performed
   */
  @Input()
  set trackBy(v: string) {
    if (this._$trackBy.getValue() === v) {
      return;
    }

    this._$trackBy.next(v);
  };
  get trackBy() { return this._$trackBy.getValue(); }

  private _isVertical = this.getIsVertical();

  private _$snappingMethod = new BehaviorSubject<SnappingMethod>(DEFAULT_SNAPPING_METHOD);
  readonly $snappingMethod = this._$snappingMethod.asObservable();

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

    this._$snappingMethod.next(v);
  };
  get snappingMethod() { return this._$snappingMethod.getValue(); }

  private _isSnappingMethodAdvanced: boolean = this.getIsSnappingMethodAdvanced();
  get isSnappingMethodAdvanced() { return this._isSnappingMethodAdvanced; }

  private _displayComponents: Array<ComponentRef<BaseVirtualListItemComponent>> = [];

  private _snapedDisplayComponent: ComponentRef<BaseVirtualListItemComponent> | undefined;

  private _$bounds = new BehaviorSubject<ISize | null>(null);

  private _$scrollSize = new BehaviorSubject<number>(0);

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

  private _$initialized = new BehaviorSubject<boolean>(false);

  readonly $initialized: Observable<boolean>;

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
    NgVirtualListComponent.__nextId = NgVirtualListComponent.__nextId + 1 === Number.MAX_SAFE_INTEGER
      ? 0 : NgVirtualListComponent.__nextId + 1;
    this._id = NgVirtualListComponent.__nextId;

    this._service.initialize(this._trackBox);

    this._$initialized = new BehaviorSubject<boolean>(false);
    this.$initialized = this._$initialized.asObservable();

    this._trackBox.displayComponents = this._displayComponents;

    const $trackBy = this.$trackBy;

    $trackBy.pipe(
      takeUntilDestroyed(),
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
      $stickyMap = this.$stickyMap.pipe(
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
      $cacheVersion = this.$cacheVersion;

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

    $dynamicSize.pipe(
      takeUntilDestroyed(),
      tap(dynamicSize => {
        this.listenCacheChangesIfNeed(dynamicSize);
      })
    ).subscribe();

    combineLatest([this.$initialized, $bounds, $items, $stickyMap, $scrollSize, $itemSize,
      $bufferSize, $maxBufferSize, $snap, $isVertical, $dynamicSize, $enabledBufferOptimization, $cacheVersion,
    ]).pipe(
      takeUntilDestroyed(),
      distinctUntilChanged(),
      filter(([initialized]) => !!initialized),
      switchMap(([,
        bounds, items, stickyMap, scrollSize, itemSize,
        bufferSize, maxBufferSize, snap, isVertical, dynamicSize, enabledBufferOptimization, cacheVersion,
      ]) => {
        let actualScrollSize = (this._isVertical ? this._container?.nativeElement.scrollTop ?? 0 : this._container?.nativeElement.scrollLeft) ?? 0;
        const { width, height } = bounds!,
          opts: IUpdateCollectionOptions<IVirtualListItem, IVirtualListCollection> = {
            bounds: { width, height }, dynamicSize, isVertical, itemSize,
            bufferSize, maxBufferSize, scrollSize: actualScrollSize, snap, enabledBufferOptimization,
          },
          { displayItems, totalSize } = this._trackBox.updateCollection(items, stickyMap, opts);

        this.resetBoundsSize(isVertical, totalSize);

        this.createDisplayComponentsIfNeed(displayItems);

        this.tracking();

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
      takeUntilDestroyed(),
      distinctUntilChanged(),
      filter(v => !!v),
      tap(v => {
        this._$renderer.next(v);
      }),
    ).subscribe();

    $bounds.pipe(
      takeUntilDestroyed(),
      distinctUntilChanged(),
      tap(value => {
        this.onViewportChange.emit(value ?? undefined);
      }),
    ).subscribe();

    this._service.$itemClick.pipe(
      takeUntilDestroyed(),
      tap(v => {
        this.onItemClick.emit(v ?? undefined);
      }),
    ).subscribe();
  }

  /** @internal */
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
    return this._trackBox.getItemBounds(id);
  }

  /**
   * The method scrolls the list to the element with the given id and returns the value of the scrolled area.
   * Behavior accepts the values ​​"auto", "instant" and "smooth".
   */
  scrollTo(id: Id, behavior: ScrollBehavior = BEHAVIOR_AUTO as ScrollBehavior) {
    this.scrollToExecutor(id, behavior);
  }

  private _scrollToRepeatExecutionTimeout: any;

  private clearScrollToRepeatExecutionTimeout() {
    clearTimeout(this._scrollToRepeatExecutionTimeout);
  }

  private scrollToExecutor(id: Id, behavior: ScrollBehavior, iteration: number = 0, isLastIteration = false) {
    const items = this.items;
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
          stickyMap = this.stickyMap, items = this.items, isVertical = this._isVertical, delta = this._trackBox.delta,
          opts: IGetItemPositionOptions<IVirtualListItem, IVirtualListCollection> = {
            bounds: { width, height }, collection: items, dynamicSize, isVertical: this._isVertical, itemSize,
            bufferSize: this.bufferSize, maxBufferSize: this.maxBufferSize, scrollSize: (isVertical ? container.nativeElement.scrollTop : container.nativeElement.scrollLeft) + delta,
            snap: this.snap, fromItemId: id, enabledBufferOptimization: this.enabledBufferOptimization,
          },
          scrollSize = this._trackBox.getItemPosition(id, stickyMap, opts),
          params: ScrollToOptions = { [isVertical ? TOP_PROP_NAME : LEFT_PROP_NAME]: scrollSize, behavior };

        if (scrollSize === -1) {
          container.nativeElement.addEventListener(SCROLL, this._onScrollHandler);
          return;
        }

        this._trackBox.clearDelta();

        if (container) {
          const { displayItems, totalSize } = this._trackBox.updateCollection(items, stickyMap, {
            ...opts, scrollSize, fromItemId: isLastIteration ? undefined : id,
          }), delta = this._trackBox.delta;

          this._trackBox.clearDelta();

          let actualScrollSize = scrollSize + delta;

          this.resetBoundsSize(isVertical, totalSize);

          this.createDisplayComponentsIfNeed(displayItems);

          this.tracking();

          const _scrollSize = this._trackBox.getItemPosition(id, stickyMap, { ...opts, scrollSize: actualScrollSize, fromItemId: id });

          if (_scrollSize === -1) {
            container.nativeElement.addEventListener(SCROLL, this._onScrollHandler);
            return;
          }

          const notChanged = actualScrollSize === _scrollSize

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
  scrollToEnd(behavior: ScrollBehavior = BEHAVIOR_INSTANT as ScrollBehavior) {
    const items = this.items, latItem = items[items.length > 0 ? items.length - 1 : 0];
    this.scrollTo(latItem.id, behavior);
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

  /** @internal */
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
  }

  /** @internal */
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
  }
}
