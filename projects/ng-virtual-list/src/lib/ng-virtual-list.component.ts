import {
  AfterViewInit, ChangeDetectionStrategy, Component, ComponentRef, ElementRef, inject, input,
  OnDestroy, output, signal, TemplateRef, ViewChild, viewChild, ViewContainerRef, ViewEncapsulation,
  WritableSignal,
} from '@angular/core';
import { takeUntilDestroyed, toObservable } from '@angular/core/rxjs-interop';
import { BehaviorSubject, combineLatest, distinctUntilChanged, filter, map, Observable, of, switchMap, tap } from 'rxjs';
import { NgVirtualListItemComponent } from './components/ng-virtual-list-item.component';
import {
  BEHAVIOR_AUTO, BEHAVIOR_INSTANT, CLASS_LIST_HORIZONTAL, CLASS_LIST_VERTICAL, DEFAULT_DIRECTION, DEFAULT_DYNAMIC_SIZE,
  DEFAULT_ENABLED_BUFFER_OPTIMIZATION, DEFAULT_ITEM_SIZE, DEFAULT_ITEMS_OFFSET, DEFAULT_SNAP, HEIGHT_PROP_NAME, LEFT_PROP_NAME,
  MAX_SCROLL_TO_ITERATIONS, PX, SCROLL, SCROLL_END, TOP_PROP_NAME, TRACK_BY_PROPERTY_NAME, WIDTH_PROP_NAME,
} from './const';
import { IScrollEvent, IVirtualListCollection, IVirtualListItem, IVirtualListStickyMap } from './models';
import { Id, ISize } from './types';
import { IRenderVirtualListCollection } from './models/render-collection.model';
import { Direction, Directions } from './enums';
import { ScrollEvent, TrackBox, isDirection, toggleClassName } from './utils';
import { IGetItemPositionOptions, IUpdateCollectionOptions, TRACK_BOX_CHANGE_EVENT_NAME } from './utils/trackBox';

/**
 * Virtual list component.
 * Maximum performance for extremely large lists.
 * It is based on algorithms for virtualization of screen objects.
 * @link https://github.com/DjonnyX/ng-virtual-list/blob/17.x/projects/ng-virtual-list/src/lib/ng-virtual-list.component.ts
 * @author Evgenii Grebennikov
 * @email djonnyx@gmail.com
 */
@Component({
  selector: 'ng-virtual-list',
  standalone: false,
  templateUrl: './ng-virtual-list.component.html',
  styleUrl: './ng-virtual-list.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
  encapsulation: ViewEncapsulation.ShadowDom,
})
export class NgVirtualListComponent implements AfterViewInit, OnDestroy {
  private static __nextId: number = 0;

  private _id: number = NgVirtualListComponent.__nextId;
  /**
   * Readonly. Returns the unique identifier of the component.
   */
  get id() { return this._id; }

  @ViewChild('renderersContainer', { read: ViewContainerRef })
  protected _listContainerRef: ViewContainerRef | undefined;

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

  private _itemsOptions = {
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

  /**
   * Dictionary zIndex by id of the list element. If the value is not set or equal to 0,
   * then a simple element is displayed, if the value is greater than 0, then the sticky position mode is enabled for the element.
   */
  stickyMap = input<IVirtualListStickyMap>({});

  private _itemSizeOptions = {
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

  private _isVertical = this.getIsVertical();

  protected _displayComponents: Array<ComponentRef<NgVirtualListItemComponent>> = [];

  protected _bounds = signal<DOMRect | null>(null);

  protected _scrollSize = signal<number>(0);

  private _resizeObserver: ResizeObserver | null = null;

  private _onResizeHandler = () => {
    this._bounds.set(this._container()?.nativeElement?.getBoundingClientRect() ?? null);
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

  private _elementRef = inject(ElementRef<HTMLDivElement>);

  private _initialized!: WritableSignal<boolean>;

  readonly $initialized!: Observable<boolean>;

  /**
   * The name of the property by which tracking is performed
   */
  trackBy = input<string>(TRACK_BY_PROPERTY_NAME);

  /**
   * Dictionary of element sizes by their id
   */
  private _trackBox = new TrackBox(this.trackBy());

  private _onTrackBoxChangeHandler = (v: number) => {
    this._$cacheVersion.next(v);
  }

  private _$cacheVersion = new BehaviorSubject<number>(-1);
  get $cacheVersion() { return this._$cacheVersion.asObservable(); }

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
      $cacheVersion = this.$cacheVersion;

    $isVertical.pipe(
      takeUntilDestroyed(),
      tap(v => {
        this._isVertical = v;
        const el: HTMLElement = this._elementRef.nativeElement;
        toggleClassName(el, v ? CLASS_LIST_VERTICAL : CLASS_LIST_HORIZONTAL, true);
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
        const { width, height } = bounds as DOMRect;
        let actualScrollSize = (this._isVertical ? this._container()?.nativeElement.scrollTop ?? 0 : this._container()?.nativeElement.scrollLeft) ?? 0;
        const opts: IUpdateCollectionOptions<IVirtualListItem, IVirtualListCollection> = {
          bounds: { width, height }, dynamicSize, isVertical, itemSize,
          itemsOffset, scrollSize: scrollSize, snap, enabledBufferOptimization,
        };
        const { displayItems, totalSize } = this._trackBox.updateCollection(items, stickyMap, {
          ...opts, scrollSize: actualScrollSize,
        });

        this.resetBoundsSize(isVertical, totalSize);

        this.createDisplayComponentsIfNeed(displayItems);

        this.tracking();

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

    combineLatest([this.$initialized, toObservable(this.itemRenderer)]).pipe(
      takeUntilDestroyed(),
      distinctUntilChanged(),
      filter(([initialized]) => !!initialized),
      tap(([, itemRenderer]) => {
        this.resetRenderers(itemRenderer);
      })
    )
  }

  ngOnInit() {
    this._initialized.set(true);
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

  private getIsVertical(d?: Direction) {
    const dir = d || this.direction();
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

  private resetRenderers(itemRenderer?: TemplateRef<HTMLElement>) {
    const doMap: { [id: number]: number } = {};
    for (let i = 0, l = this._displayComponents.length; i < l; i++) {
      const item = this._displayComponents[i];
      item.instance.renderer = itemRenderer || this.itemRenderer();
      doMap[item.instance.id] = i;
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

  private _scrollToRepeatExecutionTimeout: any;

  private clearScrollToRepeatExecutionTimeout() {
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

        const { width, height } = this._bounds() || { width: 0, height: 0 },
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

          const notChanged = actualScrollSize === _scrollSize;

          if (!notChanged || iteration < MAX_SCROLL_TO_ITERATIONS) {
            this.clearScrollToRepeatExecutionTimeout();
            this._scrollToRepeatExecutionTimeout = setTimeout(() => {
              this.scrollToExecutor(id, BEHAVIOR_INSTANT, iteration + 1, notChanged);
            });
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

  private _onContainerScrollHandler = (e: Event) => {
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

  private _onContainerScrollEndHandler = (e: Event) => {
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

  ngAfterViewInit(): void {
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
    this.clearScrollToRepeatExecutionTimeout();

    if (this._trackBox) {
      this._trackBox.dispose();
    }

    const containerEl = this._container();
    if (containerEl) {
      containerEl.nativeElement.removeEventListener(SCROLL, this._onScrollHandler);
      containerEl.nativeElement.removeEventListener(SCROLL, this._onContainerScrollHandler);
      containerEl.nativeElement.removeEventListener(SCROLL_END, this._onContainerScrollEndHandler);

      if (this._componentsResizeObserver) {
        this._componentsResizeObserver.disconnect();
      }

      if (this._resizeObserver) {
        this._resizeObserver.disconnect();
      }
    }

    if (this._displayComponents) {
      while (this._displayComponents.length > 0) {
        const comp = this._displayComponents.pop();
        comp?.destroy();
      }
    }
  }
}
