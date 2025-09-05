import { ChangeDetectionStrategy, ChangeDetectorRef, Component, ElementRef, inject, signal, TemplateRef } from '@angular/core';
import { IRenderVirtualListItem } from '../models/render-item.model';
import { ISize } from '../types';
import {
  DEFAULT_ZINDEX, DISPLAY_BLOCK, DISPLAY_NONE, HIDDEN_ZINDEX, PART_DEFAULT_ITEM, PART_ITEM_EVEN, PART_ITEM_ODD,
  PART_ITEM_SNAPPED, POSITION_ABSOLUTE, POSITION_STICKY, PX, SIZE_100_PERSENT, SIZE_AUTO, TRANSLATE_3D, VISIBILITY_HIDDEN,
  VISIBILITY_VISIBLE, ZEROS_TRANSLATE_3D,
} from '../const';
import { BaseVirtualListItemComponent } from '../models/base-virtual-list-item-component';
import { NgVirtualListService } from '../ng-virtual-list.service';

/**
 * Virtual list item component
 * @link https://github.com/DjonnyX/ng-virtual-list/blob/17.x/projects/ng-virtual-list/src/lib/components/ng-virtual-list-item.component.ts
 * @author Evgenii Grebennikov
 * @email djonnyx@gmail.com
 */
@Component({
  selector: 'ng-virtual-list-item',
  standalone: false,
  templateUrl: './ng-virtual-list-item.component.html',
  styleUrl: './ng-virtual-list-item.component.scss',
  host: {
    'class': 'ngvl__item',
  },
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class NgVirtualListItemComponent extends BaseVirtualListItemComponent {
  private _id!: number;
  get id() {
    return this._id;
  }

  private _cdr = inject(ChangeDetectorRef);

  protected _service = inject(NgVirtualListService);

  private _part = PART_DEFAULT_ITEM;
  get part() { return this._part; }

  regular: boolean = false;

  data = signal<IRenderVirtualListItem | undefined>(undefined);
  private _data: IRenderVirtualListItem | undefined = undefined;
  set item(v: IRenderVirtualListItem | undefined) {
    if (this._data === v) {
      return;
    }

    this._data = v;

    this.updatePartStr(v);

    this.update();

    this.data.set(v);

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

  constructor() {
    super();
    this._id = this._service.generateComponentId();
  }

  private update() {
    const data = this._data, regular = this.regular, length = this._regularLength;
    if (data) {
      const styles = this._elementRef.nativeElement.style;
      styles.zIndex = data.config.zIndex;
      if (data.config.snapped) {
        styles.transform = data.config.sticky === 1 ? ZEROS_TRANSLATE_3D : `${TRANSLATE_3D}(${data.config.isVertical ? 0 : data.measures.x}${PX}, ${data.config.isVertical ? data.measures.y : 0}${PX} , 0)`;;
        if (!data.config.isSnappingMethodAdvanced) {
          styles.position = POSITION_STICKY;
        }
      } else {
        styles.position = POSITION_ABSOLUTE;
        if (regular) {
          styles.transform = `${TRANSLATE_3D}(${data.config.isVertical ? 0 : data.measures.delta}${PX}, ${data.config.isVertical ? data.measures.delta : 0}${PX} , 0)`;
        } else {
          styles.transform = `${TRANSLATE_3D}(${data.config.isVertical ? 0 : data.measures.x}${PX}, ${data.config.isVertical ? data.measures.y : 0}${PX} , 0)`;
        }
      }
      styles.height = data.config.isVertical ? data.config.dynamic ? SIZE_AUTO : `${data.measures.height}${PX}` : regular ? length : SIZE_100_PERSENT;
      styles.width = data.config.isVertical ? regular ? length : SIZE_100_PERSENT : data.config.dynamic ? SIZE_AUTO : `${data.measures.width}${PX}`;
    }

    this._cdr.markForCheck();
  }

  private updatePartStr(v: IRenderVirtualListItem | undefined) {
    let odd = false;
    if (v?.index !== undefined) {
      odd = v.index % 2 === 0;
    }

    let part = PART_DEFAULT_ITEM;
    part += odd ? PART_ITEM_ODD : PART_ITEM_EVEN;
    if (v ? v.config.snapped : false) {
      part += PART_ITEM_SNAPPED;
    }
    this._part = part;
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
