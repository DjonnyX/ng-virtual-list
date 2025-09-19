import { CommonModule } from '@angular/common';
import { ChangeDetectionStrategy, Component, ElementRef, inject, signal, TemplateRef } from '@angular/core';
import { IRenderVirtualListItem } from '../models/render-item.model';
import { Id, IRect, ISize } from '../types';
import {
  DEFAULT_ZINDEX, DISPLAY_BLOCK, DISPLAY_NONE, HIDDEN_ZINDEX, PART_DEFAULT_ITEM, PART_ITEM_COLLAPSED, PART_ITEM_EVEN, PART_ITEM_FOCUSED, PART_ITEM_ODD,
  PART_ITEM_SELECTED, PART_ITEM_SNAPPED, POSITION_ABSOLUTE, POSITION_STICKY, PX, SIZE_100_PERSENT, SIZE_AUTO, TRANSLATE_3D,
  VISIBILITY_HIDDEN, VISIBILITY_VISIBLE, ZEROS_TRANSLATE_3D,
} from '../const';
import { BaseVirtualListItemComponent } from '../models/base-virtual-list-item-component';
import { NgVirtualListService } from '../ng-virtual-list.service';
import { takeUntilDestroyed, toObservable } from '@angular/core/rxjs-interop';
import { map, tap, combineLatest, fromEvent } from 'rxjs';
import { MethodsForSelectingTypes } from '../enums/method-for-selecting-types';
import { IRenderVirtualListItemConfig } from '../models/render-item-config.model';

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
}

/**
 * Virtual list item component
 * @link https://github.com/DjonnyX/ng-virtual-list/blob/19.x/projects/ng-virtual-list/src/lib/components/ng-virtual-list-item.component.ts
 * @author Evgenii Grebennikov
 * @email djonnyx@gmail.com
 */
@Component({
  selector: 'ng-virtual-list-item',
  imports: [CommonModule],
  templateUrl: './ng-virtual-list-item.component.html',
  styleUrl: './ng-virtual-list-item.component.scss',
  host: {
    'class': 'ngvl__item',
    'role': 'listitem',
  },
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class NgVirtualListItemComponent extends BaseVirtualListItemComponent {
  private _id!: number;
  get id() {
    return this._id;
  }

  protected _service = inject(NgVirtualListService);

  private _isSelected: boolean = false;

  private _isCollapsed: boolean = false;

  config = signal<IItemConfig>({} as IItemConfig);

  measures = signal<IRect & {
    /**
     * Delta is calculated for Snapping Method.ADVANCED
     */
    delta: number;
  } | undefined>(undefined);

  focus = signal<boolean>(false);

  part = signal<string>(PART_DEFAULT_ITEM);

  regular: boolean = false;

  data = signal<IRenderVirtualListItem | undefined>(undefined);
  private _data: IRenderVirtualListItem | undefined = undefined;
  set item(v: IRenderVirtualListItem | undefined) {
    if (this._data === v) {
      return;
    }

    this._data = v;

    this.updatePartStr(v, this._isSelected, this._isCollapsed);

    this.updateConfig(v);

    this.updateMeasures(v);

    this.update();

    this.data.set(v);
  }

  private _regularLength: string = SIZE_100_PERSENT;
  set regularLength(v: string) {
    if (this._regularLength === v) {
      return;
    }

    this._regularLength = v;

    this.update();
  }

  get item() {
    return this._data;
  }

  get itemId() {
    return this._data?.id;
  }

  itemRenderer = signal<TemplateRef<any> | undefined>(undefined);

  set renderer(v: TemplateRef<any> | undefined) {
    this.itemRenderer.set(v);
  }

  private _elementRef: ElementRef<HTMLElement> = inject(ElementRef<HTMLElement>);
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

  constructor() {
    super();
    this._id = this._service.generateComponentId();

    const $data = toObservable(this.data);

    fromEvent(this.element, EVENT_FOCUS_IN).pipe(
      takeUntilDestroyed(),
      tap(e => {
        this.focus.set(true);

        this.updateConfig(this._data);

        this.updatePartStr(this._data, this._isSelected, this._isCollapsed);
      }),
    ).subscribe(),

      fromEvent(this.element, EVENT_FOCUS_OUT).pipe(
        takeUntilDestroyed(),
        tap(e => {
          this.focus.set(false);

          this.updateConfig(this._data);

          this.updatePartStr(this._data, this._isSelected, this._isCollapsed);
        }),
      ).subscribe(),

      fromEvent<KeyboardEvent>(this.element, EVENT_KEY_DOWN).pipe(
        takeUntilDestroyed(),
        tap(e => {
          switch (e.key) {
            case KEY_SPACE: {
              e.stopImmediatePropagation();
              e.preventDefault();
              if (this._service.selectByClick) {
                this._service.select(this._data);
              }
              if (this._service.collapseByClick) {
                this._service.collapse(this._data);
              }
              break;
            }
            case KEY_ARR_LEFT:
              if (!this.config().isVertical) {
                e.stopImmediatePropagation();
                e.preventDefault();
                this.focusPrev();
              }
              break;
            case KEY_ARR_UP:
              if (this.config().isVertical) {
                e.stopImmediatePropagation();
                e.preventDefault();
                this.focusPrev();
              }
              break;
            case KEY_ARR_RIGHT:
              if (!this.config().isVertical) {
                e.stopImmediatePropagation();
                e.preventDefault();
                this.focusNext();
              }
              break;
            case KEY_ARR_DOWN:
              if (this.config().isVertical) {
                e.stopImmediatePropagation();
                e.preventDefault();
                this.focusNext();
              }
              break;
          }
        }),
      ).subscribe();

    combineLatest([$data, this._service.$methodOfSelecting, this._service.$selectedIds, this._service.$collapsedIds]).pipe(
      takeUntilDestroyed(),
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

  private focusNext() {
    if (this._service.listElement) {
      const tabIndex = this._data?.config?.tabIndex ?? 0, length = this._service.collection?.length ?? 0;
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
      const tabIndex = this._data?.config?.tabIndex ?? 0;
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
    this.measures.set(v?.measures ? { ...v.measures } : undefined)
  }

  private updateConfig(v: IRenderVirtualListItem<any> | undefined) {
    this.config.set({
      ...v?.config || {} as IItemConfig, selected: this._isSelected, collapsed: this._isCollapsed, focus: this.focus(),
      collapse: this._collapseHandler(v), select: this._selectHandler(v)
    });
  }

  private update() {
    const data = this._data, regular = this.regular, length = this._regularLength;
    if (data) {
      const styles = this._elementRef.nativeElement.style;
      styles.zIndex = data.config.zIndex;
      if (data.config.snapped) {
        this._elementRef.nativeElement.setAttribute('position', data.config.sticky === 1 ? '0' : `${data.config.isVertical ? data.measures.y : data.measures.x}`);
        styles.transform = data.config.sticky === 1 ? ZEROS_TRANSLATE_3D : `${TRANSLATE_3D}(${data.config.isVertical ? 0 : data.measures.x}${PX}, ${data.config.isVertical ? data.measures.y : 0}${PX} , 0)`;;
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
    if (this.focus()) {
      part += PART_ITEM_FOCUSED;
    }
    this.part.set(part);
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
    styles.zIndex = this._data?.config?.zIndex ?? DEFAULT_ZINDEX;
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
    this._service.itemClick(this._data);
  }
}
