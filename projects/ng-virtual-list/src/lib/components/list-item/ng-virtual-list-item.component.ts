import { ChangeDetectionStrategy, ChangeDetectorRef, Component, ElementRef, OnInit, TemplateRef } from '@angular/core';
import { map, tap, combineLatest, fromEvent, Subject, takeUntil, BehaviorSubject } from 'rxjs';
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

interface ITemplateContext<D = any> {
  data: D;
  prevData: D;
  nextData: D;
  measures: IDisplayObjectMeasures | undefined;
  config: IDisplayObjectConfig;
  reseted: boolean;
  index: number;
}

const ZEROS_POSITION = -1000,
  DEFAULT_TEMPLATE_CONTEXT: ITemplateContext = {
    data: undefined,
    prevData: undefined,
    nextData: undefined,
    measures: undefined,
    config: {
      focused: false,
      selected: false,
      collapsed: false,
      focus: function (): void { },
      select: function (selected: boolean | undefined): void { },
      collapse: function (collapsed: boolean | undefined): void { },
      new: false,
      odd: false,
      even: false,
      collapsable: false,
      sticky: 0,
      selectable: false,
      snap: false,
      snapped: false,
      snappedOut: false,
      isVertical: false,
      dynamic: false,
      isSnappingMethodAdvanced: false,
      tabIndex: 0,
      zIndex: '0',
    },
    reseted: false,
    index: -1,
  },
  ATTR_AREA_SELECTED = 'area-selected', NGVL_INDEX = 'ngvl-index', POSITION = 'position', POSITION_ZERO = '0', ID = 'item-id',
  KEY_SPACE = " ", KEY_ARR_LEFT = "ArrowLeft", KEY_ARR_UP = "ArrowUp", KEY_ARR_RIGHT = "ArrowRight", KEY_ARR_DOWN = "ArrowDown",
  EVENT_FOCUS_IN = 'focusin', EVENT_FOCUS_OUT = 'focusout', EVENT_KEY_DOWN = 'keydown',
  CLASS_NAME_SNAPPED = 'snapped', CLASS_NAME_SNAPPED_OUT = 'snapped-out', CLASS_NAME_FOCUS = 'focus';

const getElementByIndex = (index: number) => {
  return `[${NGVL_INDEX}="${index}"]`;
};

/**
 * Virtual list component.
 * Maximum performance for extremely large lists.
 * It is based on algorithms for virtualization of screen objects.
 * @link https://github.com/DjonnyX/ng-virtual-list/blob/14.x/projects/ng-virtual-list/src/lib/components/list-item/ng-virtual-list-item.component.ts
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
  protected _$unsubscribe = new Subject<void>();

  private _id!: number;
  get id() {
    return this._id;
  }

  private _part = PART_DEFAULT_ITEM;
  get part() { return this._part; }

  private _isSelected: boolean = false;

  private _isCollapsed: boolean = false;

  private _$config = new BehaviorSubject<IDisplayObjectConfig>({} as IDisplayObjectConfig);
  $config = this._$config.asObservable();

  private _$measures = new BehaviorSubject<IDisplayObjectMeasures | undefined>(undefined);
  $measures = this._$measures.asObservable();

  private _$focused = new BehaviorSubject<boolean>(false);
  $focused = this._$focused.asObservable();

  private _$reseted = new BehaviorSubject<boolean>(false);
  $reseted = this._$reseted.asObservable();

  private _$part = new BehaviorSubject<string>(PART_DEFAULT_ITEM);
  $part = this._$part.asObservable();

  private _$maxClickDistance = new BehaviorSubject<number>(DEFAULT_CLICK_DISTANCE);
  $maxClickDistance = this._$maxClickDistance.asObservable();

  data: IRenderVirtualListItem | undefined = undefined;

  private _$data = new BehaviorSubject<IRenderVirtualListItem | undefined>(this.data);
  private $data = this._$data.asObservable();

  set item(v: IRenderVirtualListItem | undefined) {
    if (this.data === v || this.data?.id === -1 || !v) {
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

  private _$classes = new BehaviorSubject<{ [cName: string]: boolean; }>({});
  $classes = this._$classes.asObservable();

  private _$index = new BehaviorSubject<number>(-1);
  $index = this._$index.asObservable();

  private _$templateContext = new BehaviorSubject<ITemplateContext>(DEFAULT_TEMPLATE_CONTEXT);
  $templateContext = this._$templateContext.asObservable();

  regular: boolean = false;

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

  constructor(private _cdr: ChangeDetectorRef, private _elementRef: ElementRef<HTMLElement>, private _service: NgVirtualListService) {
    super();
    this._id = this._service.generateComponentId();

    this._elementRef.nativeElement.setAttribute('id', String(this._id));
  }

  ngOnInit(): void {
    const $data = this.$data,
      $config = this.$config,
      $measures = this.$measures,
      $focused = this.$focused,
      $reseted = this.$reseted;

    this._service.$clickDistance.pipe(
      takeUntil(this._$unsubscribe),
      tap(v => {
        this._$maxClickDistance.next(v);
      }),
    ).subscribe();

    combineLatest([$data, $focused]).pipe(
      takeUntil(this._$unsubscribe),
      tap(([data, focused]) => {
        this._$classes.next({ [CLASS_NAME_SNAPPED]: data?.config?.snapped ?? false, [CLASS_NAME_SNAPPED_OUT]: data?.config?.snappedOut ?? false, [CLASS_NAME_FOCUS]: focused });
      }),
    ).subscribe();

    $config.pipe(
      takeUntil(this._$unsubscribe),
      tap(v => {
        this._$index.next(v?.tabIndex ?? -1);
      }),
    ).subscribe();

    combineLatest([$data, $config, $measures, $reseted]).pipe(
      takeUntil(this._$unsubscribe),
      tap(([data, config, measures, reseted]) => {
        this._$templateContext.next({
          data: data?.data, prevData: data?.previouseData, nextData: data?.nextData, measures,
          config, reseted, index: data?.index ?? - 1
        });
      }),
    ).subscribe();

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

        this.updateConfig(this.data);

        this.updatePartStr(this.data, this._isSelected, this._isCollapsed);
      }),
    ).subscribe(),

      fromEvent(this.element, EVENT_FOCUS_OUT).pipe(
        takeUntil(this._$unsubscribe),
        tap(e => {
          this._$focused.next(false);

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
              this._service.select(this.data);
              this._service.collapse(this.data);
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

  private focus(align: FocusAlignment = FocusAlignments.CENTER) {
    if (this._service.listElement) {
      const tabIndex = this.data?.config?.tabIndex ?? 0;
      let index = tabIndex;
      const el = this._service.listElement.querySelector<HTMLDivElement>(getElementByIndex(index));
      if (el) {
        this._service.focus(el, align);
      }
    }
  }

  private updateMeasures(v: IRenderVirtualListItem<any> | undefined) {
    this._$measures.next(v?.measures ? { ...v.measures } : undefined)
  }

  private updateConfig(v: IRenderVirtualListItem<any> | undefined) {
    this._$config.next({
      ...v?.config || {} as IDisplayObjectConfig, selected: this._isSelected, collapsed: this._isCollapsed, focused: this._$focused.getValue(),
      collapse: this._collapseHandler(v), select: this._selectHandler(v), focus: this._focusHandler(),
    });
  }

  private update() {
    const data = this.data, regular = this.regular, length = this._regularLength;
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
    if (v ? v.config.new : false) {
      part += PART_ITEM_NEW;
    }
    if (this._$focused.getValue()) {
      part += PART_ITEM_FOCUSED;
    }
    this._$part.next(part);
  }

  getBounds(): ISize {
    const el: HTMLElement = this._elementRef.nativeElement,
      { width, height } = el.getBoundingClientRect();
    return { width: width > 0 ? width : 1, height: height > 0 ? height : 1, };
  }

  show() {
    this._$reseted.next(false);

    const el = this._elementRef.nativeElement as HTMLElement,
      styles = el.style;
    styles.zIndex = this.data?.config?.zIndex ?? DEFAULT_ZINDEX;
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
    this._$reseted.next(true);

    const el = this._elementRef.nativeElement as HTMLElement,
      styles = el.style;
    styles.position = POSITION_ABSOLUTE;
    styles.transform = `${TRANSLATE_3D}(${this.data?.config?.isVertical ? 0 : ZEROS_POSITION},${this.data?.config?.isVertical ? 0 : ZEROS_POSITION},0)`;
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
    this._service.itemClick(this.data);
  }

  ngOnDestroy(): void {
    if (this._$unsubscribe) {
      this._$unsubscribe.next();
      this._$unsubscribe.complete();
    }
  }
}
