import { Injectable } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { BehaviorSubject } from 'rxjs/internal/BehaviorSubject';
import { Subject, tap } from 'rxjs';
import { TrackBox } from './core/track-box';
import { IRenderVirtualListItem, IVirtualListItem } from './models';
import { IAnimationParams, IScrollOptions } from './interfaces';
import { IRenderVirtualListCollection } from './models/render-collection.model';
import { FocusAlignments, TextDirection, TextDirections } from './enums';
import { MethodsForSelectingTypes } from './enums/method-for-selecting-types';
import {
  BEHAVIOR_AUTO, BEHAVIOR_INSTANT, DEFAULT_ANIMATION_PARAMS, DEFAULT_CLICK_DISTANCE, DEFAULT_COLLAPSE_BY_CLICK, DEFAULT_SELECT_BY_CLICK,
} from './const';
import { FocusAlignment, Id } from './types';
import { getListElements, NGVL_INDEX } from './components/list-item/utils';
import { FocusItemParams } from './types/focus-item-params';

/**
 * NgVirtualListService
 * Maximum performance for extremely large lists.
 * It is based on algorithms for virtualization of screen objects.
 * @link https://github.com/DjonnyX/ng-virtual-list/blob/20.x/projects/ng-virtual-list/src/lib/ng-virtual-list.service.ts
 * @author Evgenii Alexandrovich Grebennikov
 * @email djonnyx@gmail.com
 */
@Injectable({
  providedIn: 'root'
})
export class NgVirtualListService {
  private _id: number = 0;
  get id() { return this._id; }

  private _nextComponentId: number = 0;

  private _$itemClick = new Subject<IRenderVirtualListItem<any> | null>();
  $itemClick = this._$itemClick.asObservable();

  private _$selectedIds = new BehaviorSubject<Array<Id> | Id | null>(null);
  $selectedIds = this._$selectedIds.asObservable();

  private _$collapsedIds = new BehaviorSubject<Array<Id>>([]);
  $collapsedIds = this._$collapsedIds.asObservable();

  private _$methodOfSelecting = new BehaviorSubject<MethodsForSelectingTypes>(0);
  $methodOfSelecting = this._$methodOfSelecting.asObservable();

  set methodOfSelecting(v: MethodsForSelectingTypes) {
    this._$methodOfSelecting.next(v);
  }

  private _$focusedId = new BehaviorSubject<Id | null>(null);
  $focusedId = this._$focusedId.asObservable();
  get focusedId() { return this._$focusedId.getValue(); }

  private _$focusItem = new Subject<FocusItemParams>();
  readonly $focusItem = this._$focusItem.asObservable();

  private _$scrollToStart = new Subject<IScrollOptions | undefined>();
  readonly $scrollToStart = this._$scrollToStart.asObservable();

  private _$scrollToEnd = new Subject<IScrollOptions | undefined>();
  readonly $scrollToEnd = this._$scrollToEnd.asObservable();

  lastFocusedItemId: number = -1;

  scrollStartOffset: number = 0;

  scrollEndOffset: number = 0;

  selectByClick: boolean = DEFAULT_SELECT_BY_CLICK;

  collapseByClick: boolean = DEFAULT_COLLAPSE_BY_CLICK;

  defaultItemValue: IVirtualListItem | null = null;

  isVertical: boolean = true;

  dynamic: boolean = true;

  snapScrollToStart: boolean = false;

  snapScrollToEnd: boolean = false;

  animationParams: IAnimationParams = DEFAULT_ANIMATION_PARAMS;

  private _trackBox: TrackBox | undefined;

  listElement: HTMLDivElement | null = null;

  private _$displayItems = new BehaviorSubject<IRenderVirtualListCollection>([]);
  readonly $displayItems = this._$displayItems.asObservable();
  get displayItems() { return this._$displayItems.getValue(); }

  private _collection: IRenderVirtualListCollection = [];
  set collection(v: IRenderVirtualListCollection) {
    if (this._collection === v) {
      return;
    }

    this._collection = v;

    this._$displayItems.next(v);
  }
  get collection() { return this._collection; }

  private _$langTextDir = new BehaviorSubject<TextDirection>(TextDirections.LTR);
  readonly $langTextDir = this._$langTextDir.asObservable();
  get langTextDir() { return this._$langTextDir.getValue(); }

  private _langTextDir: TextDirection = TextDirections.LTR;
  set langTextDir(v: TextDirection) {
    if (this._langTextDir === v) {
      return;
    }

    this._langTextDir = v;

    this._$langTextDir.next(v);
  }

  get scrollBarSize() { return this._$scrollBarSize.getValue(); }

  private _scrollBarSize: number = 0;
  set scrollBarSize(v: number) {
    if (this._scrollBarSize === v) {
      return;
    }

    this._scrollBarSize = v;

    this._$scrollBarSize.next(v);
  }
  private _$scrollBarSize = new BehaviorSubject<number>(this._scrollBarSize);
  readonly $scrollBarSize = this._$scrollBarSize.asObservable();

  private _$clickDistance = new BehaviorSubject<number>(DEFAULT_CLICK_DISTANCE);
  readonly $clickDistance = this._$clickDistance.asObservable();
  get clickDistance() { return this._$clickDistance.getValue(); }

  private _clickDistance: number = DEFAULT_CLICK_DISTANCE;
  set clickDistance(v: number) {
    if (this._clickDistance === v) {
      return;
    }

    this._clickDistance = v;

    this._$clickDistance.next(v);
  }

  constructor() {
    this._$methodOfSelecting.pipe(
      takeUntilDestroyed(),
      tap(v => {
        switch (v) {
          case MethodsForSelectingTypes.SELECT: {
            const curr = this._$selectedIds.getValue();
            if (typeof curr !== 'number' && typeof curr !== 'string') {
              this._$selectedIds.next(null);
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
            this._$selectedIds.next(null);
            break;
          }
        }
      }),
    ).subscribe();
  }

  setSelectedIds(ids: Array<Id> | Id | null) {
    if (JSON.stringify(this._$selectedIds.getValue()) !== JSON.stringify(ids)) {
      this._$selectedIds.next(ids);
    }
  }

  setCollapsedIds(ids: Array<Id>) {
    if (JSON.stringify(this._$collapsedIds.getValue()) !== JSON.stringify(ids)) {
      this._$collapsedIds.next(ids);
    }
  }

  itemClick(data: IRenderVirtualListItem | null) {
    this._$itemClick.next(data);
    if (this.collapseByClick) {
      this.collapse(data);
    }
    if (this.selectByClick) {
      this.select(data);
    }
  }

  update(immediately: boolean = false) {
    this._trackBox?.changes(immediately);
  }

  /**
   * Selects a list item
   * @param data 
   * @param selected - If the value is undefined, then the toggle method is executed, if false or true, then the selection/deselection is performed.
   */
  select(data: IRenderVirtualListItem | null, selected: boolean | undefined = undefined) {
    if (!!data && data.config.selectable) {
      switch (this._$methodOfSelecting.getValue()) {
        case MethodsForSelectingTypes.SELECT: {
          const curr = this._$selectedIds.getValue() as (Id | undefined);
          if (selected === undefined) {
            this._$selectedIds.next(curr !== data?.id ? data?.id : null);
          } else {
            this._$selectedIds.next(selected ? data?.id : null);
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
          this._$selectedIds.next(null);
        }
      }
    }
  }

  /**
    * Collapse list items
    * @param data 
    * @param collapsed - If the value is undefined, then the toggle method is executed, if false or true, then the collapse/expand is performed.
    */
  collapse(data: IRenderVirtualListItem | null, collapsed: boolean | undefined = undefined) {
    if (!!data && data.config.sticky > 0 && data.config.collapsable) {
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

  focus(element: HTMLElement, align: FocusAlignment = FocusAlignments.CENTER, behavior: ScrollBehavior = BEHAVIOR_AUTO): boolean {
    element.focus({ preventScroll: true });
    if (!!element.parentElement) {
      const position = parseFloat(element.parentElement?.getAttribute('position') ?? '0');
      this._$focusItem.next({ element, position, align, behavior });
      return true;
    }
    return false;
  }

  focusFirstElement() {
    const elements = this.listElement?.querySelectorAll<HTMLDivElement>(getListElements()),
      elList = (elements ? Array.from(elements) : []).sort((a, b) => {
        const indexA = Number(a.getAttribute(NGVL_INDEX)), indexB = Number(b.getAttribute(NGVL_INDEX));
        if (indexA > indexB) return 1;
        if (indexA < indexB) return -1;
        return 0;
      });
    let element: HTMLElement | undefined = undefined;
    for (let i = 0, l = elList.length; i < l; i++) {
      const el = elList[i], index = Number(el.getAttribute(NGVL_INDEX));
      if (!!el && index > 0) {
        element = el;
        break;
      }
    }
    if (!!element) {
      this.focus(element, FocusAlignments.CENTER, BEHAVIOR_INSTANT);
    }
  }

  areaFocus(id: Id | null) {
    this._$focusedId.next(id);
  }

  initialize(id: number, trackBox: TrackBox) {
    this._id = id;
    this._trackBox = trackBox;
  }

  generateComponentId() {
    return this._nextComponentId = this._nextComponentId === Number.MAX_SAFE_INTEGER
      ? 0 : this._nextComponentId + 1;
  }

  scrollToStart(options?: IScrollOptions) {
    this._$scrollToStart.next(options);
  }

  scrollToEnd(options?: IScrollOptions) {
    this._$scrollToEnd.next(options);
  }
}
