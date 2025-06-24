import {
  AfterViewInit, ChangeDetectionStrategy, ChangeDetectorRef, Component, ComponentRef, ElementRef, EventEmitter,
  Input, OnDestroy, Output, TemplateRef, ViewChild, ViewContainerRef, ViewEncapsulation,
} from '@angular/core';
import { BehaviorSubject, combineLatest, debounceTime, distinctUntilChanged, filter, map, Observable, of, switchMap, takeUntil, tap } from 'rxjs';
import { NgVirtualListItemComponent } from './components/ng-virtual-list-item.component';
import {
  BEHAVIOR_AUTO, BEHAVIOR_INSTANT, CLASS_LIST_HORIZONTAL, CLASS_LIST_VERTICAL, DEFAULT_DIRECTION, DEFAULT_DYNAMIC_SIZE, DEFAULT_ITEM_SIZE,
  DEFAULT_ITEMS_OFFSET, DEFAULT_SNAP, DEFAULT_SNAP_TO_ITEM, HEIGHT_PROP_NAME, LEFT_PROP_NAME, PX, SCROLL, SCROLL_END, TOP_PROP_NAME,
  TRACK_BY_PROPERTY_NAME, WIDTH_PROP_NAME,
} from './const';
import { IVirtualListCollection, IVirtualListItem, IVirtualListStickyMap } from './models';
import { Id } from './types';
import { IRenderVirtualListCollection } from './models/render-collection.model';
import { Direction, Directions } from './enums';
import { DisposableComponent, TrackBox, isDirection, toggleClassName } from './utils';
import { IRecalculateMetricsOptions, ScrollDirection, TRACK_BOX_CHANGE_EVENT_NAME } from './utils/trackBox';

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
export class NgVirtualListComponent extends DisposableComponent implements AfterViewInit, OnDestroy {
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

  /**
   * Fires when the list has been scrolled.
   */
  @Output()
  onScroll = new EventEmitter<number>();

  /**
   * Fires when the list has completed scrolling.
   */
  @Output()
  onScrollEnd = new EventEmitter<number>();

  private _$items = new BehaviorSubject<IVirtualListCollection | undefined>(undefined);
  readonly $items = this._$items.asObservable();

  /**
   * Collection of list items.
   */
  @Input()
  set items(v: IVirtualListCollection) {
    if (this._$items.getValue() === v) {
      return;
    }

    this._$items.next(v);

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

  private _$snapToItem = new BehaviorSubject<boolean>(DEFAULT_SNAP_TO_ITEM);
  readonly $snapToItem = this._$snapToItem.asObservable();

  /**
   * Determines whether scroll positions will be snapped to the element. Default value is "false".
   */
  @Input()
  set snapToItem(v: boolean) {
    if (this._$snapToItem.getValue() === v) {
      return;
    }

    this._$snapToItem.next(v);

    this._cdr.markForCheck();
  };
  get snapToItem() { return this._$snapToItem.getValue(); }

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

  private _scrollToTimeout: any;

  private _isVertical = this.getIsVertical();

  protected _displayComponents: Array<ComponentRef<NgVirtualListItemComponent>> = [];

  protected _$bounds = new BehaviorSubject<DOMRect | null>(null);

  protected _$scrollSize = new BehaviorSubject<number>(0);

  private _resizeObserver: ResizeObserver | null = null;

  /**
   * only dynamic
   */
  private _$scrolledItemId = new BehaviorSubject<Id | undefined>(undefined);

  private _onResizeHandler = () => {
    this._$bounds.next(this._container?.nativeElement?.getBoundingClientRect() ?? null);
  }

  private _scrollDirection: ScrollDirection = 0;

  private _onScrollHandler = (e?: Event) => {
    this._$scrolledItemId.next(undefined);

    const container = this._container?.nativeElement;
    if (container) {
      const dynamicSize = this.dynamicSize, delta = this._trackBox.delta, scrollSize = (this._isVertical ? container.scrollTop : container.scrollLeft),
        previouseScrollSize = this._$scrollSize.getValue();
      let actualScrollSize = scrollSize;

      this._scrollDirection = previouseScrollSize > scrollSize ? -1 : 1;

      if (dynamicSize && delta !== 0) {
        actualScrollSize = scrollSize + delta;
        const params: ScrollToOptions = {
          [this._isVertical ? TOP_PROP_NAME : LEFT_PROP_NAME]: actualScrollSize,
          behavior: BEHAVIOR_INSTANT as ScrollBehavior
        };

        const container = this._container;
        if (container) {
          this.scrollImmediately(container, params);

          this._trackBox.clearDelta();
        }
      }

      this._$scrollSize.next(actualScrollSize);

      this.onScroll.emit(actualScrollSize);
    }
  }

  private scrollImmediately(container: ElementRef<HTMLDivElement>, params: ScrollOptions) {
    this.clearScrollImmediately();

    container.nativeElement.removeEventListener(SCROLL_END, this._onScrollEndHandler);
    const handler = () => {
      if (container) {
        container.nativeElement.removeEventListener(SCROLL_END, handler);

        container.nativeElement.scroll(params);

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

    const container = this._container;
    if (container) {
      container.nativeElement.removeEventListener(SCROLL_END, this._scrollImmediatelyHandler);
    }
  }

  private _onScrollEndHandler = (e?: Event, fireEvent: boolean = true) => {
    const container = this._container;
    if (container) {
      const itemSize = this.itemSize, snapToItem = this.snapToItem, dynamicSize = this.dynamicSize, delta = this._trackBox.delta,
        scrollSize = (this._isVertical ? container.nativeElement.scrollTop : container.nativeElement.scrollLeft);
      let actualScrollSize = scrollSize;
      if (dynamicSize && delta !== 0) {
        actualScrollSize = scrollSize + delta;
        if (scrollSize !== actualScrollSize) {
          const params: ScrollToOptions = {
            [this._isVertical ? TOP_PROP_NAME : LEFT_PROP_NAME]: actualScrollSize,
            behavior: BEHAVIOR_INSTANT as ScrollBehavior
          };

          this._trackBox.clearDelta();

          this._$scrollSize.next(actualScrollSize);

          container.nativeElement.scroll(params);
          return;
        }
      } else {
        const scrollItems = Math.round(scrollSize / itemSize);
        actualScrollSize = snapToItem ? scrollItems * itemSize : scrollSize;

        if (scrollSize !== actualScrollSize) {
          const params: ScrollToOptions = {
            [this._isVertical ? TOP_PROP_NAME : LEFT_PROP_NAME]: actualScrollSize,
            behavior: BEHAVIOR_INSTANT as ScrollBehavior
          };

          container.nativeElement.scroll(params);
        }
      }

      this._$scrollSize.next(actualScrollSize);

      if (fireEvent) {
        this.onScrollEnd.emit(actualScrollSize);
      }
    }
  }

  private _$initialized = new BehaviorSubject<boolean>(false);

  readonly $initialized: Observable<boolean>;

  /**
   * Dictionary of element sizes by their id
   */
  private _trackBox = new TrackBox(TRACK_BY_PROPERTY_NAME);

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
      $cacheVersion = this.$cacheVersion,
      $scrolledItemId = this._$scrolledItemId.asObservable();

    $isVertical.pipe(
      takeUntil(this._$unsubscribe),
      tap(v => {
        this._isVertical = v;
        const el: HTMLElement = this._elementRef.nativeElement;
        toggleClassName(el, v ? CLASS_LIST_VERTICAL : CLASS_LIST_HORIZONTAL, true);
      }),
    ).subscribe();

    $dynamicSize.pipe(
      takeUntil(this._$unsubscribe),
      tap(dynamicSize => {
        this.listenCacheChangesIfNeed(dynamicSize);
      })
    ).subscribe();

    combineLatest([this.$initialized, $scrolledItemId, $bounds, $items, $stickyMap, $scrollSize, $itemSize,
      $itemsOffset, $snap, $isVertical, $dynamicSize, $cacheVersion,
    ]).pipe(
      takeUntil(this._$unsubscribe),
      distinctUntilChanged(),
      debounceTime(0),
      filter(([initialized]) => !!initialized),
      switchMap(([, scrolledItemId,
        bounds, items, stickyMap, scrollSize, itemSize,
        itemsOffset, snap, isVertical, dynamicSize, cacheVersion,
      ]) => {
        const { width, height } = bounds as DOMRect;
        let actualScrollSize = scrollSize;
        const opts: IRecalculateMetricsOptions<IVirtualListItem, IVirtualListCollection> = {
          bounds: { width, height }, collection: items, dynamicSize, isVertical, itemSize,
          itemsOffset, scrollSize: scrollSize, snap, fromItemId: scrolledItemId,
        };
        if (dynamicSize && scrolledItemId !== undefined) {
          const scrollSize = this._trackBox.getItemPosition(scrolledItemId, stickyMap, { ...opts, scrollSize: actualScrollSize });
          actualScrollSize = scrollSize;

          this._$scrollSize.next(actualScrollSize);
        }

        const scrollDirection = this._scrollDirection,
          { displayItems, totalSize } = this._trackBox.updateCollection(items, stickyMap, {
            ...opts, scrollSize: actualScrollSize, scrollDirection
          });

        this.resetBoundsSize(isVertical, totalSize);

        this.createDisplayComponentsIfNeed(displayItems);

        this.tracking();

        if (dynamicSize && scrolledItemId !== undefined) {
          const container = this._container;
          if (container) {
            const params: ScrollToOptions = { [this._isVertical ? TOP_PROP_NAME : LEFT_PROP_NAME]: scrollSize, behavior: BEHAVIOR_AUTO };

            this.scrollImmediately(container, params);
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
    )
  }

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

  private getIsVertical(d?: Direction) {
    const dir = d || this.direction;
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
      item.instance.renderer = itemRenderer || this.itemRenderer;
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
    const l = this._list;
    if (l) {
      l.nativeElement.style[isVertical ? HEIGHT_PROP_NAME : WIDTH_PROP_NAME] = `${totalSize}${PX}`;
    }
  }

  /**
   * The method scrolls the list to the element with the given id and returns the value of the scrolled area.
   * Behavior accepts the values ​​"auto", "instant" and "smooth".
   */
  scrollTo(id: Id, behavior: ScrollBehavior = BEHAVIOR_AUTO) {
    const items = this.items;
    if (!items || !items.length) {
      return;
    }

    const dynamicSize = this.dynamicSize, container = this._container, itemSize = this.itemSize;
    if (container) {
      if (dynamicSize) {
        if (container) {
          container.nativeElement.removeEventListener(SCROLL, this._onScrollHandler);
          container.nativeElement.removeEventListener(SCROLL_END, this._onScrollEndHandler);
        }

        const { width, height } = this._$bounds.getValue() || { width: 0, height: 0 },
          stickyMap = this.stickyMap, items = this.items,
          opts: IRecalculateMetricsOptions<IVirtualListItem, IVirtualListCollection> = {
            bounds: { width, height }, collection: items, dynamicSize, isVertical: this._isVertical, itemSize,
            itemsOffset: this.itemsOffset, scrollSize: this._isVertical ? container.nativeElement.scrollTop : container.nativeElement.scrollLeft,
            snap: this.snap, fromItemId: id,
          },
          scrollSize = this._trackBox.getItemPosition(id, stickyMap, opts),
          params: ScrollToOptions = { [this._isVertical ? TOP_PROP_NAME : LEFT_PROP_NAME]: scrollSize, behavior };

        this._$scrolledItemId.next(id);

        this._$scrollSize.next(scrollSize);

        if (container) {
          const handler = () => {
            if (container) {
              container.nativeElement.removeEventListener(SCROLL_END, handler);
              clearTimeout(this._scrollToTimeout);
              this._scrollToTimeout = setTimeout(() => {
                container.nativeElement.addEventListener(SCROLL, this._onScrollHandler);
                container.nativeElement.addEventListener(SCROLL_END, this._onScrollEndHandler);
              }, 100);

              this.listenCacheChangesIfNeed(dynamicSize);

              this.onScroll.emit(scrollSize);
            }
          }
          container.nativeElement.addEventListener(SCROLL_END, handler);
        }

        container.nativeElement.scroll(params);
      } else {
        const index = items.findIndex(item => item.id === id), scrollSize = index * this.itemSize;
        const params: ScrollToOptions = { [this._isVertical ? TOP_PROP_NAME : LEFT_PROP_NAME]: scrollSize, behavior };
        container.nativeElement.scroll(params);
      }
    }
  }

  scrollToEnd(behavior: ScrollBehavior = BEHAVIOR_INSTANT as ScrollBehavior) {
    const items = this.items, latItem = items[items.length > 0 ? items.length - 1 : 0];
    this.scrollTo(latItem.id, behavior);
  }

  ngAfterViewInit(): void {
    const containerEl = this._container;
    if (containerEl) {
      containerEl.nativeElement.addEventListener(SCROLL, this._onScrollHandler);
      containerEl.nativeElement.addEventListener(SCROLL_END, this._onScrollEndHandler);

      this._resizeObserver = new ResizeObserver(this._onResizeHandler);
      this._resizeObserver.observe(containerEl.nativeElement);

      this._onResizeHandler();
    }
  }

  override ngOnDestroy(): void {
    super.ngOnDestroy();

    if (this._scrollToTimeout) {
      clearTimeout(this._scrollToTimeout);
    }

    if (this._trackBox) {
      this._trackBox.dispose();
    }

    const containerEl = this._container;
    if (containerEl) {
      containerEl.nativeElement.removeEventListener(SCROLL, this._onScrollHandler);
      containerEl.nativeElement.removeEventListener(SCROLL_END, this._onScrollEndHandler);

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
