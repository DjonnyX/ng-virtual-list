import {
  AfterViewInit, ChangeDetectionStrategy, Component, ComponentRef, ElementRef, input,
  OnDestroy, signal, TemplateRef, ViewChild, viewChild, ViewContainerRef, ViewEncapsulation,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { takeUntilDestroyed, toObservable } from '@angular/core/rxjs-interop';
import { combineLatest, filter, map, of, switchMap, tap } from 'rxjs';
import { NgVirtualListItemComponent } from './components/ng-virtual-list-item.component';
import { DEFAULT_ITEM_HEIGHT } from './const';
import { IRenderVirtualListCollection, IVirtualListCollection } from './models';
import { Id, IRect } from './types';

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
  protected listContainerRef: ViewContainerRef | undefined;

  protected container = viewChild<ElementRef<HTMLDivElement>>('container');

  protected list = viewChild<ElementRef<HTMLUListElement>>('list');

  items = input.required<IVirtualListCollection>();

  itemRenderer = input.required<TemplateRef<any>>();

  itemHeight = input(DEFAULT_ITEM_HEIGHT);

  protected _displayItems = signal<IRenderVirtualListCollection | null>(null);

  protected _displayComponents: Array<ComponentRef<NgVirtualListItemComponent>> = [];

  protected _bounds = signal<DOMRect | null>(null);

  protected _scrollSize = signal<number>(0);

  private _resizeObserver: ResizeObserver | null = null;

  private _onResizeHandler = () => {
    this._bounds.set(this.container()?.nativeElement?.getBoundingClientRect() ?? null);
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
      $itemHeight = toObservable(this.itemHeight);

    combineLatest([$bounds, $items, $scrollSize, $itemHeight]).pipe(
      takeUntilDestroyed(),
      switchMap(([bounds, items, scrollSize, itemHeight]) => {
        const { width, height } = bounds;
        const itemsFromStartToScrollEnd = Math.floor(scrollSize / itemHeight),
          itemsFromStartToDisplayEnd = Math.ceil((scrollSize + height) / itemHeight),
          leftHiddenItemsWeight = itemsFromStartToScrollEnd * itemHeight,
          totalItemsToDisplayEndWeight = itemsFromStartToDisplayEnd * itemHeight,
          totalItems = items.length,
          totalSize = totalItems * itemHeight,
          itemsOnDisplay = totalItemsToDisplayEndWeight - leftHiddenItemsWeight;
        return of({ items, width, itemsFromStartToScrollEnd, itemsOnDisplay, leftHiddenItemsWeight, itemHeight, totalSize });
      }),
      tap(({ items, width, itemsFromStartToScrollEnd, itemsOnDisplay, leftHiddenItemsWeight, itemHeight, totalSize }) => {
        const displayItems: IRenderVirtualListCollection = [], totalItems = items.length;
        let i = itemsFromStartToScrollEnd, y = leftHiddenItemsWeight, renderWeight = itemsOnDisplay;


        while (renderWeight > 0) {
          if (i >= totalItems) {
            break;
          }

          renderWeight -= itemHeight;
          y += itemHeight;

          const id = items[i].id, measures = {
            x: 0,
            y,
            width,
            height: itemHeight,
          };

          const itemData: any = { ...items[i] };
          delete itemData.id;

          displayItems.push({ id, measures, data: itemData });

          this._sizeCacheMap.set(id, measures);

          i++;
        }

        this._displayItems.set(displayItems);

        const l = this.list();
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
    if (!displayItems || !this.listContainerRef) {
      return;
    }
    const listContainerRef = this.listContainerRef;

    while (this._displayComponents.length < displayItems.length) {
      if (listContainerRef) {
        const comp = listContainerRef.createComponent(NgVirtualListItemComponent);
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
    const containerEl = this.container();
    if (containerEl) {
      containerEl.nativeElement.addEventListener('scroll', this._onScrollHandler);

      this._resizeObserver = new ResizeObserver(this._onResizeHandler);
      this._resizeObserver.observe(containerEl.nativeElement);

      this._onResizeHandler();
    }
  }

  ngOnDestroy(): void {
    const containerEl = this.container();
    if (containerEl) {
      containerEl.nativeElement.removeEventListener('scroll', this._onScrollHandler);

      if (this._resizeObserver) {
        this._resizeObserver.unobserve(containerEl.nativeElement);
      }
    }
  }
}
