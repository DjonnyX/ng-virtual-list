import { ChangeDetectionStrategy, ChangeDetectorRef, Component, ElementRef, inject, signal, TemplateRef } from '@angular/core';
import { IRenderVirtualListItem } from '../models/render-item.model';
import { IRect } from '../types';
import {
  POSITION_ABSOLUTE, POSITION_STICKY, PX, SIZE_100_PERSENT, SIZE_AUTO, TRANSLATE_3D, VISIBILITY_HIDDEN,
  VISIBILITY_VISIBLE, ZEROS_TRANSLATE_3D,
} from '../const';

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
export class NgVirtualListItemComponent {
  private static __nextId: number = 0;

  private _id!: number;
  get id() {
    return this._id;
  }

  private _cdr = inject(ChangeDetectorRef);

  data = signal<IRenderVirtualListItem | undefined>(undefined);
  private _data: IRenderVirtualListItem | undefined = undefined;
  set item(v: IRenderVirtualListItem | undefined) {
    if (this._data === v) {
      return;
    }

    const data = this._data = v;

    if (data) {
      const styles = this._elementRef.nativeElement.style;
      styles.zIndex = String(data.config.sticky);
      if (data.config.snapped) {
        styles.transform = ZEROS_TRANSLATE_3D;
        styles.position = POSITION_STICKY;
      } else {
        styles.position = POSITION_ABSOLUTE;
        styles.transform = `${TRANSLATE_3D}(${data.config.isVertical ? 0 : data.measures.x}${PX}, ${data.config.isVertical ? data.measures.y : 0}${PX} , 0)`;
      }
      styles.height = data.config.isVertical ? data.config.dynamic ? SIZE_AUTO : `${data.measures.height}${PX}` : SIZE_100_PERSENT;
      styles.width = data.config.isVertical ? SIZE_100_PERSENT : data.config.dynamic ? SIZE_AUTO : `${data.measures.width}${PX}`;
    }

    this.data.set(v);

    this._cdr.markForCheck();
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
    this._id = NgVirtualListItemComponent.__nextId = NgVirtualListItemComponent.__nextId === Number.MAX_SAFE_INTEGER
      ? 0 : NgVirtualListItemComponent.__nextId + 1;
  }

  getBounds(): IRect {
    const el: HTMLElement = this._elementRef.nativeElement,
      { width, height, left, top } = el.getBoundingClientRect();
    return { width, height, x: left, y: top };
  }

  show() {
    const styles = this._elementRef.nativeElement.style;
    if (styles.visibility === VISIBILITY_VISIBLE) {
      return;
    }

    styles.visibility = VISIBILITY_VISIBLE;
  }

  hide() {
    const styles = this._elementRef.nativeElement.style;
    if (styles.visibility === VISIBILITY_HIDDEN) {
      return;
    }

    styles.visibility = VISIBILITY_HIDDEN;
  }
}
