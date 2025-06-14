import {
  AfterViewInit, ChangeDetectionStrategy, Component, ComponentRef, ElementRef, input,
  OnDestroy, signal, TemplateRef, ViewChild, viewChild, ViewContainerRef, ViewEncapsulation,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { takeUntilDestroyed, toObservable } from '@angular/core/rxjs-interop';
import { combineLatest, filter, map, of, switchMap, tap } from 'rxjs';
import { NgVirtualListItemComponent } from './components/ng-virtual-list-item.component';
import { DEFAULT_ITEM_HEIGHT, DEFAULT_ITEMS_OFFSET } from './const';
import { IVirtualListCollection, IVirtualListStickyMap } from './models';
import { Id, IRect } from './types';
import { IRenderVirtualListCollection } from './models/render-collection.model';
import { IRenderVirtualListItem } from './models/render-item.model';

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

  items = input.required<IVirtualListCollection>();

  itemRenderer = input.required<TemplateRef<any>>();

  stickyMap = input<IVirtualListStickyMap>({});

  itemHeight = input(DEFAULT_ITEM_HEIGHT);

  protected _itemsOffset = signal<number>(DEFAULT_ITEMS_OFFSET);

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
    this._scrollSize.set(target.scrollTop);
  }

  private _sizeCacheMap = new Map<Id, IRect>();

  constructor() {
    const $bounds = toObservable(this._bounds).pipe(
      filter(b => !!b),
    ), $items = toObservable(this.items).pipe(
      map(i => !i ? [] : i),
    ), $scrollSize = toObservable(this._scrollSize),
      $itemHeight = toObservable(this.itemHeight),
      $itemsOffset = toObservable(this._itemsOffset),
      $stickyMap = toObservable(this.stickyMap);

    combineLatest([$bounds, $items, $stickyMap, $scrollSize, $itemHeight, $itemsOffset]).pipe(
      takeUntilDestroyed(),
      switchMap(([bounds, items, stickyMap, scrollSize, itemHeight, itemsOffset]) => {
        const { width, height } = bounds;
        const itemsFromStartToScrollEnd = Math.floor(scrollSize / itemHeight),
          itemsFromStartToDisplayEnd = Math.ceil((scrollSize + height) / itemHeight),
          leftHiddenItemsWeight = itemsFromStartToScrollEnd * itemHeight,
          totalItemsToDisplayEndWeight = itemsFromStartToDisplayEnd * itemHeight,
          totalItems = items.length,
          totalSize = totalItems * itemHeight,
          itemsOnDisplay = totalItemsToDisplayEndWeight - leftHiddenItemsWeight;
        return of({
          items, stickyMap, itemsOffset, width, scrollSize, itemsFromStartToScrollEnd, itemsFromStartToDisplayEnd,
          itemsOnDisplay, leftHiddenItemsWeight, itemHeight, totalSize
        });
      }),
      tap(({ items, stickyMap, itemsOffset, width, scrollSize, itemsFromStartToScrollEnd, itemsFromStartToDisplayEnd,
        itemsOnDisplay, leftHiddenItemsWeight, itemHeight, totalSize }) => {
        const displayItems: IRenderVirtualListCollection = [], totalItems = items.length,
          leftItemLength = itemsFromStartToScrollEnd - itemsOffset < Math.min(itemsFromStartToScrollEnd, itemsOffset) ? 0 : itemsOffset,
          rightItemLength = itemsFromStartToDisplayEnd + itemsOffset > totalItems
            ? totalItems - itemsFromStartToDisplayEnd : itemsOffset,
          leftItemsWeight = leftItemLength * itemHeight, rightItemsWeight = rightItemLength * itemHeight,
          startIndex = itemsFromStartToScrollEnd - leftItemLength;
        let y = leftHiddenItemsWeight - leftItemsWeight,
          renderWeight = itemsOnDisplay + leftItemsWeight + rightItemsWeight, stickyItem: IRenderVirtualListItem | undefined;

        for (let i = startIndex; i >= 0; i--) {
          const id = items[i].id, sticky = stickyMap[id];
          if (sticky > 0) {
            const measures = {
              x: 0,
              y: scrollSize,
              width,
              height: itemHeight,
            }, config = {
              sticky,
            };

            const itemData: any = { ...items[i] };
            delete itemData.id;

            stickyItem = { id, measures, data: itemData, config };

            displayItems.push(stickyItem);
            break;
          }
        }

        let i = startIndex, nextSticky: IRenderVirtualListItem | undefined;

        while (renderWeight > 0) {
          if (i >= totalItems) {
            break;
          }

          const id = items[i].id, snapen = stickyMap[id] > 0 && y <= scrollSize, measures = {
            x: 0,
            y: snapen ? scrollSize : y,
            width,
            height: itemHeight,
          }, config = {
            sticky: snapen ? stickyMap[id] : 0,
          };

          const itemData: any = { ...items[i] };
          delete itemData.id;

          const item: IRenderVirtualListItem = { id, measures, data: itemData, config };
          if (!nextSticky && stickyMap[id] > 0) {
            nextSticky = item;
          }

          displayItems.push(item);

          this._sizeCacheMap.set(id, measures);

          renderWeight -= itemHeight;
          y += itemHeight;
          i++;
        }

        if (i < totalItems) {
          if (nextSticky && stickyItem && nextSticky.measures.y <= leftHiddenItemsWeight + itemHeight) {
            stickyItem.measures.y = nextSticky.measures.y - itemHeight;
            stickyItem.config.sticky = 1;
          }
        }

        this._displayItems.set(displayItems);

        const l = this._list();
        if (l) {
          l.nativeElement.style.height = `${totalSize}px`;
        }

      })
    ).subscribe();

    toObservable(this._displayItems).pipe(
      takeUntilDestroyed(),
      tap(displayItems => {
        this.createdisplayComponentsIfNeed(displayItems);
        this.refresh(displayItems);
      }),
    ).subscribe();
  }

  private createdisplayComponentsIfNeed(displayItems: IRenderVirtualListCollection | null) {
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

      this._resizeObserver = new ResizeObserver(this._onResizeHandler);
      this._resizeObserver.observe(containerEl.nativeElement);

      this._onResizeHandler();
    }
  }

  ngOnDestroy(): void {
    const containerEl = this._container();
    if (containerEl) {
      containerEl.nativeElement.removeEventListener('scroll', this._onScrollHandler);

      if (this._resizeObserver) {
        this._resizeObserver.unobserve(containerEl.nativeElement);
      }
    }
  }
}
