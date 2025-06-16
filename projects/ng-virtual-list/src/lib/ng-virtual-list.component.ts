import {
  AfterViewInit, ChangeDetectionStrategy, Component, ComponentRef, ElementRef, inject, input,
  OnDestroy, output, signal, TemplateRef, ViewChild, viewChild, ViewContainerRef, ViewEncapsulation,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { takeUntilDestroyed, toObservable } from '@angular/core/rxjs-interop';
import { combineLatest, distinctUntilChanged, filter, map, of, switchMap, tap } from 'rxjs';
import { NgVirtualListItemComponent } from './components/ng-virtual-list-item.component';
import {
  DEFAULT_DIRECTION, DEFAULT_ITEM_SIZE, DEFAULT_ITEMS_OFFSET, DEFAULT_SNAP, DEFAULT_SNAP_TO_ITEM,
} from './const';
import { IVirtualListCollection, IVirtualListItem, IVirtualListStickyMap } from './models';
import { Id, /*IRect*/ } from './types';
import { IRenderVirtualListCollection } from './models/render-collection.model';
import { IRenderVirtualListItem } from './models/render-item.model';
import { Direction, Directions } from './enums';
import { isDirection, toggleClassName } from './utils';

/**
 * Virtual list component
 * @homepage https://github.com/DjonnyX/ng-virtual-list/tree/main/projects/ng-virtual-list
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
  onScroll = output<Event | undefined>();

  /**
   * Fires when the list has completed scrolling.
   */
  onScrollEnd = output<Event | undefined>();

  /**
   * Collection of list items.
   */
  items = input.required<IVirtualListCollection>();

  /**
   * Determines whether elements will snap. Default value is "true".
   */
  snap = input<boolean>(DEFAULT_SNAP);

  /**
   * Determines whether scroll positions will be snapped to the element. Default value is "false".
   */
  snapToItem = input<boolean>(DEFAULT_SNAP_TO_ITEM);

  /**
   * Rendering element template.
   */
  itemRenderer = input.required<TemplateRef<any>>();

  /**
   * Dictionary zIndex by id of the list element. If the value is not set or equal to 0,
   * then a simple element is displayed, if the value is greater than 0, then the sticky position mode is enabled for the element.
   */
  stickyMap = input<IVirtualListStickyMap>({});

  /**
   * If direction = 'vertical', then the height of a typical element. If direction = 'horizontal', then the width of a typical element.
   */
  itemSize = input(DEFAULT_ITEM_SIZE);

  /**
   * Determines the direction in which elements are placed. Default value is "vertical".
   */
  direction = input<Direction>(DEFAULT_DIRECTION);

  /**
   * Number of elements outside the scope of visibility. Default value is 2.
   */
  itemsOffset = input<number>(DEFAULT_ITEMS_OFFSET);

  private _isVertical = this.getIsVertical();

  protected _displayItems = signal<IRenderVirtualListCollection | null>(null);

  protected _displayComponents: Array<ComponentRef<NgVirtualListItemComponent>> = [];

  protected _bounds = signal<DOMRect | null>(null);

  protected _scrollSize = signal<number>(0);

  private _resizeObserver: ResizeObserver | null = null;

  private _onResizeHandler = () => {
    this._bounds.set(this._container()?.nativeElement?.getBoundingClientRect() ?? null);
  }

  private _onScrollHandler = (e: Event) => {
    const target = e.target as HTMLDivElement,
      scrollSize = this._isVertical ? target.scrollTop : target.scrollLeft;

    this._scrollSize.set(scrollSize);

    this.onScroll.emit(e);
  }

  private _onScrollEndHandler = (e: Event) => {
    const target = e.target as HTMLDivElement, s = this.itemSize(), itemSize = s < 0 ? DEFAULT_ITEM_SIZE : s,
      snapToItem = this.snapToItem(), scrollSize = this._isVertical ? target.scrollTop : target.scrollLeft,
      scrollItems = Math.round(scrollSize / itemSize), actualScrollSize = snapToItem ? scrollItems * itemSize : scrollSize;

    if (target.scrollTop !== actualScrollSize) {
      const container = target, params: ScrollToOptions = { [this._isVertical ? 'top' : 'left']: actualScrollSize, behavior: 'instant' };

      container.scroll(params);
    }

    this.onScrollEnd.emit(e);
  }

  private _elementRef = inject(ElementRef<HTMLDivElement>);

  // for dynamic item size
  // private _sizeCacheMap = new Map<Id, IRect>();

  constructor() {
    NgVirtualListComponent.__nextId = NgVirtualListComponent.__nextId + 1 === Number.MAX_SAFE_INTEGER
      ? 0 : NgVirtualListComponent.__nextId + 1;
    this._id = NgVirtualListComponent.__nextId;

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
        tap(v => {
          this._isVertical = v;
          const el: HTMLElement = this._elementRef.nativeElement;
          toggleClassName(el, v ? 'vertical' : 'horizontal', true);
        }),
      );

    combineLatest([$bounds, $items, $stickyMap, $scrollSize, $itemSize, $itemsOffset, $snap, $isVertical]).pipe(
      takeUntilDestroyed(),
      distinctUntilChanged(),
      switchMap(([bounds, items, stickyMap, scrollSize, itemSize, itemsOffset, snap, isVertical]) => {
        const { width, height } = bounds, size = isVertical ? height : width;
        const itemsFromStartToScrollEnd = Math.ceil(scrollSize / itemSize),
          itemsFromStartToDisplayEnd = Math.ceil((scrollSize + size) / itemSize),
          leftHiddenItemsWeight = itemsFromStartToScrollEnd * itemSize,
          totalItemsToDisplayEndWeight = itemsFromStartToDisplayEnd * itemSize,
          totalItems = items.length,
          totalSize = totalItems * itemSize,
          itemsOnDisplay = totalItemsToDisplayEndWeight - leftHiddenItemsWeight;
        return of({
          items, stickyMap, itemsOffset, width, height, isVertical, scrollSize, itemsFromStartToScrollEnd,
          itemsFromStartToDisplayEnd, itemsOnDisplay, leftHiddenItemsWeight, itemSize, totalSize, snap,
        });
      }),
      tap(({
        items, stickyMap, itemsOffset, width, height, isVertical, scrollSize, itemsFromStartToScrollEnd, itemsFromStartToDisplayEnd,
        itemsOnDisplay, leftHiddenItemsWeight, itemSize, totalSize, snap,
      }) => {
        const displayItems: IRenderVirtualListCollection = [];
        if (items.length) {
          const w = isVertical ? width : itemSize, h = isVertical ? itemSize : height, totalItems = items.length,
            leftItemLength = Math.min(itemsFromStartToScrollEnd, itemsOffset),
            rightItemLength = itemsFromStartToDisplayEnd + itemsOffset > totalItems
              ? totalItems - itemsFromStartToDisplayEnd : itemsOffset,
            leftItemsWeight = leftItemLength * itemSize, rightItemsWeight = rightItemLength * itemSize,
            startIndex = itemsFromStartToScrollEnd - leftItemLength, snippedPos = Math.floor(scrollSize);
          let pos = leftHiddenItemsWeight - leftItemsWeight,
            renderWeight = itemsOnDisplay + leftItemsWeight + rightItemsWeight,
            stickyItem: IRenderVirtualListItem | undefined, nextSticky: IRenderVirtualListItem | undefined, stickyItemIndex = -1;

          if (snap) {
            for (let i = itemsFromStartToScrollEnd - 1; i >= 0; i--) {
              const id = items[i].id, sticky = stickyMap[id];
              if (sticky > 0) {
                const measures = {
                  x: isVertical ? 0 : snippedPos,
                  y: isVertical ? snippedPos : 0,
                  width: w,
                  height: h,
                }, config = {
                  isVertical,
                  sticky,
                  snap,
                  snapped: true,
                };

                const itemData: IVirtualListItem = items[i];

                stickyItem = { id, measures, data: itemData, config };
                stickyItemIndex = i;

                displayItems.push(stickyItem);
                break;
              }
            }
          }

          let i = startIndex;

          while (renderWeight > 0) {
            if (i >= totalItems) {
              break;
            }

            const id = items[i].id;

            if (id !== stickyItem?.id) {
              const snaped = snap && stickyMap[id] > 0 && pos <= scrollSize,
                measures = {
                  x: isVertical ? 0 : pos,
                  y: isVertical ? pos : 0,
                  width: w,
                  height: h,
                }, config = {
                  isVertical,
                  sticky: stickyMap[id],
                  snap,
                  snapped: false,
                };

              const itemData: IVirtualListItem = items[i];

              const item: IRenderVirtualListItem = { id, measures, data: itemData, config };
              if (!nextSticky && stickyItemIndex < i && snap && stickyMap[id] > 0 && pos <= scrollSize + itemSize) {
                item.measures.x = isVertical ? 0 : snaped ? snippedPos : pos;
                item.measures.y = isVertical ? snaped ? snippedPos : pos : 0;
                nextSticky = item;
              }

              displayItems.push(item);

              // for dynamic item size
              // this._sizeCacheMap.set(id, measures);
            }
            renderWeight -= itemSize;
            pos += itemSize;
            i++;
          }

          const axis = isVertical ? 'y' : 'x';

          if (nextSticky && stickyItem && nextSticky.measures[axis] <= scrollSize + itemSize) {
            if (nextSticky.measures[axis] > scrollSize) {
              stickyItem.measures[axis] = nextSticky.measures[axis] - itemSize;
              stickyItem.config.snapped = nextSticky.config.snapped = false;
              stickyItem.config.sticky = 1;
            } else {
              nextSticky.config.snapped = true;
            }
          }
        }

        this._displayItems.set(displayItems);

        const l = this._list();
        if (l) {
          l.nativeElement.style[isVertical ? 'height' : 'width'] = `${totalSize}px`;
        }
      })
    ).subscribe();

    toObservable(this.itemRenderer).pipe(
      takeUntilDestroyed(),
      distinctUntilChanged(),
      tap(itemRenderer => {
        this.resetRenderers(itemRenderer);
      })
    )

    toObservable(this._displayItems).pipe(
      takeUntilDestroyed(),
      distinctUntilChanged(),
      tap(displayItems => {
        this.createDisplayComponentsIfNeed(displayItems);
        this.tracking(displayItems);
      }),
    ).subscribe();
  }

  private getIsVertical(d?: Direction) {
    const dir = d || this.direction();
    return isDirection(dir, Directions.VERTICAL);
  }

  private createDisplayComponentsIfNeed(displayItems: IRenderVirtualListCollection | null) {
    if (!displayItems || !this._listContainerRef) {
      this._doMap = {};
      return;
    }
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
        delete this._trackMap[id];
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

    this._doMap = doMap;
  }

  /**
   * Dictionary displayItems id by IRenderVirtualListItem.id
   */
  private _trackMap: { [id: Id]: number } = {};

  /**
   * displayItems dictionary of indexes by id
   */
  private _doMap: { [id: number]: number } = {};

  /**
   * tracking by id
   */
  protected tracking(displayItems: IRenderVirtualListCollection | null) {
    if (!displayItems) {
      return;
    }

    const untrackedItems = [...this._displayComponents];

    for (let i = 0, l = displayItems.length; i < l; i++) {
      const item = displayItems[i], doId = this._trackMap[item.id];
      if (this._trackMap.hasOwnProperty(item.id)) {
        const lastIndex = this._doMap[doId], el = this._displayComponents[lastIndex],
          elId = el?.instance.id;
        if (el && elId === doId) {
          const indexByUntrackedItems = untrackedItems.findIndex(v => v.instance.id === elId);
          if (indexByUntrackedItems > -1) {
            el.instance.item = item;
            untrackedItems.splice(indexByUntrackedItems, 1);
            continue;
          }
        }
        delete this._trackMap[item.id];
      }

      if (untrackedItems.length > 0) {
        const el = untrackedItems.shift(), item = displayItems[i];
        if (el) {
          el.instance.item = item;
          this._trackMap[item.id] = el.instance.id;
        }
      }
    }

    if (untrackedItems.length) {
      throw Error('tracking by id caused an error')
    }
  }

  /**
   * The method scrolls the list to the element with the given id and returns the value of the scrolled area.
   * Behavior accepts the values ​​"auto", "instant" and "smooth".
   */
  scrollTo(id: Id, behavior: ScrollBehavior = 'auto') {
    const items = this.items();
    if (!items || !items.length) {
      return;
    }

    const index = items.findIndex(item => item.id === id), scrollSize = index * this.itemSize(), container = this._container();
    if (container) {
      const params: ScrollToOptions = { [this._isVertical ? 'top' : 'left']: scrollSize, behavior };
      container.nativeElement.scroll(params);
    }
  }

  ngAfterViewInit(): void {
    const containerEl = this._container();
    if (containerEl) {
      containerEl.nativeElement.addEventListener('scroll', this._onScrollHandler);
      containerEl.nativeElement.addEventListener('scrollend', this._onScrollEndHandler);

      this._resizeObserver = new ResizeObserver(this._onResizeHandler);
      this._resizeObserver.observe(containerEl.nativeElement);

      this._onResizeHandler();
    }
  }

  ngOnDestroy(): void {
    const containerEl = this._container();
    if (containerEl) {
      containerEl.nativeElement.removeEventListener('scroll', this._onScrollHandler);
      containerEl.nativeElement.removeEventListener('scrollend', this._onScrollEndHandler);

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
