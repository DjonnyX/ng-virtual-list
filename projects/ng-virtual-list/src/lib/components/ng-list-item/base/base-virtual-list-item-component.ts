import { computed, DestroyRef, ElementRef, inject, Signal, signal, TemplateRef } from '@angular/core';
import { ISize } from '../../../interfaces';
import { IRenderVirtualListItem } from '../../../models/render-item.model';
import { IDisplayObjectConfig, IDisplayObjectMeasures } from '../../../models';
import {
  DEFAULT_ZINDEX, DISPLAY_BLOCK, DISPLAY_NONE, HIDDEN_ZINDEX, PART_DEFAULT_ITEM, PART_ITEM_COLLAPSED, PART_ITEM_EVEN,
  PART_ITEM_FOCUSED, PART_ITEM_NEW, PART_ITEM_ODD, PART_ITEM_SELECTED, PART_ITEM_SNAPPED, POSITION_ABSOLUTE, PX, SIZE_100_PERSENT,
  SIZE_AUTO, TRANSLATE_3D, VISIBILITY_HIDDEN, VISIBILITY_VISIBLE,
} from '../../../const';
import { ITemplateContext } from '../interfaces';
import {
  CLASS_NAME_FOCUS, CLASS_NAME_SNAPPED, CLASS_NAME_SNAPPED_OUT, ID, ITEM_ID, POSITION, POSITION_ZERO, TRANSLATE_3D_HIDDEN,
} from '../const';
import { TextDirection, TextDirections } from '../../../enums';
import { NgVirtualListPublicService } from '../../../ng-virtual-list-public.service';

/**
 * BaseVirtualListItemComponent
 * @link https://github.com/DjonnyX/ng-virtual-list/blob/20.x/projects/ng-virtual-list/src/lib/components/list-item/base/base-virtual-list-item-component.ts
 * @author Evgenii Alexandrovich Grebennikov
 * @email djonnyx@gmail.com
 */
export class BaseVirtualListItemComponent {
  private _apiService = inject(NgVirtualListPublicService);

  protected _id!: number;
  get id() {
    return this._id;
  }

  protected _listId!: number;
  get listId() {
    return this._listId;
  }

  protected _displayId!: string;
  get displayId() {
    return this._displayId;
  }

  protected _isSelected: boolean = false;

  protected _isCollapsed: boolean = false;

  protected readonly config = signal<IDisplayObjectConfig>({} as IDisplayObjectConfig);

  protected readonly measures = signal<IDisplayObjectMeasures | null>(null);

  protected readonly focused = signal<boolean>(false);

  protected readonly part = signal<string>(PART_DEFAULT_ITEM);

  protected readonly data = signal<IRenderVirtualListItem | null>(null);
  protected _data: IRenderVirtualListItem | null = null;
  set item(v: IRenderVirtualListItem | null) {
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

  protected readonly classes!: Signal<{ [cName: string]: boolean; }>;

  protected readonly index!: Signal<number>;

  protected readonly templateContext!: Signal<ITemplateContext>;

  public regular: boolean = false;

  protected _scrollBarSize: number = 0;

  protected _langTextDir: TextDirection = TextDirections.LTR;

  protected _regularLength: string = SIZE_100_PERSENT;
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

  protected readonly itemRenderer = signal<TemplateRef<any> | undefined>(undefined);

  protected _renderer: TemplateRef<any> | undefined;
  set renderer(v: TemplateRef<any> | undefined) {
    if (this._renderer !== v) {
      this._renderer = v;
      this.itemRenderer.set(v);
    }
  }

  protected _elementRef = inject<ElementRef<HTMLElement>>(ElementRef);
  get element() {
    return this._elementRef.nativeElement;
  }

  protected _destroyRef = inject(DestroyRef);

  constructor() {
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
        config, reseted: false, index: data?.index ?? - 1, api: this._apiService,
      };
    });
  }

  protected updateMeasures(v: IRenderVirtualListItem<any> | null) {
    this.measures.set(v?.measures ? { ...v.measures } : null)
  }

  protected updateConfig(v: IRenderVirtualListItem<any> | null) {
    this.config.set({
      ...v?.config || {} as IDisplayObjectConfig, selected: this._isSelected, collapsed: this._isCollapsed, focused: this.focused(),
    });
  }

  protected update() {
    const data = this._data, regular = this.regular, length = this._regularLength, el = this._elementRef.nativeElement;
    if (data) {
      el.setAttribute(ITEM_ID, `${data.id}`);
      const styles = el.style;
      styles.zIndex = data.config.zIndex;
      styles.position = POSITION_ABSOLUTE;
      if (data.config.isStub === true) {
        el.style.visibility = VISIBILITY_HIDDEN;
      }
      if (regular) {
        el.setAttribute(POSITION, POSITION_ZERO);
        styles.transform = `${TRANSLATE_3D}(${data.config.isVertical ? (this._langTextDir === TextDirections.RTL ? this._scrollBarSize : 0) : data.measures.delta}${PX}, ${data.config.isVertical ? data.measures.delta : 0}${PX}, ${POSITION_ZERO})`;
      } else {
        el.setAttribute(POSITION, `${data.config.isVertical ? data.measures.y : data.measures.x}`);
        styles.transform = `${TRANSLATE_3D}(${data.config.isVertical ? 0 : data.measures.x}${PX}, ${data.config.isVertical ? data.measures.y : 0}${PX}, ${POSITION_ZERO})`;
      }
      styles.height = data.config.isVertical ? data.config.dynamic ? SIZE_AUTO : `${data.measures.height}${PX}` : regular ? length : SIZE_100_PERSENT;
      styles.width = data.config.isVertical ? regular ? length : SIZE_100_PERSENT : data.config.dynamic ? SIZE_AUTO : `${data.measures.width}${PX}`;
    } else {
      el.removeAttribute(ID);
    }
  }

  protected updatePartStr(v: IRenderVirtualListItem | null, isSelected: boolean, isCollapsed: boolean) {
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
      const isStub = this._data?.config?.isStub ?? false;
      if (!isStub) {
        if (styles.visibility === VISIBILITY_VISIBLE) {
          return;
        }
        styles.visibility = VISIBILITY_VISIBLE;
      }
    }
  }

  hide() {
    const el = this._elementRef.nativeElement,
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
}