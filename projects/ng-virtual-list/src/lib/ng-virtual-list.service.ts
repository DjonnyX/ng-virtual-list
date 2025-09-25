import { Injectable } from '@angular/core';
import { Subject, takeUntil, tap } from 'rxjs';
import { BehaviorSubject } from 'rxjs/internal/BehaviorSubject';
import { TrackBox } from './utils/trackBox';
import { IRenderVirtualListItem } from './models';
import { IRenderVirtualListCollection } from './models/render-collection.model';
import { FocusAlignments } from './enums';
import { MethodsForSelectingTypes } from './enums/method-for-selecting-types';
import { FocusAlignment, Id } from './types';
import { DEFAULT_COLLAPSE_BY_CLICK, DEFAULT_SELECT_BY_CLICK } from './const';

@Injectable({
  providedIn: 'root'
})
export class NgVirtualListService {
  protected _$unsubscribe = new Subject<void>();

  private _nextComponentId: number = 0;

  private _$itemClick = new Subject<IRenderVirtualListItem<any> | undefined>();
  $itemClick = this._$itemClick.asObservable();

  private _$selectedIds = new BehaviorSubject<Array<Id> | Id | undefined>(undefined);
  $selectedIds = this._$selectedIds.asObservable();

  private _$collapsedIds = new BehaviorSubject<Array<Id>>([]);
  $collapsedIds = this._$collapsedIds.asObservable();

  private _$methodOfSelecting = new BehaviorSubject<MethodsForSelectingTypes>(0);
  $methodOfSelecting = this._$methodOfSelecting.asObservable();

  set methodOfSelecting(v: MethodsForSelectingTypes) {
    this._$methodOfSelecting.next(v);
  }

  private _trackBox: TrackBox | undefined;

  private _$focusedId = new BehaviorSubject<Id | null>(null);
  $focusedId = this._$focusedId.asObservable();
  get focusedId() { return this._$focusedId.getValue(); }

  selectByClick: boolean = DEFAULT_SELECT_BY_CLICK;

  collapseByClick: boolean = DEFAULT_COLLAPSE_BY_CLICK;

  listElement: HTMLDivElement | null = null;

  collection: IRenderVirtualListCollection = [];

  constructor() {
    this._$methodOfSelecting.pipe(
      takeUntil(this._$unsubscribe),
      tap(v => {
        switch (v) {
          case MethodsForSelectingTypes.SELECT: {
            const curr = this._$selectedIds.getValue();
            if (typeof curr !== 'number' && typeof curr !== 'string') {
              this._$selectedIds.next(undefined);
            }
            break;
          }
          case MethodsForSelectingTypes.MULTI_SELECT: {
            if (!Array.isArray(this._$selectedIds.getValue())) {
              this._$selectedIds.next([]);
            }
            break;
          }
          case MethodsForSelectingTypes.NONE:
          default: {
            this._$selectedIds.next(undefined);
            break;
          }
        }
      }),
    ).subscribe();
  }

  setSelectedIds(ids: Array<Id> | Id | undefined) {
    if (JSON.stringify(this._$selectedIds.getValue()) !== JSON.stringify(ids)) {
      this._$selectedIds.next(ids);
    }
  }

  setCollapsedIds(ids: Array<Id>) {
    if (JSON.stringify(this._$collapsedIds.getValue()) !== JSON.stringify(ids)) {
      this._$collapsedIds.next(ids);
    }
  }

  itemClick(data: IRenderVirtualListItem | undefined) {
    this._$itemClick.next(data);
    if (this.collapseByClick) {
      this.collapse(data);
    }
    if (this.selectByClick) {
      this.select(data);
    }
  }

  update() {
    this._trackBox?.changes();
  }

  /**
   * Selects a list item
   * @param data 
   * @param selected - If the value is undefined, then the toggle method is executed, if false or true, then the selection/deselection is performed.
   */
  select(data: IRenderVirtualListItem | undefined, selected: boolean | undefined = undefined) {
    if (data && data.config.selectable) {
      switch (this._$methodOfSelecting.getValue()) {
        case MethodsForSelectingTypes.SELECT: {
          const curr = this._$selectedIds.getValue() as (Id | undefined);
          if (selected === undefined) {
            this._$selectedIds.next(curr !== data?.id ? data?.id : undefined);
          } else {
            this._$selectedIds.next(selected ? data?.id : undefined);
          }
          break;
        }
        case MethodsForSelectingTypes.MULTI_SELECT: {
          const curr = [...(this._$selectedIds.getValue() || []) as Array<Id>], index = curr.indexOf(data.id);
          if (selected === undefined) {
            if (index > -1) {
              curr.splice(index, 1);
              this._$selectedIds.next(curr);
            } else {
              this._$selectedIds.next([...curr, data.id]);
            }
          } else if (selected) {
            if (index > -1) {
              this._$selectedIds.next(curr);
            } else {
              this._$selectedIds.next([...curr, data.id]);
            }
          } else {
            if (index > -1) {
              curr.splice(index, 1);
              this._$selectedIds.next(curr);
            } else {
              this._$selectedIds.next(curr);
            }
          }
          break;
        }
        case MethodsForSelectingTypes.NONE:
        default: {
          this._$selectedIds.next(undefined);
        }
      }
    }
  }

  /**
    * Collapse list items
    * @param data 
    * @param collapsed - If the value is undefined, then the toggle method is executed, if false or true, then the collapse/expand is performed.
    */
  collapse(data: IRenderVirtualListItem | undefined, collapsed: boolean | undefined = undefined) {
    if (data && data.config.sticky > 0 && data.config.collapsable) {
      const curr = [...(this._$collapsedIds.getValue() || []) as Array<Id>], index = curr.indexOf(data.id);
      if (collapsed === undefined) {
        if (index > -1) {
          curr.splice(index, 1);
          this._$collapsedIds.next(curr);
        } else {
          this._$collapsedIds.next([...curr, data.id]);
        }
      } else if (collapsed) {
        if (index > -1) {
          this._$collapsedIds.next(curr);
        } else {
          this._$collapsedIds.next([...curr, data.id]);
        }
      } else {
        if (index > -1) {
          curr.splice(index, 1);
          this._$collapsedIds.next(curr);
        } else {
          this._$collapsedIds.next(curr);
        }
      }
    }
  }

  initialize(trackBox: TrackBox) {
    this._trackBox = trackBox;
  }

  itemToFocus: ((element: HTMLElement, position: number, align: FocusAlignment) => void) | undefined;

  focus(element: HTMLElement, align: FocusAlignment = FocusAlignments.CENTER) {
    element.focus({ preventScroll: true });
    if (element.parentElement) {
      const pos = parseFloat(element.parentElement?.getAttribute('position') ?? '0');
      this.itemToFocus?.(element, pos, align);
    }
  }

  areaFocus(id: Id | null) {
    this._$focusedId.next(id);
  }

  generateComponentId() {
    return this._nextComponentId = this._nextComponentId === Number.MAX_SAFE_INTEGER
      ? 0 : this._nextComponentId + 1;
  }

  destroy(): void {
    if (this._$unsubscribe) {
      this._$unsubscribe.next();
      this._$unsubscribe.complete();
    }
  }
}
