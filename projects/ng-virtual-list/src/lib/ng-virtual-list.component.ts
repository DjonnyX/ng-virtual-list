import {
  AfterViewInit, ChangeDetectionStrategy, Component, ComponentRef, ElementRef, inject, input,
  OnDestroy, OnInit, output, signal, TemplateRef, ViewChild, viewChild, ViewContainerRef, ViewEncapsulation,
  WritableSignal,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { takeUntilDestroyed, toObservable } from '@angular/core/rxjs-interop';
import { combineLatest, distinctUntilChanged, filter, map, Observable, of, switchMap, tap } from 'rxjs';
import { NgVirtualListItemComponent } from './components/ng-virtual-list-item.component';
import {
  BEHAVIOR_AUTO, BEHAVIOR_INSTANT, CLASS_LIST_HORIZONTAL, CLASS_LIST_VERTICAL, DEFAULT_DIRECTION, DEFAULT_DYNAMIC_SIZE,
  DEFAULT_ENABLED_BUFFER_OPTIMIZATION, DEFAULT_ITEM_SIZE, DEFAULT_ITEMS_OFFSET, DEFAULT_LIST_SIZE, DEFAULT_SNAP, DEFAULT_SNAPPING_METHOD,
  HEIGHT_PROP_NAME, LEFT_PROP_NAME, MAX_SCROLL_TO_ITERATIONS, PX, SCROLL, SCROLL_END, TOP_PROP_NAME, TRACK_BY_PROPERTY_NAME, WIDTH_PROP_NAME,
} from './const';
import { BaseVirtualListItemComponent, Component$1, IScrollEvent, IVirtualListCollection, IVirtualListItem, IVirtualListStickyMap } from './models';
import { Id, ISize } from './types';
import { IRenderVirtualListCollection } from './models/render-collection.model';
import { Direction, Directions, SnappingMethod } from './enums';
import { ScrollEvent, TrackBox, isDirection, toggleClassName } from './utils';
import { IGetItemPositionOptions, IUpdateCollectionOptions, TRACK_BOX_CHANGE_EVENT_NAME } from './utils/trackBox';
import { isSnappingMethodAdvenced } from './utils/snapping-method';
import { FIREFOX_SCROLLBAR_OVERLAP_SIZE, IS_FIREFOX } from './utils/browser';

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
  changeDetection: ChangeDetectionStrategy.OnPush,
  encapsulation: ViewEncapsulation.ShadowDom,
})
export class NgVirtualListComponent implements AfterViewInit, OnInit, OnDestroy {
  protected static __nextId: number = 0;

  protected _id: number = NgVirtualListComponent.__nextId;
  /**
   * Readonly. Returns the unique identifier of the component.
   */
  get id() { return this._id; }

  @ViewChild('renderersContainer', { read: ViewContainerRef })
  protected _listContainerRef: ViewContainerRef | undefined;

  @ViewChild('snapRendererContainer', { read: ViewContainerRef })
  protected _snapContainerRef: ViewContainerRef | undefined;

  protected _snappedContainer = viewChild<ElementRef<HTMLDivElement>>('snapped');

  protected _container = viewChild<ElementRef<HTMLDivElement>>('container');

  protected _list = viewChild<ElementRef<HTMLUListElement>>('list');

  /**
   * Fires when the list has been scrolled.
   */
  onScroll = output<IScrollEvent>();

  /**
   * Fires when the list has completed scrolling.
   */
  onScrollEnd = output<IScrollEvent>();

  protected _itemsOptions = {
    transform: (v: IVirtualListCollection | undefined) => {
      this._trackBox.resetCollection(v, this.itemSize());
      return v;
    },
  } as any;

  /**
   * Collection of list items.
   */
  items = input.required<IVirtualListCollection>({
    ...this._itemsOptions,
  });

  /**
   * Determines whether elements will snap. Default value is "true".
   */
  snap = input<boolean>(DEFAULT_SNAP);

  /**
   * Experimental!
   * Enables buffer optimization.
   * Can only be used if items in the collection are not added or updated. Otherwise, artifacts in the form of twitching of the scroll area are possible.
   * Works only if the property dynamic = true
   */
  enabledBufferOptimization = input<boolean>(DEFAULT_ENABLED_BUFFER_OPTIMIZATION);

  /**
   * Rendering element template.
   */
  itemRenderer = input.required<TemplateRef<any>>();

  protected _itemRenderer = signal<TemplateRef<any> | undefined>(undefined);

  /**
   * Dictionary zIndex by id of the list element. If the value is not set or equal to 0,
   * then a simple element is displayed, if the value is greater than 0, then the sticky position mode is enabled for the element.
   */
  stickyMap = input<IVirtualListStickyMap>({});

  protected _itemSizeOptions = {
    transform: (v: number | undefined) => {
      if (v === undefined) {
        return DEFAULT_ITEM_SIZE;
      }
      const val = Number(v);
      return Number.isNaN(val) || val <= 0 ? DEFAULT_ITEM_SIZE : val;
    },
  } as any;

  /**
   * If direction = 'vertical', then the height of a typical element. If direction = 'horizontal', then the width of a typical element.
   * Ignored if the dynamicSize property is true.
   */
  itemSize = input<number>(DEFAULT_ITEM_SIZE, { ...this._itemSizeOptions });

  /**
   * If true then the items in the list can have different sizes and the itemSize property is ignored.
   * If false then the items in the list have a fixed size specified by the itemSize property. The default value is false.
   */
  dynamicSize = input(DEFAULT_DYNAMIC_SIZE);

  /**
   * Determines the direction in which elements are placed. Default value is "vertical".
   */
  direction = input<Direction>(DEFAULT_DIRECTION);

  /**
   * Number of elements outside the scope of visibility. Default value is 2.
   */
  itemsOffset = input<number>(DEFAULT_ITEMS_OFFSET);

  /**
   * Snapping method.
   * 'default' - Normal group rendering.
   * 'advanced' - The group is rendered on a transparent background. List items below the group are not rendered.
   */
  snappingMethod = input<SnappingMethod>(DEFAULT_SNAPPING_METHOD);

  protected _isSnappingMethodAdvanced: boolean = this.getIsSnappingMethodAdvanced();
  get isSnappingMethodAdvanced() { return this._isSnappingMethodAdvanced; }

  protected _isVertical = this.getIsVertical();

  protected _displayComponents: Array<ComponentRef<BaseVirtualListItemComponent>> = [];

  protected _snapedDisplayComponent: ComponentRef<BaseVirtualListItemComponent> | undefined;

  protected _bounds = signal<ISize | null>(null);

  protected _scrollSize = signal<number>(0);

  protected _resizeObserver: ResizeObserver | null = null;

  protected _resizeSnappedComponentHandler = () => {
    const list = this._list(), container = this._container(), snappedComponent = this._snapedDisplayComponent?.instance;
    if (list && container && snappedComponent) {
      const isVertical = this._isVertical, listBounds = list.nativeElement.getBoundingClientRect(), listElement = list?.nativeElement,
        { width: lWidth, height: lHeight } = listElement?.getBoundingClientRect() ?? { width: 0, height: 0 },
        { width, height } = this._bounds() ?? { width: 0, height: 0 },
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

  protected _resizeSnappedObserver: ResizeObserver | null = null;

  protected _componentsResizeObserver = new ResizeObserver(() => {
    this._trackBox.changes();
  });

  protected _onResizeHandler = () => {
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

  protected _onScrollHandler = (e?: Event) => {
    this.clearScrollToRepeatExecutionTimeout();

    const container = this._container()?.nativeElement;
    if (container) {
      const scrollSize = (this._isVertical ? container.scrollTop : container.scrollLeft),
        actualScrollSize = scrollSize;
      this._scrollSize.set(actualScrollSize);
    }
  }

  protected _elementRef = inject(ElementRef<HTMLDivElement>);

  protected _initialized!: WritableSignal<boolean>;

  readonly $initialized!: Observable<boolean>;

  /**
   * The name of the property by which tracking is performed
   */
  trackBy = input<string>(TRACK_BY_PROPERTY_NAME);

  /**
   * Base class of the element component
   */
  protected _itemComponentClass: Component$1<BaseVirtualListItemComponent> = NgVirtualListItemComponent;

  /**
   * Base class trackBox
   */
  protected _trackBoxClass: Component$1<TrackBox> = TrackBox;

  /**
   * Dictionary of element sizes by their id
   */
  protected _trackBox: TrackBox = new this._trackBoxClass(this.trackBy());

  protected _onTrackBoxChangeHandler = (v: number) => {
    this._cacheVersion.set(v);
  }

  protected _cacheVersion = signal<number>(-1);

  constructor() {
    NgVirtualListComponent.__nextId = NgVirtualListComponent.__nextId + 1 === Number.MAX_SAFE_INTEGER
      ? 0 : NgVirtualListComponent.__nextId + 1;
    this._id = NgVirtualListComponent.__nextId;

    this._initialized = signal<boolean>(false);
    this.$initialized = toObservable(this._initialized);

    this._trackBox.displayComponents = this._displayComponents;

    const $trackBy = toObservable(this.trackBy);

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
      $itemsOffset = toObservable(this.itemsOffset).pipe(
        map(v => v < 0 ? DEFAULT_ITEMS_OFFSET : v),
      ),
      $stickyMap = toObservable(this.stickyMap).pipe(
        map(v => !v ? {} : v),
      ),
      $snap = toObservable(this.snap),
      $isVertical = toObservable(this.direction).pipe(
        map(v => this.getIsVertical(v || DEFAULT_DIRECTION)),
      ),
      $dynamicSize = toObservable(this.dynamicSize),
      $enabledBufferOptimization = toObservable(this.enabledBufferOptimization),
      $snappingMethod = toObservable(this.snappingMethod).pipe(
        map(v => this.getIsSnappingMethodAdvanced(v || DEFAULT_SNAPPING_METHOD)),
      ),
      $cacheVersion = toObservable(this._cacheVersion);

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
      $itemsOffset, $snap, $isVertical, $dynamicSize, $enabledBufferOptimization, $cacheVersion,
    ]).pipe(
      takeUntilDestroyed(),
      distinctUntilChanged(),
      filter(([initialized]) => !!initialized),
      switchMap(([,
        bounds, items, stickyMap, scrollSize, itemSize,
        itemsOffset, snap, isVertical, dynamicSize, enabledBufferOptimization, cacheVersion,
      ]) => {
        let actualScrollSize = (this._isVertical ? this._container()?.nativeElement.scrollTop ?? 0 : this._container()?.nativeElement.scrollLeft) ?? 0;
        const { width, height } = bounds,
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

    this.setupRenderer();
  }

  protected setupRenderer() {
    const $itemRenderer = toObservable(this.itemRenderer);

    $itemRenderer.pipe(
      takeUntilDestroyed(),
      distinctUntilChanged(),
      filter(v => !!v),
      tap(v => {
        this._itemRenderer.set(v);
      }),
    ).subscribe();
  }

  /** @internal */
  ngOnInit() {
    this.onInit();
  }

  protected onInit() {
    this._initialized.set(true);
  }

  protected listenCacheChangesIfNeed(value: boolean) {
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

  protected getIsSnappingMethodAdvanced(m?: SnappingMethod) {
    const method = m || this.snappingMethod();
    return isSnappingMethodAdvenced(method);
  }

  protected getIsVertical(d?: Direction) {
    const dir = d || this.direction();
    return isDirection(dir, Directions.VERTICAL);
  }

  protected createDisplayComponentsIfNeed(displayItems: IRenderVirtualListCollection | null) {
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

  protected updateRegularRenderer() {
    this._resizeSnappedComponentHandler();
  }

  protected resetRenderers(itemRenderer?: TemplateRef<HTMLElement>) {
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
  protected tracking() {
    this._trackBox.track();
  }

  protected resetBoundsSize(isVertical: boolean, totalSize: number) {
    const l = this._list();
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
  scrollTo(id: Id, behavior: ScrollBehavior = BEHAVIOR_AUTO) {
    this.scrollToExecutor(id, behavior);
  }

  protected _scrollToRepeatExecutionTimeout: number | undefined;

  protected clearScrollToRepeatExecutionTimeout() {
    clearTimeout(this._scrollToRepeatExecutionTimeout);
  }

  protected scrollToExecutor(id: Id, behavior: ScrollBehavior, iteration: number = 0, isLastIteration = false) {
    const items = this.items();
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
          stickyMap = this.stickyMap(), items = this.items(), isVertical = this._isVertical, delta = this._trackBox.delta,
          opts: IGetItemPositionOptions<IVirtualListItem, IVirtualListCollection> = {
            bounds: { width, height }, collection: items, dynamicSize, isVertical: this._isVertical, itemSize,
            itemsOffset: this.itemsOffset(), scrollSize: (isVertical ? container.nativeElement.scrollTop : container.nativeElement.scrollLeft) + delta,
            snap: this.snap(), fromItemId: id, enabledBufferOptimization: this.enabledBufferOptimization(),
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
        const index = items.findIndex(item => item.id === id), scrollSize = index * this.itemSize();
        const params: ScrollToOptions = { [this._isVertical ? TOP_PROP_NAME : LEFT_PROP_NAME]: scrollSize, behavior };
        container.nativeElement.scrollTo(params);
      }
    }
  }

  /**
   * Scrolls the scroll area to the desired element with the specified ID.
   */
  scrollToEnd(behavior: ScrollBehavior = BEHAVIOR_INSTANT) {
    const items = this.items(), latItem = items[items.length > 0 ? items.length - 1 : 0];
    this.scrollTo(latItem.id, behavior);
  }

  protected _onContainerScrollHandler = (e: Event) => {
    const containerEl = this._container();
    if (containerEl) {
      const scrollSize = (this._isVertical ? containerEl.nativeElement.scrollTop : containerEl.nativeElement.scrollLeft);
      this._trackBox.deltaDirection = this._scrollSize() > scrollSize ? -1 : this._scrollSize() < scrollSize ? 1 : 0;

      const event = new ScrollEvent({
        direction: this._trackBox.scrollDirection, container: containerEl.nativeElement,
        list: this._list()!.nativeElement, delta: this._trackBox.delta,
        scrollDelta: this._trackBox.scrollDelta, isVertical: this._isVertical,
      });

      this.onScroll.emit(event);
    }
  }

  protected _onContainerScrollEndHandler = (e: Event) => {
    const containerEl = this._container();
    if (containerEl) {
      const scrollSize = (this._isVertical ? containerEl.nativeElement.scrollTop : containerEl.nativeElement.scrollLeft);
      this._trackBox.deltaDirection = this._scrollSize() > scrollSize ? -1 : 0;

      const event = new ScrollEvent({
        direction: this._trackBox.scrollDirection, container: containerEl.nativeElement,
        list: this._list()!.nativeElement, delta: this._trackBox.delta,
        scrollDelta: this._trackBox.scrollDelta, isVertical: this._isVertical,
      });

      this.onScrollEnd.emit(event);
    }
  }

  /** @internal */
  ngAfterViewInit(): void {
    this.afterViewInit();
  }

  protected afterViewInit() {
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

  /** @internal */
  ngOnDestroy(): void {
    this.dispose();
  }

  protected dispose() {
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
