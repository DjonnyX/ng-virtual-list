import { ChangeDetectionStrategy, Component, computed, DestroyRef, ElementRef, inject, Signal, signal, TemplateRef } from '@angular/core';
import { takeUntilDestroyed, toObservable } from '@angular/core/rxjs-interop';
import { map, tap, combineLatest, fromEvent, switchMap, of } from 'rxjs';
import { IRenderVirtualListItem } from '../../models/render-item.model';
import { FocusAlignment, Id, ISize } from '../../types';
import {
  DEFAULT_CLICK_DISTANCE, DEFAULT_ZINDEX, DISPLAY_BLOCK, DISPLAY_NONE, HIDDEN_ZINDEX, PART_DEFAULT_ITEM, PART_ITEM_COLLAPSED, PART_ITEM_EVEN,
  PART_ITEM_FOCUSED, PART_ITEM_NEW, PART_ITEM_ODD, PART_ITEM_SELECTED, PART_ITEM_SNAPPED, POSITION_ABSOLUTE, PX, SIZE_100_PERSENT,
  SIZE_AUTO, TRANSLATE_3D, VISIBILITY_HIDDEN, VISIBILITY_VISIBLE,
} from '../../const';
import { BaseVirtualListItemComponent } from '../../models/base-virtual-list-item-component';
import { NgVirtualListService } from '../../ng-virtual-list.service';
import { MethodsForSelectingTypes } from '../../enums/method-for-selecting-types';
import { validateBoolean } from '../../utils/validation';
import { FocusAlignments, TextDirections } from '../../enums';
import { IDisplayObjectConfig, IDisplayObjectMeasures } from '../../models';
import { getListElementByIndex } from './utils';

interface ITemplateContext<D = any> {
  data: D;
  prevData: D;
  nextData: D;
  measures: IDisplayObjectMeasures | undefined;
  config: IDisplayObjectConfig;
  reseted: boolean;
  index: number;
}

const TRANSLATE_3D_HIDDEN = 'translate3d(-1000px,-1000px,0)', NAVIGATE_TO_ATTEMT = 5,
  ATTR_AREA_SELECTED = 'area-selected', POSITION = 'position', POSITION_ZERO = '0', ID = 'item-id',
  KEY_SPACE = ' ', KEY_ARR_LEFT = 'ArrowLeft', KEY_ARR_UP = 'ArrowUp', KEY_ARR_RIGHT = 'ArrowRight', KEY_ARR_DOWN = 'ArrowDown',
  EVENT_FOCUS_IN = 'focusin', EVENT_FOCUS_OUT = 'focusout', EVENT_KEY_DOWN = 'keydown',
  CLASS_NAME_SNAPPED = 'snapped', CLASS_NAME_SNAPPED_OUT = 'snapped-out', CLASS_NAME_FOCUS = 'focus';

/**
 * Virtual list component.
 * Maximum performance for extremely large lists.
 * It is based on algorithms for virtualization of screen objects.
 * @link https://github.com/DjonnyX/ng-virtual-list/blob/20.x/projects/ng-virtual-list/src/lib/components/list-item/ng-virtual-list-item.component.ts
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
export class NgVirtualListItemComponent extends BaseVirtualListItemComponent {
  private _id: number;
  get id() {
    return this._id;
  }

  protected _service = inject(NgVirtualListService);

  private _isSelected: boolean = false;

  private _isCollapsed: boolean = false;

  config = signal<IDisplayObjectConfig>({} as IDisplayObjectConfig);

  measures = signal<IDisplayObjectMeasures | undefined>(undefined);

  focused = signal<boolean>(false);

  part = signal<string>(PART_DEFAULT_ITEM);

  maxClickDistance = signal<number>(DEFAULT_CLICK_DISTANCE);

  data = signal<IRenderVirtualListItem | undefined>(undefined);
  private _data: IRenderVirtualListItem | undefined = undefined;
  set item(v: IRenderVirtualListItem | undefined) {
    if (this._data === v || this._data?.id === -1 || !v) {
      return;
    }

    this._data = v;

    this.updatePartStr(v, this._isSelected, this._isCollapsed);

    this.updateConfig(v);

    this.updateMeasures(v);

    this.update();

    this.data.set(v);
  }

  classes: Signal<{ [cName: string]: boolean; }>;

  index: Signal<number>;

  templateContext: Signal<ITemplateContext>;

  regular: boolean = false;

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
      const valid = validateBoolean(selected, true);
      if (!valid) {
        console.error('The "selected" parameter must be of type `boolean` or `undefined`.');
        return;
      }
      this._service.select(data, selected);
    };

  private _collapseHandler = (data: IRenderVirtualListItem<any> | undefined) =>
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

  private _destroyRef = inject(DestroyRef);

  constructor() {
    super();
    this._id = this._service.generateComponentId();

    this._elementRef.nativeElement.setAttribute('id', String(this._id));

    this._service.$clickDistance.pipe(
      takeUntilDestroyed(),
      tap(v => {
        this.maxClickDistance.set(v);
      }),
    ).subscribe();

    this.classes = computed(() => {
      const data = this.data(), focused = this.focused();
      return {
        [CLASS_NAME_SNAPPED]: data?.config?.snapped ?? false, [CLASS_NAME_SNAPPED_OUT]: data?.config?.snappedOut ?? false,
        [CLASS_NAME_FOCUS]: focused,
      };
    });

    this.index = computed(() => {
      return this.config()?.tabIndex ?? -1;
    });

    this.templateContext = computed(() => {
      const data = this.data(), measures = this.measures(), config = this.config();
      return {
        data: data?.data, prevData: data?.previouseData, nextData: data?.nextData, measures,
        config, reseted: false, index: data?.index ?? - 1
      };
    });

    const $data = toObservable(this.data),
      $focused = toObservable(this.focused);

    $focused.pipe(
      takeUntilDestroyed(),
      tap(v => {
        this._service.areaFocus(v ? this._id : this._service.focusedId === this._id ? null : this._service.focusedId);
      }),
    ).subscribe();

    fromEvent(this.element, EVENT_FOCUS_IN).pipe(
      takeUntilDestroyed(),
      tap(e => {
        this.focused.set(true);

        this.updateConfig(this._data);

        this.updatePartStr(this._data, this._isSelected, this._isCollapsed);
      }),
    ).subscribe(),

      fromEvent(this.element, EVENT_FOCUS_OUT).pipe(
        takeUntilDestroyed(),
        tap(e => {
          this.focused.set(false);

          this.updateConfig(this._data);

          this.updatePartStr(this._data, this._isSelected, this._isCollapsed);
        }),
      ).subscribe();

    $focused.pipe(
      takeUntilDestroyed(),
      switchMap(v => {
        if (v) {
          return fromEvent<KeyboardEvent>(this.element, EVENT_KEY_DOWN).pipe(
            takeUntilDestroyed(this._destroyRef),
            tap(e => {
              switch (e.key) {
                case KEY_SPACE: {
                  e.stopImmediatePropagation();
                  e.preventDefault();
                  this._service.select(this._data);
                  this._service.collapse(this._data);
                  break;
                }
                case KEY_ARR_LEFT:
                  if (!this.config().isVertical) {
                    this.toPrevItem(e);
                  }
                  break;
                case KEY_ARR_UP:
                  if (this.config().isVertical) {
                    this.toPrevItem(e);
                  }
                  break;
                case KEY_ARR_RIGHT:
                  if (!this.config().isVertical) {
                    this.toNextItem(e);
                  }
                  break;
                case KEY_ARR_DOWN:
                  if (this.config().isVertical) {
                    this.toNextItem(e);
                  }
                  break;
              }
            }),
          );
        }
        return of(false);
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

  private toNextItem(e: Event, attempt: number = NAVIGATE_TO_ATTEMT) {
    const index = this.focusNext();
    if (index > -1) {
      this._service.lastFocusedItemId = index;
      if (!!e && e.cancelable) {
        e.stopImmediatePropagation();
        e.preventDefault();
      }
      return;
    }

    if (this._service.lastFocusedItemId > -1) {
      this.focus(FocusAlignments.CENTER, this._service.lastFocusedItemId);
    }

    if (attempt > 0) {
      this.toNextItem(e, attempt - 1);
    }
  }

  private toPrevItem(e: Event, attempt: number = NAVIGATE_TO_ATTEMT) {
    const index = this.focusPrev();
    if (index > -1) {
      this._service.lastFocusedItemId = index;
      if (!!e && e.cancelable) {
        e.stopImmediatePropagation();
        e.preventDefault();
      }
      return;
    }

    if (this._service.lastFocusedItemId > -1) {
      this.focus(FocusAlignments.CENTER, this._service.lastFocusedItemId);
    }

    if (attempt > 0) {
      this.toPrevItem(e, attempt - 1);
    }
  }

  private focusNext(): number {
    if (this._service.listElement) {
      const tabIndex = this._data?.config?.tabIndex ?? 0, length = this._service.collection?.length ?? 0;
      let index = tabIndex;
      while (index <= length) {
        index++;
        const element = this._service.listElement.querySelector<HTMLDivElement>(getListElementByIndex(index));
        if (!!element && element.style.visibility !== VISIBILITY_HIDDEN) {
          this._service.focus(element);
          return index;
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

  private updateMeasures(v: IRenderVirtualListItem<any> | undefined) {
    this.measures.set(v?.measures ? { ...v.measures } : undefined)
  }

  private updateConfig(v: IRenderVirtualListItem<any> | undefined) {
    this.config.set({
      ...v?.config || {} as IDisplayObjectConfig, selected: this._isSelected, collapsed: this._isCollapsed, focused: this.focused(),
      collapse: this._collapseHandler(v), select: this._selectHandler(v), focus: this._focusHandler(),
    });
  }

  private update() {
    const data = this._data, regular = this.regular, length = this._regularLength;
    if (data) {
      this._elementRef.nativeElement.setAttribute(ID, `${data.id}`);
      const styles = this._elementRef.nativeElement.style;
      styles.zIndex = data.config.zIndex;
      styles.position = POSITION_ABSOLUTE;
      if (regular) {
        this._elementRef.nativeElement.setAttribute(POSITION, POSITION_ZERO);
        styles.transform = `${TRANSLATE_3D}(${data.config.isVertical ? (this._service.langTextDir === TextDirections.RTL ? this._service.scrollBarSize : 0) : data.measures.delta}${PX}, ${data.config.isVertical ? data.measures.delta : 0}${PX}, ${POSITION_ZERO})`;
      } else {
        this._elementRef.nativeElement.setAttribute(POSITION, `${data.config.isVertical ? data.measures.y : data.measures.x}`);
        styles.transform = `${TRANSLATE_3D}(${data.config.isVertical ? 0 : data.measures.x}${PX}, ${data.config.isVertical ? data.measures.y : 0}${PX}, ${POSITION_ZERO})`;
      }
      styles.height = data.config.isVertical ? data.config.dynamic ? SIZE_AUTO : `${data.measures.height}${PX}` : regular ? length : SIZE_100_PERSENT;
      styles.width = data.config.isVertical ? regular ? length : SIZE_100_PERSENT : data.config.dynamic ? SIZE_AUTO : `${data.measures.width}${PX}`;
    } else {
      this._elementRef.nativeElement.removeAttribute(ID);
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
    if (v ? v.config.new : false) {
      part += PART_ITEM_NEW;
    }
    if (this.focused()) {
      part += PART_ITEM_FOCUSED;
    }
    this.part.set(part);
  }

  getBounds(): ISize {
    const el: HTMLElement = this._elementRef.nativeElement,
      { width, height } = el.getBoundingClientRect();
    return { width: width > 0 ? width : 1, height: height > 0 ? height : 1, };
  }

  show() {
    const el = this._elementRef.nativeElement as HTMLElement,
      styles = el.style;
    styles.zIndex = this._data?.config?.zIndex ?? DEFAULT_ZINDEX;
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
  }

  hide() {
    const el = this._elementRef.nativeElement as HTMLElement,
      styles = el.style;
    styles.position = POSITION_ABSOLUTE;
    styles.transform = TRANSLATE_3D_HIDDEN;
    styles.zIndex = HIDDEN_ZINDEX;
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
  }

  onClickHandler() {
    this._service.itemClick(this._data);
  }
}
