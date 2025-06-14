import { CommonModule } from '@angular/common';
import { ChangeDetectionStrategy, Component, ElementRef, inject, signal, TemplateRef } from '@angular/core';
import { IRenderVirtualListItem } from '../models/render-item.model';
import { takeUntilDestroyed, toObservable } from '@angular/core/rxjs-interop';
import { filter, tap } from 'rxjs';

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
  data = signal<IRenderVirtualListItem | undefined>(undefined);

  set item(v: IRenderVirtualListItem | undefined) {
    this.data.set(v);
  }

  itemRenderer = signal<TemplateRef<any> | undefined>(undefined);

  set renderer(v: TemplateRef<any> | undefined) {
    this.itemRenderer.set(v);
  }

  private _elementRef = inject(ElementRef<HTMLElement>);

  constructor() {
    toObservable(this.data).pipe(
      takeUntilDestroyed(),
      filter(data => !!data),
      tap(data => {
        const styles = this._elementRef.nativeElement.style;
        styles.zIndex = data.config.sticky > 1 ? String(data.config.sticky) : String(data.config.sticky ?? 1);
        styles.transform = `translate3d(${data.config.isVertical ? 0 : data.measures.x}px, ${data.config.isVertical ? data.measures.y : 0}px , 0)`;
        styles.height = data.config.isVertical ? `${data.measures.height}px` : '100%';
        styles.width = data.config.isVertical ? '100%' : `${data.measures.width}px`;
      })
    ).subscribe();
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
