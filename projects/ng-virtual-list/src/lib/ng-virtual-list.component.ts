import {
  AfterViewInit, ChangeDetectionStrategy, Component, ComponentRef, ElementRef, inject, input,
  OnDestroy, output, signal, TemplateRef, ViewChild, viewChild, ViewContainerRef, ViewEncapsulation,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { takeUntilDestroyed, toObservable } from '@angular/core/rxjs-interop';
import { combineLatest, distinctUntilChanged, filter, map, of, switchMap, tap } from 'rxjs';
import { NgVirtualListItemComponent } from './components/ng-virtual-list-item.component';
import { DEFAULT_ITEM_HEIGHT, DEFAULT_ITEMS_OFFSET } from './const';
import { IVirtualListCollection, IVirtualListItem, IVirtualListStickyMap } from './models';
// import { Id, IRect } from './types';
import { IRenderVirtualListCollection } from './models/render-collection.model';
import { IRenderVirtualListItem } from './models/render-item.model';
import { Direction, Directions } from './enums';
import { isDirection, toggleClassName } from './utils';

@Component({
  selector: 'ng-virtual-list',
  imports: [CommonModule],
  templateUrl: './ng-virtual-list.component.html',
  styleUrl: './ng-virtual-list.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
  encapsulation: ViewEncapsulation.ShadowDom,
})
export class NgVirtualListComponent implements AfterViewInit, OnDestroy {
  @ViewChild('renderersContainer', { read: ViewContainerRef })
  protected _listContainerRef: ViewContainerRef | undefined;

  protected _container = viewChild<ElementRef<HTMLDivElement>>('container');

  protected _list = viewChild<ElementRef<HTMLUListElement>>('list');

  onScroll = output<Event>();

  onScrollEnd = output<Event>();

  items = input.required<IVirtualListCollection>();

  snap = input<boolean>(true);

  itemRenderer = input.required<TemplateRef<any>>();

  stickyMap = input<IVirtualListStickyMap>({});

  itemSize = input(DEFAULT_ITEM_HEIGHT);

  direction = input<Direction>(Directions.VERTICAL);

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
    const target = e.target as HTMLDivElement;
    this._scrollSize.set(this._isVertical ? target.scrollTop : target.scrollLeft);

    this.onScroll.emit(e);
  }

  private _onScrollEndHandler = (e: Event) => {
    this.onScrollEnd.emit(e);
  }

  private _elementRef = inject(ElementRef<HTMLDivElement>);

  // for dynamic item size
  // private _sizeCacheMap = new Map<Id, IRect>();

  constructor() {
    const $bounds = toObservable(this._bounds).pipe(
      filter(b => !!b),
    ), $items = toObservable(this.items).pipe(
      map(i => !i ? [] : i),
    ), $scrollSize = toObservable(this._scrollSize),
      $itemSize = toObservable(this.itemSize),
      $itemsOffset = toObservable(this.itemsOffset),
      $stickyMap = toObservable(this.stickyMap),
      $snap = toObservable(this.snap),
      $isVertical = toObservable(this.direction).pipe(
        map(v => this.getIsVertical(v)),
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
        const itemsFromStartToScrollEnd = Math.floor(scrollSize / itemSize),
          itemsFromStartToDisplayEnd = Math.ceil((scrollSize + size) / itemSize),
          leftHiddenItemsWeight = itemsFromStartToScrollEnd * itemSize,
          totalItemsToDisplayEndWeight = itemsFromStartToDisplayEnd * itemSize,
          totalItems = items.length,
          totalSize = totalItems * itemSize,
          itemsOnDisplay = totalItemsToDisplayEndWeight - leftHiddenItemsWeight;
        return of({
          items, stickyMap, itemsOffset, width, height, isVertical, scrollSize, itemsFromStartToScrollEnd, itemsFromStartToDisplayEnd,
          itemsOnDisplay, leftHiddenItemsWeight, itemSize, totalSize, snap
        });
      }),
      tap(({ items, stickyMap, itemsOffset, width, height, isVertical, scrollSize, itemsFromStartToScrollEnd, itemsFromStartToDisplayEnd,
        itemsOnDisplay, leftHiddenItemsWeight, itemSize, totalSize, snap }) => {
        const displayItems: IRenderVirtualListCollection = [];
        if (items.length) {
          const w = isVertical ? width : itemSize, h = isVertical ? itemSize : height, totalItems = items.length,
            leftItemLength = itemsFromStartToScrollEnd - itemsOffset < Math.min(itemsFromStartToScrollEnd, itemsOffset) ? 0 : itemsOffset,
            rightItemLength = itemsFromStartToDisplayEnd + itemsOffset > totalItems
              ? totalItems - itemsFromStartToDisplayEnd : itemsOffset,
            leftItemsWeight = leftItemLength * itemSize, rightItemsWeight = rightItemLength * itemSize,
            startIndex = itemsFromStartToScrollEnd - leftItemLength, snippedPos = Math.floor(scrollSize);
          let pos = leftHiddenItemsWeight - leftItemsWeight,
            renderWeight = itemsOnDisplay + leftItemsWeight + rightItemsWeight, stickyItem: IRenderVirtualListItem | undefined;

          if (snap) {
            for (let i = startIndex; i >= 0; i--) {
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
                };

                const itemData: IVirtualListItem = items[i];

                stickyItem = { id, measures, data: itemData, config };

                displayItems.push(stickyItem);
                break;
              }
            }
          }

          let i = startIndex, nextSticky: IRenderVirtualListItem | undefined;

          while (renderWeight > 0) {
            if (i >= totalItems) {
              break;
            }

            const id = items[i].id, snaped = snap && stickyMap[id] > 0 && pos <= scrollSize, measures = {
              x: isVertical ? 0 : snaped ? snippedPos : pos,
              y: isVertical ? snaped ? snippedPos : pos : 0,
              width: w,
              height: h,
            }, config = {
              isVertical,
              sticky: snaped ? stickyMap[id] : 0,
              snap,
            };

            const itemData: IVirtualListItem = items[i];

            const item: IRenderVirtualListItem = { id, measures, data: itemData, config };
            if (!nextSticky && stickyMap[id] > 0) {
              nextSticky = item;
            }

            displayItems.push(item);

            // for dynamic item size
            // this._sizeCacheMap.set(id, measures);

            renderWeight -= itemSize;
            pos += itemSize;
            i++;
          }

          const axis = isVertical ? 'y' : 'x';

          if (i < totalItems) {
            if (nextSticky && stickyItem && nextSticky.measures[axis] <= leftHiddenItemsWeight + itemSize) {
              stickyItem.measures[axis] = nextSticky.measures[axis] - itemSize;
              stickyItem.config.sticky = 1;
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

    toObservable(this._displayItems).pipe(
      takeUntilDestroyed(),
      tap(displayItems => {
        this.createDisplayComponentsIfNeed(displayItems);
        this.refresh(displayItems);
      }),
    ).subscribe();
  }

  private getIsVertical(d?: Direction) {
    const dir = d || this.direction();
    return isDirection(dir, Directions.VERTICAL);
  }

  private createDisplayComponentsIfNeed(displayItems: IRenderVirtualListCollection | null) {
    if (!displayItems || !this._listContainerRef) {
      return;
    }
    const _listContainerRef = this._listContainerRef;

    while (this._displayComponents.length < displayItems.length) {
      if (_listContainerRef) {
        const comp = _listContainerRef.createComponent(NgVirtualListItemComponent);
        this._displayComponents.push(comp);
      }
    }

    if (this._displayComponents.length > displayItems.length) {
      while (this._displayComponents.length > displayItems.length) {
        const comp = this._displayComponents.pop();
        comp?.destroy();
      }
    }
  }

  protected refresh(displayItems: IRenderVirtualListCollection | null) {
    if (!displayItems) {
      return;
    }

    for (let i = 0, l = displayItems.length; i < l; i++) {
      const el = this._displayComponents[i];
      el.instance.item = displayItems[i];
      el.instance.renderer = this.itemRenderer();
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
