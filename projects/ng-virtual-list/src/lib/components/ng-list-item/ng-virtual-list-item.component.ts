import { ChangeDetectionStrategy, Component, inject, Injector, OnInit, signal } from '@angular/core';
import { takeUntilDestroyed, toObservable } from '@angular/core/rxjs-interop';
import { map, tap, combineLatest, fromEvent, switchMap, of, Observable, filter, debounceTime } from 'rxjs';
import { IRenderVirtualListItem } from '../../models/render-item.model';
import { Id } from '../../types';
import {
  DEFAULT_CLICK_DISTANCE, NAVIGATION_BY_KEYBOARD_TIMER, VISIBILITY_HIDDEN,
} from '../../const';
import { BaseVirtualListItemComponent } from './base';
import { MethodsForSelectingTypes } from '../../enums/method-for-selecting-types';
import { IDisplayObjectConfig } from '../../models';
import { getListElementByIndex } from './utils';
import {
  ATTR_AREA_SELECTED, EVENT_FOCUS_IN, EVENT_FOCUS_OUT, EVENT_KEY_DOWN, KEY_ARR_DOWN, KEY_ARR_LEFT,
  KEY_ARR_RIGHT, KEY_ARR_UP, KEY_SPACE,
} from './const';

/**
 * Virtual list component.
 * Maximum performance for extremely large lists.
 * It is based on algorithms for virtualization of screen objects.
 * @link https://github.com/DjonnyX/ng-virtual-list/blob/18.x/projects/ng-virtual-list/src/lib/components/list-item/ng-virtual-list-item.component.ts
 * @author Evgenii Alexandrovich Grebennikov
 * @email djonnyx@gmail.com
 */
@Component({
  selector: 'ng-virtual-list-item',
  templateUrl: './ng-virtual-list-item.component.html',
  styleUrl: './ng-virtual-list-item.component.scss',
  host: {
    'class': 'ngvl__item',
    'role': 'listitem',
  },
  standalone: false,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class NgVirtualListItemComponent extends BaseVirtualListItemComponent implements OnInit {
  protected readonly maxClickDistance = signal<number>(DEFAULT_CLICK_DISTANCE);

  protected _injector = inject(Injector);

  constructor() {
    super();
  }

  ngOnInit(): void {
    this._service.$clickDistance.pipe(
      takeUntilDestroyed(this._destroyRef),
      tap(v => {
        this.maxClickDistance.set(v);
      }),
    ).subscribe();

    this._service.$langTextDir.pipe(
      takeUntilDestroyed(this._destroyRef),
      tap(v => {
        this._langTextDir = v;
      }),
    ).subscribe();

    this._service.$scrollBarSize.pipe(
      takeUntilDestroyed(this._destroyRef),
      tap(v => {
        this._scrollBarSize = v;
      }),
    ).subscribe();

    const $data = toObservable(this.data, { injector: this._injector }),
      $focused = toObservable(this.focused, { injector: this._injector });

    $focused.pipe(
      takeUntilDestroyed(this._destroyRef),
      tap(v => {
        this._service.areaFocus(v ? this._id : this._service.focusedId === this._id ? null : this._service.focusedId);
      }),
    ).subscribe();

    fromEvent(this.element, EVENT_FOCUS_IN).pipe(
      takeUntilDestroyed(this._destroyRef),
      tap(e => {
        this.focused.set(true);

        this.updateConfig(this._data);

        this.updatePartStr(this._data, this._isSelected, this._isCollapsed);
      }),
    ).subscribe(),

      fromEvent(this.element, EVENT_FOCUS_OUT).pipe(
        takeUntilDestroyed(this._destroyRef),
        tap(e => {
          this.focused.set(false);

          this.updateConfig(this._data);

          this.updatePartStr(this._data, this._isSelected, this._isCollapsed);
        }),
      ).subscribe();

    $focused.pipe(
      takeUntilDestroyed(this._destroyRef),
      debounceTime(this._service.animationParams.navigateByKeyboard ?? NAVIGATION_BY_KEYBOARD_TIMER),
      switchMap(v => {
        if (v) {
          return this.keyKode();
        }
        return of(false);
      }),
    ).subscribe();

    combineLatest([$data, this._service.$methodOfSelecting, this._service.$selectedIds, this._service.$collapsedIds]).pipe(
      takeUntilDestroyed(this._destroyRef),
      map(([, m, selectedIds, collapsedIds]) => ({ method: m, selectedIds, collapsedIds })),
      tap(({ method, selectedIds, collapsedIds }) => {
        switch (method) {
          case MethodsForSelectingTypes.SELECT: {
            const id = selectedIds as Id | undefined, isSelected = id === this.itemId;
            this.element.setAttribute(ATTR_AREA_SELECTED, String(isSelected));
            this._isSelected = isSelected;
            break;
          }
          case MethodsForSelectingTypes.MULTI_SELECT: {
            const actualIds = selectedIds as Array<Id>, isSelected = this.itemId !== undefined && actualIds && actualIds.includes(this.itemId);
            this.element.setAttribute(ATTR_AREA_SELECTED, String(isSelected));
            this._isSelected = isSelected;
            break;
          }
          case MethodsForSelectingTypes.NONE:
          default: {
            this.element.removeAttribute(ATTR_AREA_SELECTED);
            this._isSelected = false;
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
      takeUntilDestroyed(this._destroyRef),
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
            if (!this.config().isVertical) {
              return this.toPrevItem(e);
            }
            break;
          case KEY_ARR_UP:
            if (this.config().isVertical) {
              return this.toPrevItem(e);
            }
            break;
          case KEY_ARR_RIGHT:
            if (!this.config().isVertical) {
              return this.toNextItem(e);
            }
            break;
          case KEY_ARR_DOWN:
            if (this.config().isVertical) {
              return this.toNextItem(e);
            }
            break;
        }
        return of(null);
      }),
    );
  }

  private toNextItem(e: Event): Observable<any> {
    if (!!e && e.cancelable) {
      e.stopImmediatePropagation();
      e.preventDefault();
    }

    const index = this.focusNext();
    if (index > -1) {
      this._service.lastFocusedItemId = index;
    }
    return of(e).pipe(
      takeUntilDestroyed(this._destroyRef),
      filter(v => !!v),
      debounceTime(this._service.animationParams.navigateByKeyboard ?? NAVIGATION_BY_KEYBOARD_TIMER),
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
    if (index > -1) {
      this._service.lastFocusedItemId = index;
    }
    return of(e).pipe(
      takeUntilDestroyed(this._destroyRef),
      filter(v => !!v),
      debounceTime(this._service.animationParams.navigateByKeyboard ?? NAVIGATION_BY_KEYBOARD_TIMER),
      switchMap(() => {
        return this.keyKode();
      }),
    );
  }

  private focusNext(): number {
    if (this._service.listElement) {
      const tabIndex = this._data?.config?.tabIndex ?? 0, length = this._service.collection?.length ?? 0;
      let index = tabIndex;
      while (index <= length) {
        index++;
        const element = this._service.listElement.querySelector<HTMLDivElement>(getListElementByIndex(index));
        if (!!element && element.style.visibility !== VISIBILITY_HIDDEN) {
          const focused = this._service.focus(element);
          if (focused) {
            return index;
          }
        }
      }
    }
    return -1;
  }

  private focusPrev(): number {
    if (this._service.listElement) {
      const tabIndex = this._data?.config?.tabIndex ?? 0;
      let index = tabIndex;
      while (index >= 0) {
        index--;
        const element = this._service.listElement.querySelector<HTMLDivElement>(getListElementByIndex(index));
        if (!!element) {
          this._service.focus(element);
          return index;
        }
      }
    }
    return -1;
  }

  protected override updateConfig(v: IRenderVirtualListItem<any> | null) {
    this.config.set({
      ...v?.config || {} as IDisplayObjectConfig, selected: this._isSelected, collapsed: this._isCollapsed, focused: this.focused(),
    });
  }

  onClickHandler() {
    this._service.itemClick(this._data);
  }
}
