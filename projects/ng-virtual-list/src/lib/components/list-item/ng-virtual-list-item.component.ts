import { ChangeDetectionStrategy, Component, inject, Injector, OnInit } from '@angular/core';
import { map, tap, combineLatest, fromEvent, switchMap, of, Observable, filter, debounceTime, BehaviorSubject, takeUntil } from 'rxjs';
import { IRenderVirtualListItem } from '../../models/render-item.model';
import { FocusAlignment, Id } from '../../types';
import {
  DEFAULT_CLICK_DISTANCE, NAVIGATION_BY_KEYBOARD_TIMER, VISIBILITY_HIDDEN,
} from '../../const';
import { BaseVirtualListItemComponent } from './base';
import { NgVirtualListService } from '../../ng-virtual-list.service';
import { MethodsForSelectingTypes } from '../../enums/method-for-selecting-types';
import { validateBoolean } from '../../utils/validation';
import { FocusAlignments } from '../../enums';
import { IDisplayObjectConfig } from '../../models';
import { createDisplayId, getListElementByIndex } from './utils';
import {
  ATTR_AREA_SELECTED, EVENT_FOCUS_IN, EVENT_FOCUS_OUT, EVENT_KEY_DOWN, KEY_ARR_DOWN, KEY_ARR_LEFT,
  KEY_ARR_RIGHT, KEY_ARR_UP, KEY_SPACE,
} from './const';

/**
 * Virtual list component.
 * Maximum performance for extremely large lists.
 * It is based on algorithms for virtualization of screen objects.
 * @link https://github.com/DjonnyX/ng-virtual-list/blob/15.x/projects/ng-virtual-list/src/lib/components/list-item/ng-virtual-list-item.component.ts
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
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class NgVirtualListItemComponent extends BaseVirtualListItemComponent implements OnInit {
  protected readonly _service = inject(NgVirtualListService);


  private _$maxClickDistance = new BehaviorSubject<number>(DEFAULT_CLICK_DISTANCE);
  $maxClickDistance = this._$maxClickDistance.asObservable();
  private _selectHandler = (data: IRenderVirtualListItem<any> | null) =>
    /**
     * Selects a list item
     * @param selected - If the value is undefined, then the toggle method is executed, if false or true, then the selection/deselection is performed.
     */
    (selected: boolean | undefined = undefined) => {
      const valid = validateBoolean(selected, true);
      if (!valid) {
        console.error('The "selected" parameter must be of type `boolean` or `undefined`.');
        return;
      }
      this._service.select(data, selected);
    };

  private _collapseHandler = (data: IRenderVirtualListItem<any> | null) =>
    /**
    * Collapse list items
    * @param collapsed - If the value is undefined, then the toggle method is executed, if false or true, then the collapse/expand is performed.
    */
    (collapsed: boolean | undefined = undefined) => {
      const valid = validateBoolean(collapsed, true);
      if (!valid) {
        console.error('The "collapsed" parameter must be of type `boolean` or `undefined`.');
        return;
      }
      this._service.collapse(data, collapsed);
    };

  private _focusHandler = () =>
    /**
    * Focus a list item
    */
    (align: FocusAlignment = FocusAlignments.CENTER) => {
      this.focus(align);
    };

  protected _injector = inject(Injector);

  constructor() {
    super();

    this._id = this._service.generateComponentId();
    this._listId = this._service.id;
    this._displayId = createDisplayId(this._listId, this._id);
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

    $focused.pipe(
      takeUntil(this._$unsubscribe),
      tap(v => {
        this._service.areaFocus(v ? this._id : this._service.focusedId === this._id ? null : this._service.focusedId);
      }),
    ).subscribe();

    fromEvent(this.element, EVENT_FOCUS_IN).pipe(
      takeUntil(this._$unsubscribe),
      tap(e => {
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
      debounceTime(this._service.animationParams.navigateByKeyboard ?? NAVIGATION_BY_KEYBOARD_TIMER),
      switchMap(v => {
        if (v) {
          return this.keyKode();
        }
        return of(false);
      }),
    ).subscribe();

    combineLatest([$data, this._service.$methodOfSelecting, this._service.$selectedIds, this._service.$collapsedIds]).pipe(
      takeUntil(this._$unsubscribe),
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
      takeUntil(this._$unsubscribe),
      switchMap(e => {
        switch (e.key) {
          case KEY_SPACE: {
            e.stopImmediatePropagation();
            e.preventDefault();
            this._service.select(this._data);
            this._service.collapse(this._data);
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
      takeUntil(this._$unsubscribe),
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
      takeUntil(this._$unsubscribe),
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

  private focus(align: FocusAlignment = FocusAlignments.CENTER, index: number = -1) {
    if (this._service.listElement) {
      const tabIndex = index > -1 ? index : this._data?.config?.tabIndex ?? 0;
      let i = tabIndex;
      const element = this._service.listElement.querySelector<HTMLDivElement>(getListElementByIndex(i));
      if (!!element) {
        this._service.focus(element, align);
      }
    }
  }

  protected override updateConfig(v: IRenderVirtualListItem<any> | null) {
    this._$config.next({
      ...v?.config || {} as IDisplayObjectConfig, selected: this._isSelected, collapsed: this._isCollapsed, focused: this._$focused.getValue(),
      collapse: this._collapseHandler(v), select: this._selectHandler(v), focus: this._focusHandler(),
    });
  }

  onClickHandler() {
    this._service.itemClick(this._data);
  }
}
