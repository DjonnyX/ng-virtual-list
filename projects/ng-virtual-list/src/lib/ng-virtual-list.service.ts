import { Injectable } from '@angular/core';
import { Subject, tap } from 'rxjs';
import { TrackBox } from './utils/trackBox';
import { IRenderVirtualListItem } from './models';
import { BehaviorSubject } from 'rxjs/internal/BehaviorSubject';
import { Id } from './types';
import { MethodsForSelectingTypes } from './enums/method-for-selecting-types';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { DEFAULT_SELECT_BY_CLICK } from './const';

@Injectable({
  providedIn: 'root'
})
export class NgVirtualListService {
  private _nextComponentId: number = 0;

  private _$itemClick = new Subject<IRenderVirtualListItem<any> | undefined>();
  $itemClick = this._$itemClick.asObservable();

  private _$selectedIds = new BehaviorSubject<Array<Id> | Id | undefined>(undefined);
  $selectedIds = this._$selectedIds.asObservable();

  private _$methodOfSelecting = new BehaviorSubject<MethodsForSelectingTypes>(0);
  $methodOfSelecting = this._$methodOfSelecting.asObservable();

  set methodOfSelecting(v: MethodsForSelectingTypes) {
    this._$methodOfSelecting.next(v);
  }

  selectByClick: boolean = DEFAULT_SELECT_BY_CLICK;

  private _trackBox: TrackBox | undefined;

  constructor() {
    this._$methodOfSelecting.pipe(
      takeUntilDestroyed(),
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

  itemClick(data: IRenderVirtualListItem | undefined) {
    if (this.selectByClick) {
      this.select(data);
    }
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

  initialize(trackBox: TrackBox) {
    this._trackBox = trackBox;
  }

  generateComponentId() {
    return this._nextComponentId = this._nextComponentId === Number.MAX_SAFE_INTEGER
      ? 0 : this._nextComponentId + 1;
  }
}
