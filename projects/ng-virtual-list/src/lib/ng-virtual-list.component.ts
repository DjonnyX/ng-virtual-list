import {
  AfterViewInit, ChangeDetectionStrategy, Component, ComponentRef, ElementRef, inject, input,
  OnDestroy, output, signal, TemplateRef, ViewChild, viewChild, ViewContainerRef, ViewEncapsulation,
  WritableSignal,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { takeUntilDestroyed, toObservable } from '@angular/core/rxjs-interop';
import { BehaviorSubject, combineLatest, distinctUntilChanged, filter, map, Observable, of, switchMap, tap } from 'rxjs';
import { NgVirtualListItemComponent } from './components/ng-virtual-list-item.component';
import {
  BEHAVIOR_AUTO, BEHAVIOR_INSTANT, CLASS_LIST_HORIZONTAL, CLASS_LIST_VERTICAL, DEFAULT_DIRECTION, DEFAULT_DYNAMIC_SIZE, DEFAULT_ENABLED_BUFFER_OPTIMIZATION, DEFAULT_ITEM_SIZE,
  DEFAULT_ITEMS_OFFSET, DEFAULT_SNAP, DEFAULT_SNAP_TO_ITEM, HEIGHT_PROP_NAME, LEFT_PROP_NAME, MAX_SCROLL_TO_ITERATIONS, PX, SCROLL, SCROLL_END, TOP_PROP_NAME,
  TRACK_BY_PROPERTY_NAME, WIDTH_PROP_NAME,
} from './const';
import { IScrollEvent, IVirtualListCollection, IVirtualListItem, IVirtualListStickyMap } from './models';
import { Id, IRect } from './types';
import { IRenderVirtualListCollection } from './models/render-collection.model';
import { Direction, Directions } from './enums';
import { ScrollEvent, TrackBox, isDirection, toggleClassName } from './utils';
import { IRecalculateMetricsOptions, TRACK_BOX_CHANGE_EVENT_NAME } from './utils/trackBox';

/**
 * Virtual list component.
 * Maximum performance for extremely large lists.
 * It is based on algorithms for virtualization of screen objects.
 * @link https://github.com/DjonnyX/ng-virtual-list/blob/19.x/projects/ng-virtual-list/src/lib/ng-virtual-list.component.ts
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
      this._trackBox.resetCollection(v);
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
   * Determines whether scroll positions will be snapped to the element. Default value is "false".
   */
  snapToItem = input<boolean>(DEFAULT_SNAP_TO_ITEM);

  /**
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
      const dynamicSize = this.dynamicSize(), delta = this._trackBox.delta, scrollSize = (this._isVertical ? container.scrollTop : container.scrollLeft);
      let actualScrollSize = scrollSize, isImmediateScroll = false;

      if (dynamicSize && delta !== 0) {
        actualScrollSize = scrollSize + delta;
        const params: ScrollToOptions = {
          [this._isVertical ? TOP_PROP_NAME : LEFT_PROP_NAME]: actualScrollSize,
          behavior: BEHAVIOR_INSTANT
        };

        const container = this._container();
        if (container) {
          isImmediateScroll = true;

          this.scrollImmediately(container, params, () => {
            const event = new ScrollEvent(this._trackBox.scrollDirection, container.nativeElement, this._list()!.nativeElement, delta, this._trackBox.scrollDelta, this._isVertical);
            this.onScroll.emit(event);
          });

          this._trackBox.clearDelta();
        }
      }

      this._scrollSize.set(actualScrollSize);

      if (!isImmediateScroll) {
        const event = new ScrollEvent(this._trackBox.scrollDirection, container, this._list()!.nativeElement, delta, this._trackBox.scrollDelta, this._isVertical);
        this.onScroll.emit(event);
      }
    }
  }

  private scrollImmediately(container: ElementRef<HTMLDivElement>, params: ScrollOptions, cb?: () => void) {
    this.clearScrollImmediately();

    container.nativeElement.removeEventListener(SCROLL_END, this._onScrollEndHandler);
    const handler = () => {
      if (container) {
        container.nativeElement.removeEventListener(SCROLL_END, handler);

        container.nativeElement.scroll(params);

        if (cb !== undefined) {
          cb();
        }

        container.nativeElement.addEventListener(SCROLL_END, this._onScrollEndHandler);
      }
    }
    container.nativeElement.addEventListener(SCROLL_END, handler);

    container.nativeElement.scroll(params);

    this._scrollImmediatelyHandler = handler;
  }

  private _scrollImmediatelyHandler: ((...args: Array<any>) => void) | undefined = undefined;

  private clearScrollImmediately() {
    if (this._scrollImmediatelyHandler === undefined) {
      return;
    }

    const container = this._container();
    if (container) {
      container.nativeElement.removeEventListener(SCROLL_END, this._scrollImmediatelyHandler);
    }
  }

  private _onScrollEndHandler = (e: Event) => {
    const container = this._container();
    if (container) {
      this._trackBox.clearDelta();
      this._trackBox.clearDeltaDirection();

      const itemSize = this.itemSize(), snapToItem = this.snapToItem(), dynamicSize = this.dynamicSize(), delta = this._trackBox.delta,
        scrollSize = (this._isVertical ? container.nativeElement.scrollTop : container.nativeElement.scrollLeft);
      let actualScrollSize = scrollSize;
      const event = new ScrollEvent(this._trackBox.scrollDirection, container.nativeElement, this._list()!.nativeElement, delta, this._trackBox.scrollDelta, this._isVertical);
      if (dynamicSize) {
        actualScrollSize = scrollSize + delta;
        if (snapToItem) {
          const items = this.items(),
            isVertical = this._isVertical,
            targetItem = this._trackBox.getNearestItem(actualScrollSize, items, itemSize, isVertical);
          if (targetItem) {
            this.scrollTo(targetItem.id, BEHAVIOR_INSTANT);
          }
        } else if (scrollSize !== actualScrollSize) {
          const params: ScrollToOptions = {
            [this._isVertical ? TOP_PROP_NAME : LEFT_PROP_NAME]: actualScrollSize,
            behavior: BEHAVIOR_INSTANT
          };

          this._scrollSize.set(actualScrollSize);

          container.nativeElement.scroll(params);
          return;
        }
      } else {
        const scrollItems = Math.round(scrollSize / itemSize);
        actualScrollSize = snapToItem ? scrollItems * itemSize : scrollSize;

        if (scrollSize !== actualScrollSize) {
          const params: ScrollToOptions = {
            [this._isVertical ? TOP_PROP_NAME : LEFT_PROP_NAME]: actualScrollSize,
            behavior: BEHAVIOR_INSTANT
          };

          container.nativeElement.scroll(params);
        }
      }

      this._scrollSize.set(actualScrollSize);

      this.onScrollEnd.emit(event);
    }
  }

  private _elementRef = inject(ElementRef<HTMLDivElement>);

  private _initialized!: WritableSignal<boolean>;

  readonly $initialized!: Observable<boolean>;

  /**
   * Dictionary of element sizes by their id
   */
  private _trackBox = new TrackBox(TRACK_BY_PROPERTY_NAME);

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

    const $enabledBufferOptimization = toObservable(this.enabledBufferOptimization);

    $enabledBufferOptimization.pipe(
      tap(v => {
        this._trackBox.enabledBufferOptimization = v;
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
      $itemsOffset, $snap, $isVertical, $dynamicSize, $cacheVersion,
    ]).pipe(
      takeUntilDestroyed(),
      distinctUntilChanged(),
      filter(([initialized]) => !!initialized),
      switchMap(([,
        bounds, items, stickyMap, scrollSize, itemSize,
        itemsOffset, snap, isVertical, dynamicSize, cacheVersion,
      ]) => {
        const { width, height } = bounds;
        let actualScrollSize = scrollSize;
        const opts: IRecalculateMetricsOptions<IVirtualListItem, IVirtualListCollection> = {
          bounds: { width, height }, collection: items, dynamicSize, isVertical, itemSize,
          itemsOffset, scrollSize: scrollSize, snap,
        };
        const { displayItems, totalSize } = this._trackBox.updateCollection(items, stickyMap, {
          ...opts, scrollSize: actualScrollSize,
        });

        this.resetBoundsSize(isVertical, totalSize);

        this.createDisplayComponentsIfNeed(displayItems);

        this.tracking();

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

  private createDisplayComponentsIfNeed(displayItems: IRenderVirtualListCollection | null) {
    if (!displayItems || !this._listContainerRef) {
      this._trackBox.setDisplayObjectIndexMapById({});
      return;
    }

    this._trackBox.items = displayItems;

    const _listContainerRef = this._listContainerRef;

    while (this._displayComponents.length < displayItems.length) {
      if (_listContainerRef) {
        const comp = _listContainerRef.createComponent(NgVirtualListItemComponent);
        this._displayComponents.push(comp);
      }
    }

    const maxLength = displayItems.length;
    while (this._displayComponents.length > maxLength) {
      const comp = this._displayComponents.pop();
      comp?.destroy();
      const id = comp?.instance.item?.id;
      if (id !== undefined) {
        this._trackBox.untrackComponentByIdProperty(comp?.instance);
      }
    }

    this.resetRenderers();
  }

  private resetRenderers(itemRenderer?: TemplateRef<any>) {
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
  getItemBounds(id: Id): IRect | undefined {
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

  protected scrollToExecutor(id: Id, behavior: ScrollBehavior, iteration: number = 0) {
    this.clearScrollToRepeatExecutionTimeout();
    const items = this.items();
    if (!items || !items.length) {
      return;
    }

    const dynamicSize = this.dynamicSize(), container = this._container(), itemSize = this.itemSize();
    if (container) {
      if (dynamicSize) {
        if (container) {
          container.nativeElement.removeEventListener(SCROLL, this._onScrollHandler);
          container.nativeElement.removeEventListener(SCROLL_END, this._onScrollEndHandler);
        }

        const { width, height } = this._bounds() || { width: 0, height: 0 },
          stickyMap = this.stickyMap(), items = this.items(), isVertical = this._isVertical,
          opts: IRecalculateMetricsOptions<IVirtualListItem, IVirtualListCollection> = {
            bounds: { width, height }, collection: items, dynamicSize, isVertical: this._isVertical, itemSize,
            itemsOffset: this.itemsOffset(), scrollSize: isVertical ? container.nativeElement.scrollTop : container.nativeElement.scrollLeft,
            snap: this.snap(), fromItemId: id,
          },
          scrollSize = this._trackBox.getItemPosition(id, stickyMap, opts),
          params: ScrollToOptions = { [isVertical ? TOP_PROP_NAME : LEFT_PROP_NAME]: scrollSize, behavior };

        this._scrollSize.set(scrollSize);

        if (container) {
          const handler = () => {
            if (container) {
              container.nativeElement.removeEventListener(SCROLL_END, handler);

              const { displayItems, totalSize } = this._trackBox.updateCollection(items, stickyMap, {
                ...opts, scrollSize, fromItemId: id,
              });

              this.resetBoundsSize(isVertical, totalSize);

              this.createDisplayComponentsIfNeed(displayItems);

              this.tracking();

              const _scrollSize = this._trackBox.getItemPosition(id, stickyMap, { ...opts, scrollSize, fromItemId: id });

              if (scrollSize < _scrollSize && iteration < MAX_SCROLL_TO_ITERATIONS) {
                this.clearScrollToRepeatExecutionTimeout();
                this._scrollToRepeatExecutionTimeout = setTimeout(() => {
                  this.scrollToExecutor(id, BEHAVIOR_INSTANT, iteration + 1);
                });
              } else {
                this._scrollSize.set(scrollSize);

                const event = new ScrollEvent(this._trackBox.scrollDirection, container.nativeElement, this._list()!.nativeElement, this._trackBox.delta, this._trackBox.scrollDelta, this._isVertical);
                this.onScroll.emit(event);

                container.nativeElement.addEventListener(SCROLL, this._onScrollHandler);
                container.nativeElement.addEventListener(SCROLL_END, this._onScrollEndHandler);
              }
            }
          }
          container.nativeElement.addEventListener(SCROLL_END, handler);
        }

        container.nativeElement.scroll(params);
      } else {
        const index = items.findIndex(item => item.id === id), scrollSize = index * this.itemSize();
        const params: ScrollToOptions = { [this._isVertical ? TOP_PROP_NAME : LEFT_PROP_NAME]: scrollSize, behavior };
        container.nativeElement.scroll(params);
      }
    }
  }

  scrollToEnd(behavior: ScrollBehavior = BEHAVIOR_INSTANT) {
    const items = this.items(), latItem = items[items.length > 0 ? items.length - 1 : 0];
    this.scrollTo(latItem.id, behavior);
  }

  private _onContainerScrollHandler = (e: Event) => {
    const containerEl = this._container();
    if (containerEl) {
      const scrollSize = (this._isVertical ? containerEl.nativeElement.scrollTop : containerEl.nativeElement.scrollLeft),
        offsetSize = (this._isVertical ? containerEl.nativeElement.offsetHeight : containerEl.nativeElement.offsetWidth),
        listSize = (this._isVertical ? this._list()?.nativeElement.offsetHeight ?? 0 : this._list()?.nativeElement.offsetLeft ?? 0);
      this._trackBox.deltaDirection = this._scrollSize() >= scrollSize || (scrollSize + offsetSize) >= listSize ? -1 : 1;
    }
  }

  private _onContainerScrollEndHandler = (e: Event) => {
    this._trackBox.deltaDirection = -1;
  }

  ngAfterViewInit(): void {
    const containerEl = this._container();
    if (containerEl) {
      // for direction calculation
      containerEl.nativeElement.addEventListener(SCROLL, this._onContainerScrollHandler);
      containerEl.nativeElement.addEventListener(SCROLL_END, this._onContainerScrollEndHandler);

      containerEl.nativeElement.addEventListener(SCROLL, this._onScrollHandler);
      containerEl.nativeElement.addEventListener(SCROLL_END, this._onScrollEndHandler);

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
      containerEl.nativeElement.removeEventListener(SCROLL_END, this._onScrollEndHandler);
      containerEl.nativeElement.removeEventListener(SCROLL, this._onContainerScrollHandler);
      containerEl.nativeElement.removeEventListener(SCROLL_END, this._onContainerScrollEndHandler);

      if (this._resizeObserver) {
        this._resizeObserver.unobserve(containerEl.nativeElement);
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
