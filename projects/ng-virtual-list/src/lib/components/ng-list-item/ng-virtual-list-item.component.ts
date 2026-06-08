import { ChangeDetectionStrategy, Component, inject, Injector, OnInit } from '@angular/core';
import { map, tap, combineLatest, fromEvent, switchMap, of, Observable, debounceTime, BehaviorSubject, takeUntil } from 'rxjs';
import { IRenderVirtualListItem } from '../../models/render-item.model';
import { Id } from '../../types';
import {
  DEFAULT_CLICK_DISTANCE, NAVIGATION_BY_KEYBOARD_TIMER, VISIBILITY_HIDDEN,
} from '../../const';
import { BaseVirtualListItemComponent } from './base';
import { SelectingModesTypes } from '../../enums/selecting-modes-types';
import { IDisplayObjectConfig } from '../../models';
import { getListElementByIndex } from './utils';
import {
  ATTR_AREA_SELECTED, EVENT_FOCUS_IN, EVENT_FOCUS_OUT, EVENT_KEY_DOWN, KEY_ARR_DOWN, KEY_ARR_LEFT,
  KEY_ARR_RIGHT, KEY_ARR_UP, KEY_SPACE, NGVL_VISIBILITY,
} from './const';

/**
 * Virtual list component.
 * Maximum performance for extremely large lists.
 * It is based on algorithms for virtualization of screen objects.
 * @link https://github.com/DjonnyX/ng-virtual-list/blob/14.x/projects/ng-virtual-list/src/lib/components/ng-list-item/ng-virtual-list-item.component.ts
 * @author Evgenii Alexandrovich Grebennikov
 * @email djonnyx@gmail.com
 */
@Component({
  selector: 'ng-virtual-list-item',
  templateUrl: './ng-virtual-list-item.component.html',
  styleUrls: ['./ng-virtual-list-item.component.scss'],
  host: {
    'class': 'ngvl__item',
    'role': 'listitem',
  },
  standalone: false,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class NgVirtualListItemComponent extends BaseVirtualListItemComponent implements OnInit {
  private _$maxClickDistance = new BehaviorSubject<number>(DEFAULT_CLICK_DISTANCE);
  $maxClickDistance = this._$maxClickDistance.asObservable();

  protected _injector = inject(Injector);

  constructor() {
    super();
  }

  ngOnInit(): void {
    this._service.$clickDistance.pipe(
      takeUntil(this._$unsubscribe),
      tap(v => {
        this._$maxClickDistance.next(v);
      }),
    ).subscribe();

    this._service.$langTextDir.pipe(
      takeUntil(this._$unsubscribe),
      tap(v => {
        this._langTextDir = v;
      }),
    ).subscribe();

    this._service.$scrollBarSize.pipe(
      takeUntil(this._$unsubscribe),
      tap(v => {
        this._scrollBarSize = v;
      }),
    ).subscribe();

    const $data = this.$data,
      $focused = this.$focused;


    fromEvent(this.element, EVENT_FOCUS_IN).pipe(
      takeUntil(this._$unsubscribe),
      tap(e => {
        this._service.focusedId = this.itemId ?? null;
        this._$focused.next(true);

        this.updateConfig(this._data);

        this.updatePartStr(this._data, this._isSelected, this._isCollapsed);
      }),
    ).subscribe(),

      fromEvent(this.element, EVENT_FOCUS_OUT).pipe(
        takeUntil(this._$unsubscribe),
        tap(e => {
          this._$focused.next(false);

          this.updateConfig(this._data);

          this.updatePartStr(this._data, this._isSelected, this._isCollapsed);
        }),
      ).subscribe();

    $focused.pipe(
      takeUntil(this._$unsubscribe),
      debounceTime(this.getNavigationTimeout()),
      switchMap(v => {
        if (v) {
          return this.keyKode();
        }
        return of(false);
      }),
    ).subscribe();

    combineLatest([$data, this._service.$selectingMode, this._service.$selectedIds, this._service.$collapsedIds]).pipe(
      takeUntil(this._$unsubscribe),
      map(([, m, selectedIds, collapsedIds]) => ({ method: m, selectedIds, collapsedIds })),
      tap(({ method, selectedIds, collapsedIds }) => {
        switch (method) {
          case SelectingModesTypes.SELECT: {
            const id = selectedIds as Id | undefined, isSelected = id === this.itemId;
            this.element.setAttribute(ATTR_AREA_SELECTED, String(isSelected));
            this.isSelected = isSelected;
            break;
          }
          case SelectingModesTypes.MULTI_SELECT: {
            const actualIds = selectedIds as Array<Id>, isSelected = this.itemId !== undefined && actualIds && actualIds.includes(this.itemId);
            this.element.setAttribute(ATTR_AREA_SELECTED, String(isSelected));
            this.isSelected = isSelected;
            break;
          }
          case SelectingModesTypes.NONE:
          default: {
            this.element.removeAttribute(ATTR_AREA_SELECTED);
            this.isSelected = false;
            break;
          }
        }

        const actualIds = collapsedIds, isCollapsed = this.itemId !== undefined && actualIds && actualIds.includes(this.itemId);
        this._isCollapsed = isCollapsed;

        this.updatePartStr(this._data, this._isSelected, isCollapsed);

        this.updateConfig(this._data);

        this.updateMeasures(this._data);
      }),
    ).subscribe();
  }

  private keyKode() {
    return fromEvent<KeyboardEvent>(this.element, EVENT_KEY_DOWN).pipe(
      takeUntil(this._$unsubscribe),
      switchMap(e => {
        switch (e.key) {
          case KEY_SPACE: {
            e.stopImmediatePropagation();
            e.preventDefault();
            if (!!this._data) {
              this._service.select(this._data!.id!);
              this._service.collapse(this._data!.id!);
            }
            break;
          }
          case KEY_ARR_LEFT:
            if (!this._$config.getValue().isVertical) {
              return this.toPrevItem(e);
            }
            break;
          case KEY_ARR_UP:
            if (this._$config.getValue().isVertical) {
              return this.toPrevItem(e);
            }
            break;
          case KEY_ARR_RIGHT:
            if (!this._$config.getValue().isVertical) {
              return this.toNextItem(e);
            }
            break;
          case KEY_ARR_DOWN:
            if (this._$config.getValue().isVertical) {
              return this.toNextItem(e);
            }
            break;
        }
        return of(null);
      }),
    );
  }

  private getNavigationTimeout() {
    return this._service.snapToItem ?
      Math.max(this._service.animationParams.snapToItem, this._service.animationParams.navigateByKeyboard ?? NAVIGATION_BY_KEYBOARD_TIMER) :
      this._service.animationParams.navigateByKeyboard ?? NAVIGATION_BY_KEYBOARD_TIMER;
  }

  private toNextItem(e: Event): Observable<any> {
    if (!!e && e.cancelable) {
      e.stopImmediatePropagation();
      e.preventDefault();
    }

    const index = this.focusNext();
    if (index !== Number.MIN_SAFE_INTEGER) {
      this._service.lastFocusedItemId = index;
    }
    return of(e).pipe(
      takeUntil(this._$unsubscribe),
      debounceTime(this.getNavigationTimeout()),
      switchMap(() => {
        return this.keyKode();
      }),
    );
  }

  private toPrevItem(e: Event): Observable<any> {
    if (!!e && e.cancelable) {
      e.stopImmediatePropagation();
      e.preventDefault();
    }

    const index = this.focusPrev();
    if (index !== Number.MIN_SAFE_INTEGER) {
      this._service.lastFocusedItemId = index;
    }
    return of(e).pipe(
      takeUntil(this._$unsubscribe),
      debounceTime(this.getNavigationTimeout()),
      switchMap(() => {
        return this.keyKode();
      }),
    );
  }

  private focusNext(): number {
    if (this._service.listElement) {
      const tabIndex = this._data?.config?.tabIndex ?? 0, length = this._data?.config.totalItems ?? 0,
        l = length > 0 ? (this._service.isInfinity ? (length + 1) : length) : 0;
      let index = tabIndex;
      while (index <= l) {
        index++;
        const element = this._service.listElement.querySelector<HTMLDivElement>(getListElementByIndex(index));
        if (!!element && element.getAttribute(NGVL_VISIBILITY) !== VISIBILITY_HIDDEN) {
          const focused = this._service.focus(element);
          if (focused) {
            return index;
          }
        }
      }
    }
    return Number.MIN_SAFE_INTEGER;
  }

  private focusPrev(): number {
    if (this._service.listElement) {
      const tabIndex = this._data?.config?.tabIndex ?? 0, min = -(this._data?.config?.layoutIndexOffset ?? 0);
      let index = tabIndex;
      while (index >= min) {
        index--;
        const element = this._service.listElement.querySelector<HTMLDivElement>(getListElementByIndex(index));
        if (!!element && element.getAttribute(NGVL_VISIBILITY) !== VISIBILITY_HIDDEN) {
          this._service.focus(element);
          return index;
        }
      }
    }
    return Number.MIN_SAFE_INTEGER;
  }

  protected override updateConfig(v: IRenderVirtualListItem<any> | null) {
    this._$config.next({
      ...v?.config || {} as IDisplayObjectConfig, selected: this._isSelected, collapsed: this._isCollapsed, focused: this._$focused.getValue(),
    });

    this._cdr.markForCheck();
  }

  onClickHandler() {
    this._service.virtualClick(this._data);
  }
}
