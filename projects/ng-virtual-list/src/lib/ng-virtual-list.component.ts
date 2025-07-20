import {
  AfterViewInit, ChangeDetectionStrategy, ChangeDetectorRef, Component, ComponentRef, ElementRef, EventEmitter, Input,
  OnDestroy, OnInit, Output, TemplateRef, ViewChild, ViewContainerRef, ViewEncapsulation,
} from '@angular/core';
import { BehaviorSubject, combineLatest, distinctUntilChanged, filter, map, Observable, of, switchMap, takeUntil, tap } from 'rxjs';
import { NgVirtualListItemComponent } from './components/ng-virtual-list-item.component';
import {
  BEHAVIOR_AUTO, BEHAVIOR_INSTANT, CLASS_LIST_HORIZONTAL, CLASS_LIST_VERTICAL, DEFAULT_DIRECTION, DEFAULT_DYNAMIC_SIZE, DEFAULT_ENABLED_BUFFER_OPTIMIZATION, DEFAULT_ITEM_SIZE,
  DEFAULT_ITEMS_OFFSET, DEFAULT_LIST_SIZE, DEFAULT_SNAP, DEFAULT_SNAPPING_METHOD, HEIGHT_PROP_NAME, LEFT_PROP_NAME, MAX_SCROLL_TO_ITERATIONS, PX, SCROLL, SCROLL_END, TOP_PROP_NAME,
  TRACK_BY_PROPERTY_NAME, WIDTH_PROP_NAME,
} from './const';
import { IScrollEvent, IVirtualListCollection, IVirtualListItem, IVirtualListStickyMap } from './models';
import { Id, ISize } from './types';
import { IRenderVirtualListCollection } from './models/render-collection.model';
import { Direction, Directions, SnappingMethod } from './enums';
import { ScrollEvent, TrackBox, isDirection, toggleClassName } from './utils';
import { IGetItemPositionOptions, IUpdateCollectionOptions, TRACK_BOX_CHANGE_EVENT_NAME } from './utils/trackBox';
import { DisposableComponent } from './utils/disposableComponent';
import { isSnappingMethodAdvenced } from './utils/snapping-method';
import { FIREFOX_SCROLLBAR_OVERLAP_SIZE, IS_FIREFOX } from './utils/browser';

/**
 * Virtual list component.
 * Maximum performance for extremely large lists.
 * It is based on algorithms for virtualization of screen objects.
 * @link https://github.com/DjonnyX/ng-virtual-list/blob/14.x/projects/ng-virtual-list/src/lib/ng-virtual-list.component.ts
 * @author Evgenii Grebennikov
 * @email djonnyx@gmail.com
 */
@Component({
  selector: 'ng-virtual-list',
  templateUrl: './ng-virtual-list.component.html',
  styleUrls: ['./ng-virtual-list.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
  encapsulation: ViewEncapsulation.ShadowDom,
})
export class NgVirtualListComponent extends DisposableComponent implements AfterViewInit, OnInit, OnDestroy {
  private static __nextId: number = 0;

  private _id: number = NgVirtualListComponent.__nextId;
  /**
   * Readonly. Returns the unique identifier of the component.
   */
  get id() { return this._id; }

  @ViewChild('renderersContainer', { read: ViewContainerRef })
  protected _listContainerRef: ViewContainerRef | undefined;

  @ViewChild('container', { read: ElementRef<HTMLDivElement> })
  protected _container: ElementRef<HTMLDivElement> | undefined;

  @ViewChild('list', { read: ElementRef<HTMLDivElement> })
  protected _list: ElementRef<HTMLUListElement> | undefined;

  @ViewChild('snapRendererContainer', { read: ViewContainerRef })
  protected _snapContainerRef: ViewContainerRef | undefined;

  @ViewChild('snapped', { read: ViewContainerRef })
  protected _snappedContainer: ViewContainerRef | undefined;

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

  private _$itemsOffset = new BehaviorSubject<number>(DEFAULT_ITEMS_OFFSET);
  readonly $itemsOffset = this._$itemsOffset.asObservable();

  /**
   * Number of elements outside the scope of visibility. Default value is 2.
   */
  @Input()
  set itemsOffset(v: number) {
    if (this._$itemsOffset.getValue() === v) {
      return;
    }

    this._$itemsOffset.next(v);
  };
  get itemsOffset() { return this._$itemsOffset.getValue(); }

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

  protected _isSnappingMethodAdvanced: boolean = this.getIsSnappingMethodAdvanced();

  protected _displayComponents: Array<ComponentRef<NgVirtualListItemComponent>> = [];

  protected _snapedDisplayComponent: ComponentRef<NgVirtualListItemComponent> | undefined;

  protected _$bounds = new BehaviorSubject<ISize | null>(null);

  protected _$scrollSize = new BehaviorSubject<number>(0);

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

      snappedComponent.element.style.clipPath = `path("M 0 0 L 0 ${snappedComponent.element.offsetHeight} L ${snappedComponent.element.offsetWidth - overlapScrollBarSize} ${snappedComponent.element.offsetHeight} L ${snappedComponent.element.offsetWidth - overlapScrollBarSize} 0 Z")`;

      snappedComponent.regularLength = `${isVertical ? listBounds.width : listBounds.height}${PX}`;
      const { width: sWidth, height: sHeight } = snappedComponent.getBounds() ?? { width: 0, height: 0 },
        containerElement = container.nativeElement;

      let left: number, right: number, top: number, bottom: number;
      if (isVertical) {
        const snappedY = snappedComponent.item?.measures.y ?? 0, scrollSize = container.nativeElement.scrollTop, delta = snappedY - scrollSize;
        left = 0;
        right = width - scrollBarSize;
        top = sHeight;
        bottom = height;
        containerElement.style.clipPath = `path("M 0 ${top + delta} L 0 ${height} L ${width} ${height} L ${width} 0 L ${right} 0 L ${right} ${top + delta} Z")`;
      } else {
        const snappedX = snappedComponent.item?.measures.x ?? 0, scrollSize = container.nativeElement.scrollLeft, delta = snappedX - scrollSize;
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
   * Dictionary of element sizes by their id
   */
  private _trackBox = new TrackBox(this.trackBy);

  private _onTrackBoxChangeHandler = (v: number) => {
    this._$cacheVersion.next(v);
  }

  private _$cacheVersion = new BehaviorSubject<number>(-1);
  get $cacheVersion() { return this._$cacheVersion.asObservable(); }

  constructor(
    private _cdr: ChangeDetectorRef,
    private _elementRef: ElementRef<HTMLDivElement>
  ) {
    super();
    NgVirtualListComponent.__nextId = NgVirtualListComponent.__nextId + 1 === Number.MAX_SAFE_INTEGER
      ? 0 : NgVirtualListComponent.__nextId + 1;
    this._id = NgVirtualListComponent.__nextId;

    this._$initialized = new BehaviorSubject<boolean>(false);
    this.$initialized = this._$initialized.asObservable();

    this._trackBox.displayComponents = this._displayComponents;

    const $trackBy = this.$trackBy;

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
      $itemsOffset = this.$itemsOffset.pipe(
        map(v => v < 0 ? DEFAULT_ITEMS_OFFSET : v),
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
      takeUntil(this._$unsubscribe),
      tap(v => {
        this._isVertical = v;
        const el: HTMLElement = this._elementRef.nativeElement;
        toggleClassName(el, v ? CLASS_LIST_VERTICAL : CLASS_LIST_HORIZONTAL, true);
      }),
    ).subscribe();

    $snappingMethod.pipe(
      takeUntil(this._$unsubscribe),
      tap(v => {
        this._isSnappingMethodAdvanced = this._trackBox.isSnappingMethodAdvanced = v;
      }),
    ).subscribe();

    $dynamicSize.pipe(
      takeUntil(this._$unsubscribe),
      tap(dynamicSize => {
        this.listenCacheChangesIfNeed(dynamicSize);
      })
    ).subscribe();

    combineLatest([this.$initialized, $bounds, $items, $stickyMap, $scrollSize, $itemSize,
      $itemsOffset, $snap, $isVertical, $dynamicSize, $enabledBufferOptimization, $cacheVersion,
    ]).pipe(
      takeUntil(this._$unsubscribe),
      distinctUntilChanged(),
      filter(([initialized]) => !!initialized),
      switchMap(([,
        bounds, items, stickyMap, scrollSize, itemSize,
        itemsOffset, snap, isVertical, dynamicSize, enabledBufferOptimization, cacheVersion,
      ]) => {
        let actualScrollSize = (this._isVertical ? this._container?.nativeElement.scrollTop ?? 0 : this._container?.nativeElement.scrollLeft) ?? 0;
        const { width, height } = bounds!,
          opts: IUpdateCollectionOptions<IVirtualListItem, IVirtualListCollection> = {
            bounds: { width, height }, dynamicSize, isVertical, itemSize,
            itemsOffset, scrollSize: actualScrollSize, snap, enabledBufferOptimization,
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

    combineLatest([this.$initialized, this.$itemRenderer]).pipe(
      takeUntil(this._$unsubscribe),
      distinctUntilChanged(),
      filter(([initialized]) => !!initialized),
      tap(([, itemRenderer]) => {
        this.resetRenderers(itemRenderer);
      })
    );
  }

  /** @internal */
  ngOnInit() {
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
        const comp = this._snapContainerRef.createComponent(NgVirtualListItemComponent);
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
        const comp = _listContainerRef.createComponent(NgVirtualListItemComponent);
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
  protected tracking() {
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

  protected scrollToExecutor(id: Id, behavior: ScrollBehavior, iteration: number = 0, isLastIteration = false) {
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
            itemsOffset: this.itemsOffset, scrollSize: (isVertical ? container.nativeElement.scrollTop : container.nativeElement.scrollLeft) + delta,
            snap: this.snap, fromItemId: id, enabledBufferOptimization: this.enabledBufferOptimization,
          },
          scrollSize = this._trackBox.getItemPosition(id, stickyMap, opts),
          params: ScrollToOptions = { [isVertical ? TOP_PROP_NAME : LEFT_PROP_NAME]: scrollSize, behavior };
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
        const index = items.findIndex(item => item.id === id), scrollSize = index * this.itemSize;
        const params: ScrollToOptions = { [this._isVertical ? TOP_PROP_NAME : LEFT_PROP_NAME]: scrollSize, behavior };
        container.nativeElement.scrollTo(params);
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
  override ngOnDestroy(): void {
    super.ngOnDestroy();
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
