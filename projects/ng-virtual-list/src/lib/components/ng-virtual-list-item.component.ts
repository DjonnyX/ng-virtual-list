import { CommonModule } from '@angular/common';
import { ChangeDetectionStrategy, Component, ElementRef, inject, signal, TemplateRef } from '@angular/core';
import { IRenderVirtualListItem } from '../models/render-item.model';
import { IRect } from '../types';

/**
 * Virtual list item component
 * @homepage https://github.com/DjonnyX/ng-virtual-list/tree/main/projects/ng-virtual-list
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
  },
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class NgVirtualListItemComponent {
  private static __nextId: number = 0;

  private _id!: number;
  get id() {
    return this._id;
  }

  data = signal<IRenderVirtualListItem | undefined>(undefined);
  private _data: IRenderVirtualListItem | undefined = undefined;
  set item(v: IRenderVirtualListItem | undefined) {
    if (this._data === v) {
      return;
    }

    const data = this._data = v;

    if (data) {
      const styles = this._elementRef.nativeElement.style;
      styles.zIndex = data.config.sticky;
      if (data.config.snapped) {
        styles.transform = 'translate3d(0,0,0)';
        styles.position = 'sticky';
      } else {
        styles.position = 'absolute';
        styles.transform = `translate3d(${data.config.isVertical ? 0 : data.measures.x}px, ${data.config.isVertical ? data.measures.y : 0}px , 0)`;
      }
      styles.height = data.config.isVertical ? data.config.dynamic ? 'auto' : `${data.measures.height}px` : '100%';
      styles.width = data.config.isVertical ? '100%' : data.config.dynamic ? 'auto' : `${data.measures.width}px`;
    }

    this.data.set(v);
  }

  itemRenderer = signal<TemplateRef<any> | undefined>(undefined);

  set renderer(v: TemplateRef<any> | undefined) {
    this.itemRenderer.set(v);
  }

  private _elementRef = inject(ElementRef<HTMLElement>);

  constructor() {
    this._id = NgVirtualListItemComponent.__nextId = NgVirtualListItemComponent.__nextId === Number.MAX_SAFE_INTEGER
      ? 0 : NgVirtualListItemComponent.__nextId + 1;
  }

  getBounds(): IRect {
    const el: HTMLElement = this._elementRef.nativeElement,
      { width, height, left, top } = el.getBoundingClientRect();
    return { width, height, x: left, y: top };
  }

  showIfNeed() {
    const styles = this._elementRef.nativeElement.style;
    if (styles.visibility === 'visible') {
      return;
    }

    styles.visibility = 'visible';
  }

  hide() {
    const styles = this._elementRef.nativeElement.style;
    if (styles.visibility === 'hidden') {
      return;
    }

    styles.visibility = 'hidden';
  }
}
