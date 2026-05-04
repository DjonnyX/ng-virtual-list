import { ChangeDetectionStrategy, Component, computed, DestroyRef, effect, ElementRef, inject, Signal, signal, TemplateRef, viewChild } from '@angular/core';
import { takeUntilDestroyed, toSignal } from '@angular/core/rxjs-interop';
import { map, tap } from 'rxjs';
import { ISize } from '../../../interfaces';
import { IRenderVirtualListItem } from '../../../models/render-item.model';
import { IDisplayObjectConfig, IDisplayObjectMeasures } from '../../../models';
import {
  DEFAULT_ZINDEX, DISPLAY_BLOCK, DISPLAY_NONE, HIDDEN_ZINDEX, PART_DEFAULT_ITEM, PART_ITEM_COLLAPSED, PART_ITEM_EVEN,
  PART_ITEM_FOCUSED, PART_ITEM_NEW, PART_ITEM_ODD, PART_ITEM_SELECTED, PART_ITEM_SNAPPED, PART_DEFAULT_ITEM_FX, PART_ITEM_FX_COLLAPSED,
  PART_ITEM_FX_EVEN, PART_ITEM_FX_FOCUSED, PART_ITEM_FX_NEW, PART_ITEM_FX_ODD, PART_ITEM_FX_SELECTED, PART_ITEM_FX_SNAPPED,
  PX, SIZE_100_PERSENT, SIZE_AUTO, TRANSLATE_3D, VISIBILITY_HIDDEN, VISIBILITY_VISIBLE, PART_ITEM_ROW_ODD, PART_ITEM_ROW_EVEN,
  PART_ITEM_ROW_FX_ODD, PART_ITEM_ROW_FX_EVEN,
} from '../../../const';
import { ITemplateContext } from '../interfaces';
import {
  CLASS_NAME_FOCUS, CLASS_NAME_SNAPPED, CLASS_NAME_SNAPPED_OUT, ID, ITEM_ID, POSITION, POSITION_ZERO,
} from '../const';
import { TextDirections } from '../../../enums';
import { TextDirection } from '../../../types';
import { NgVirtualListPublicService } from '../../../ng-virtual-list-public.service';
import { createDisplayId, matrix3d } from '../utils';
import { NgVirtualListService } from '../../../ng-virtual-list.service';
import { IBaseVirtualListItemComponent } from '../../../interfaces/base-virtual-list-item-component';
import { Color } from '../../../types';

/**
 * BaseVirtualListItemComponent
 * @link https://github.com/DjonnyX/ng-virtual-list/blob/20.x/projects/ng-virtual-list/src/lib/components/list-item/base/base-virtual-list-item-component.ts
 * @author Evgenii Alexandrovich Grebennikov
 * @email djonnyx@gmail.com
 */
@Component({
  selector: 'ng-base-virtual-list-item',
  template: '',
  standalone: false,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class BaseVirtualListItemComponent implements IBaseVirtualListItemComponent {
  protected _item = viewChild<ElementRef<HTMLDivElement>>('item');

  protected _container = viewChild<ElementRef<HTMLDivElement>>('container');

  private _apiService = inject(NgVirtualListPublicService);

  protected readonly _service = inject(NgVirtualListService);

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

  protected readonly fxPart = signal<string>(PART_DEFAULT_ITEM_FX);

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

  protected _blendColor: Color | null = null;

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
    this._id = this._service.generateComponentId();
    this._listId = this._service.id;
    this._displayId = createDisplayId(this._listId, this._id);

    effect(() => {
      const part = this.part();
      this._elementRef.nativeElement.setAttribute('part', part);
    });

    const $focus = this._service.$focusedId.pipe(
      takeUntilDestroyed(),
      map(id => id === this.itemId),
    );

    $focus.pipe(
      takeUntilDestroyed(),
      tap(() => {
        this.updatePartStr(this._data, this._isSelected, this._isCollapsed);
      }),
    ).subscribe();

    const focus = toSignal($focus);

    this.classes = computed(() => {
      const data = this.data(), _focus = focus() ?? false;
      return {
        [CLASS_NAME_SNAPPED]: data?.config?.snapped ?? false, [CLASS_NAME_SNAPPED_OUT]: data?.config?.snappedOut ?? false,
        [CLASS_NAME_FOCUS]: _focus,
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
    const data = this._data, regular = this.regular, length = this._regularLength, el = this._elementRef.nativeElement,
      itemElement = this._item()?.nativeElement, containerElement = this._container()?.nativeElement;
    if (!!data && !!el && !!itemElement && !!containerElement) {
      el.setAttribute(ITEM_ID, `${data.id}`);
      const styles = el.style, itemElementStyles = itemElement.style;
      styles.zIndex = data.config.zIndex;
      this._blendColor = data.config.blendColor ?? null;
      if (!!containerElement && !!data.config.blendColor) {
        containerElement.style.opacity = String(data.config.opacity);
      }
      if (!!data.config.filter) {
        styles.filter = data.config.filter;
      }
      if (this.item?.config?.dynamic && data.config.isStub === true) {
        el.style.visibility = VISIBILITY_HIDDEN;
      }
      if (regular) {
        el.setAttribute(POSITION, POSITION_ZERO);
        styles.transform = `${TRANSLATE_3D}(${data.config.isVertical ?
          (this._langTextDir === TextDirections.RTL ? this._scrollBarSize : 0) :
          data.measures.delta}${PX}, ${data.config.isVertical ? data.measures.delta : 0}${PX}, ${POSITION_ZERO})`;
      } else {
        el.setAttribute(POSITION, `${data.config.isVertical ? data.measures.y : data.measures.x}`);
        styles.transform = matrix3d(data.measures.transformedX, data.measures.transformedY, data.measures.z, data.measures.scaleX, data.measures.scaleY,
          data.measures.scaleZ, data.measures.rotationX, data.measures.rotationY, data.measures.rotationZ);
      }
      if (data.config.divides > 1) {
        styles.height = data.config.isVertical ? `${data.measures.row.size}${PX}` : `${data.measures.height}${PX}`;
        styles.width = data.config.isVertical ? `${data.measures.width}${PX}` : `${data.measures.row.size}${PX}`;
        itemElementStyles.minWidth = styles.minWidth = `${data.measures.minWidth}${PX}`;
        itemElementStyles.maxWidth = styles.maxWidth = `${data.measures.maxWidth}${PX}`;
        itemElementStyles.minHeight = styles.minHeight = `${data.measures.minHeight}${PX}`;
        itemElementStyles.maxHeight = styles.maxHeight = `${data.measures.maxHeight}${PX}`;

        itemElementStyles.height = data.config.isVertical ? data.config.dynamic ? SIZE_AUTO : `${data.measures.height}${PX}` : regular ? length : `${data.measures.height}${PX}`;
        itemElementStyles.width = data.config.isVertical ? regular ? length : `${data.measures.width}${PX}` : data.config.dynamic ? SIZE_AUTO : `${data.measures.width}${PX}`;
      } else {
        styles.height = data.config.isVertical ? data.config.dynamic ? SIZE_AUTO : `${data.measures.height}${PX}` : regular ? length : `${data.measures.height}${PX}`;
        styles.width = data.config.isVertical ? regular ? length : `${data.measures.width}${PX}` : data.config.dynamic ? SIZE_AUTO : `${data.measures.width}${PX}`;
        styles.minWidth = `${data.measures.minWidth}${PX}`;
        styles.maxWidth = `${data.measures.maxWidth}${PX}`;
        styles.minHeight = `${data.measures.minHeight}${PX}`;
        styles.maxHeight = `${data.measures.maxHeight}${PX}`;
      }
    } else {
      el.removeAttribute(ID);
    }
  }

  protected updatePartStr(v: IRenderVirtualListItem | null, isSelected: boolean, isCollapsed: boolean) {
    const odd = v?.config.odd, rowOdd = v?.measures.row.odd;

    let part = PART_DEFAULT_ITEM, fxPart = PART_DEFAULT_ITEM_FX;
    part += odd ? PART_ITEM_ODD : PART_ITEM_EVEN;
    part += rowOdd ? PART_ITEM_ROW_ODD : PART_ITEM_ROW_EVEN;
    fxPart += odd ? PART_ITEM_FX_ODD : PART_ITEM_FX_EVEN;
    fxPart += rowOdd ? PART_ITEM_ROW_FX_ODD : PART_ITEM_ROW_FX_EVEN;
    if (v ? v.config.snapped : false) {
      part += PART_ITEM_SNAPPED;
      fxPart += PART_ITEM_FX_SNAPPED;
    }
    if (isSelected) {
      part += PART_ITEM_SELECTED;
      fxPart += PART_ITEM_FX_SELECTED;
    }
    if (isCollapsed) {
      part += PART_ITEM_COLLAPSED;
      fxPart += PART_ITEM_FX_COLLAPSED;
    }
    if (v ? v.config.new : false) {
      part += PART_ITEM_NEW;
      fxPart += PART_ITEM_FX_NEW;
    }
    if (this.hasFocus()) {
      part += PART_ITEM_FOCUSED;
      fxPart += PART_ITEM_FX_FOCUSED;
    }
    this.part.set(part);
    this.fxPart.set(fxPart);
  }

  protected hasFocus() {
    return this._service.focusedId === this.itemId;
  }

  getBounds(): ISize {
    const el = this._item()?.nativeElement;
    if (!!el) {
      const width = el.offsetWidth, height = el.offsetHeight;
      return { width: width > 0 ? width : 1, height: height > 0 ? height : 1, };
    }
    return { width: 1, height: 1 };
  }

  show() {
    if (!this.item?.config?.dynamic) {
      return;
    }
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
    if (!this.item?.config?.dynamic) {
      return;
    }
    const el = this._elementRef.nativeElement,
      styles = el.style;
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