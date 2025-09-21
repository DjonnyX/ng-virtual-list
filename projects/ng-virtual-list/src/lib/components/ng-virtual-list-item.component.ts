import { ChangeDetectionStrategy, ChangeDetectorRef, Component, ElementRef, TemplateRef } from '@angular/core';
import { IRenderVirtualListItem } from '../models/render-item.model';
import { Id, IRect, ISize } from '../types';
import {
  DEFAULT_ZINDEX, DISPLAY_BLOCK, DISPLAY_NONE, HIDDEN_ZINDEX, PART_DEFAULT_ITEM, PART_ITEM_COLLAPSED, PART_ITEM_EVEN, PART_ITEM_FOCUSED, PART_ITEM_ODD, PART_ITEM_SELECTED, PART_ITEM_SNAPPED, POSITION_ABSOLUTE, POSITION_STICKY, PX, SIZE_100_PERSENT,
  SIZE_AUTO, TRANSLATE_3D, VISIBILITY_HIDDEN, VISIBILITY_VISIBLE, ZEROS_TRANSLATE_3D,
} from '../const';
import { BaseVirtualListItemComponent } from '../models/base-virtual-list-item-component';
import { NgVirtualListService } from '../ng-virtual-list.service';
import { map, takeUntil, tap } from 'rxjs/operators';
import { BehaviorSubject, combineLatest, fromEvent, Subject } from 'rxjs';
import { IRenderVirtualListItemConfig } from '../models/render-item-config.model';
import { MethodsForSelectingTypes } from '../enums/method-for-selecting-types';

interface IItemConfig extends IRenderVirtualListItemConfig {
  /**
   * Determines whether the element has focus or not.
   */
  focus: boolean;
  /**
   * Determines whether the element is selected or not.
   */
  selected: boolean;
  /**
   * Determines whether the element is collapsed or not.
   */
  collapsed: boolean;
  /**
    * Selects a list item
    * @param selected - If the value is undefined, then the toggle method is executed, if false or true, then the selection/deselection is performed.
    */
  select: (selected: boolean | undefined) => void;
  /**
    * Collapse list items
    * @param collapsed - If the value is undefined, then the toggle method is executed, if false or true, then the collapse/expand is performed.
    */
  collapse: (collapsed: boolean | undefined) => void;
}

const ATTR_AREA_SELECTED = 'area-selected', TABINDEX = 'ng-vl-index',
  KEY_SPACE = " ", KEY_ARR_LEFT = "ArrowLeft", KEY_ARR_UP = "ArrowUp", KEY_ARR_RIGHT = "ArrowRight", KEY_ARR_DOWN = "ArrowDown",
  EVENT_FOCUS_IN = 'focusin', EVENT_FOCUS_OUT = 'focusout', EVENT_KEY_DOWN = 'keydown';

const getElementByIndex = (index: number) => {
  return `[${TABINDEX}="${index}"]`;
};

/**
 * Virtual list item component
 * @link https://github.com/DjonnyX/ng-virtual-list/blob/14.x/projects/ng-virtual-list/src/lib/components/ng-virtual-list-item.component.ts
 * @author Evgenii Grebennikov
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
export class NgVirtualListItemComponent extends BaseVirtualListItemComponent {
  protected _$unsubscribe = new Subject<void>();

  private _id!: number;
  get id() {
    return this._id;
  }

  private _part = PART_DEFAULT_ITEM;
  get part() { return this._part; }

  private _isSelected: boolean = false;

  private _isCollapsed: boolean = false;

  private _$config = new BehaviorSubject<IItemConfig>({} as IItemConfig);
  $config = this._$config.asObservable();

  measures = new BehaviorSubject<IRect & {
    /**
     * Delta is calculated for Snapping Method.ADVANCED
     */
    delta: number;
  } | undefined>(undefined);

  private _$focus = new BehaviorSubject<boolean>(false);
  $focus = this._$focus.asObservable();

  private _$part = new BehaviorSubject<string>(PART_DEFAULT_ITEM);
  $part = this._$part.asObservable();

  regular: boolean = false;

  data: IRenderVirtualListItem | undefined;

  private _$data = new BehaviorSubject<IRenderVirtualListItem | undefined>(this.data);
  private $data = this._$data.asObservable();

  set item(v: IRenderVirtualListItem | undefined) {
    if (this.data === v) {
      return;
    }

    this.data = v;

    this.updatePartStr(v, this._isSelected, this._isCollapsed);

    this.updateConfig(v);

    this.updateMeasures(v);

    this.update();

    this._$data.next(v);

    this._cdr.detectChanges();
  }

  private _regularLength: string = SIZE_100_PERSENT;
  set regularLength(v: string) {
    if (this._regularLength === v) {
      return;
    }

    this._regularLength = v;

    this.update();

    this._cdr.detectChanges();
  }

  get item() {
    return this.data;
  }

  get itemId() {
    return this.data?.id;
  }

  itemRenderer: TemplateRef<any> | undefined;

  set renderer(v: TemplateRef<any> | undefined) {
    if (this.itemRenderer === v) {
      return;
    }

    this.itemRenderer = v;

    this._cdr.markForCheck();
  }

  get element() {
    return this._elementRef.nativeElement;
  }

  private _selectHandler = (data: IRenderVirtualListItem<any> | undefined) =>
    /**
     * Selects a list item
     * @param selected - If the value is undefined, then the toggle method is executed, if false or true, then the selection/deselection is performed.
     */
    (selected: boolean | undefined = undefined) => {
      this._service.select(data, selected);
    };

  private _collapseHandler = (data: IRenderVirtualListItem<any> | undefined) =>
    /**
    * Collapse list items
    * @param collapsed - If the value is undefined, then the toggle method is executed, if false or true, then the collapse/expand is performed.
    */
    (collapsed: boolean | undefined = undefined) => {
      this._service.collapse(data, collapsed);
    };

  constructor(private _cdr: ChangeDetectorRef, private _elementRef: ElementRef<HTMLElement>, private _service: NgVirtualListService) {
    super();
    this._id = this._service.generateComponentId();

    const $data = this.$data,
      $focus = this.$focus;

    this._elementRef.nativeElement.setAttribute('id', String(this._id));

    $focus.pipe(
      takeUntil(this._$unsubscribe),
      tap(v => {
        this._service.areaFocus(v ? this._id : this._service.focusedId === this._id ? null : this._service.focusedId);
      }),
    ).subscribe();

    fromEvent(this.element, EVENT_FOCUS_IN).pipe(
      takeUntil(this._$unsubscribe),
      tap(e => {
        this._$focus.next(true);

        this.updateConfig(this.data);

        this.updatePartStr(this.data, this._isSelected, this._isCollapsed);
      }),
    ).subscribe(),

      fromEvent(this.element, EVENT_FOCUS_OUT).pipe(
        takeUntil(this._$unsubscribe),
        tap(e => {
          this._$focus.next(false);

          this.updateConfig(this.data);

          this.updatePartStr(this.data, this._isSelected, this._isCollapsed);
        }),
      ).subscribe(),

      fromEvent<KeyboardEvent>(this.element, EVENT_KEY_DOWN).pipe(
        takeUntil(this._$unsubscribe),
        tap(e => {
          switch (e.key) {
            case KEY_SPACE: {
              e.stopImmediatePropagation();
              e.preventDefault();
              if (this._service.selectByClick) {
                this._service.select(this.data);
              }
              if (this._service.collapseByClick) {
                this._service.collapse(this.data);
              }
              break;
            }
            case KEY_ARR_LEFT:
              if (!this._$config.getValue().isVertical) {
                e.stopImmediatePropagation();
                e.preventDefault();
                this.focusPrev();
              }
              break;
            case KEY_ARR_UP:
              if (this._$config.getValue().isVertical) {
                e.stopImmediatePropagation();
                e.preventDefault();
                this.focusPrev();
              }
              break;
            case KEY_ARR_RIGHT:
              if (!this._$config.getValue().isVertical) {
                e.stopImmediatePropagation();
                e.preventDefault();
                this.focusNext();
              }
              break;
            case KEY_ARR_DOWN:
              if (this._$config.getValue().isVertical) {
                e.stopImmediatePropagation();
                e.preventDefault();
                this.focusNext();
              }
              break;
          }
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

        this.updatePartStr(this.data, this._isSelected, isCollapsed);

        this.updateConfig(this.data);

        this.updateMeasures(this.data);
      }),
    ).subscribe();
  }

  private focusNext() {
    if (this._service.listElement) {
      const tabIndex = this.data?.config?.tabIndex ?? 0, length = this._service.collection?.length ?? 0;
      let index = tabIndex;
      while (index <= length) {
        index++;
        const el = this._service.listElement.querySelector<HTMLDivElement>(getElementByIndex(index));
        if (el) {
          this._service.focus(el);
          break;
        }
      }
    }
  }

  private focusPrev() {
    if (this._service.listElement) {
      const tabIndex = this.data?.config?.tabIndex ?? 0;
      let index = tabIndex;
      while (index >= 0) {
        index--;
        const el = this._service.listElement.querySelector<HTMLDivElement>(getElementByIndex(index));
        if (el) {
          this._service.focus(el);
          break;
        }
      }
    }
  }

  private updateMeasures(v: IRenderVirtualListItem<any> | undefined) {
    this.measures.next(v?.measures ? { ...v.measures } : undefined)
  }

  private updateConfig(v: IRenderVirtualListItem<any> | undefined) {
    this._$config.next({
      ...v?.config || {} as IItemConfig, selected: this._isSelected, collapsed: this._isCollapsed, focus: this._$focus.getValue(),
      collapse: this._collapseHandler(v), select: this._selectHandler(v)
    });
  }

  private update() {
    const data = this.data, regular = this.regular, length = this._regularLength;
    if (data) {
      const styles = this._elementRef.nativeElement.style;
      styles.zIndex = data.config.zIndex;
      if (data.config.snapped) {
        this._elementRef.nativeElement.setAttribute('position', data.config.sticky === 1 ? '0' : `${data.config.isVertical ? data.measures.y : data.measures.x}`);
        styles.transform = data.config.sticky === 1 ? ZEROS_TRANSLATE_3D : `${TRANSLATE_3D}(${data.config.isVertical ? 0 : data.measures.x}${PX}, ${data.config.isVertical ? data.measures.y : 0}${PX} , 0)`;
        if (!data.config.isSnappingMethodAdvanced) {
          styles.position = POSITION_STICKY;
        }
      } else {
        styles.position = POSITION_ABSOLUTE;
        if (regular) {
          this._elementRef.nativeElement.setAttribute('position', '0');
          styles.transform = `${TRANSLATE_3D}(${data.config.isVertical ? 0 : data.measures.delta}${PX}, ${data.config.isVertical ? data.measures.delta : 0}${PX} , 0)`;
        } else {
          this._elementRef.nativeElement.setAttribute('position', `${data.config.isVertical ? data.measures.y : data.measures.x}`);
          styles.transform = `${TRANSLATE_3D}(${data.config.isVertical ? 0 : data.measures.x}${PX}, ${data.config.isVertical ? data.measures.y : 0}${PX} , 0)`;
        }
      }
      styles.height = data.config.isVertical ? data.config.dynamic ? SIZE_AUTO : `${data.measures.height}${PX}` : regular ? length : SIZE_100_PERSENT;
      styles.width = data.config.isVertical ? regular ? length : SIZE_100_PERSENT : data.config.dynamic ? SIZE_AUTO : `${data.measures.width}${PX}`;
    }

    this._cdr.markForCheck();
  }

  private updatePartStr(v: IRenderVirtualListItem | undefined, isSelected: boolean, isCollapsed: boolean) {
    let odd = false;
    if (v?.index !== undefined) {
      odd = v.index % 2 === 0;
    }

    let part = PART_DEFAULT_ITEM;
    part += odd ? PART_ITEM_ODD : PART_ITEM_EVEN;
    if (v ? v.config.snapped : false) {
      part += PART_ITEM_SNAPPED;
    }
    if (isSelected) {
      part += PART_ITEM_SELECTED;
    }
    if (isCollapsed) {
      part += PART_ITEM_COLLAPSED;
    }
    if (this._$focus.getValue()) {
      part += PART_ITEM_FOCUSED;
    }
    this._$part.next(part);
  }

  getBounds(): ISize {
    const el: HTMLElement = this._elementRef.nativeElement,
      { width, height } = el.getBoundingClientRect();
    return { width, height };
  }

  show() {
    const styles = this._elementRef.nativeElement.style;
    if (this.regular) {
      if (styles.display === DISPLAY_BLOCK) {
        return;
      }

      styles.display = DISPLAY_BLOCK;
    } else {
      if (styles.visibility === VISIBILITY_VISIBLE) {
        return;
      }

      styles.visibility = VISIBILITY_VISIBLE;
    }
    styles.zIndex = this.data?.config?.zIndex ?? DEFAULT_ZINDEX;
  }

  hide() {
    const styles = this._elementRef.nativeElement.style;
    if (this.regular) {
      if (styles.display === DISPLAY_NONE) {
        return;
      }

      styles.display = DISPLAY_NONE;
    } else {
      if (styles.visibility === VISIBILITY_HIDDEN) {
        return;
      }

      styles.visibility = VISIBILITY_HIDDEN;
    }
    styles.position = POSITION_ABSOLUTE;
    styles.transform = ZEROS_TRANSLATE_3D;
    styles.zIndex = HIDDEN_ZINDEX;
  }

  onClickHandler() {
    this._service.itemClick(this.data);
  }

  ngOnDestroy(): void {
    if (this._$unsubscribe) {
      this._$unsubscribe.next();
      this._$unsubscribe.complete();
    }
  }
}

