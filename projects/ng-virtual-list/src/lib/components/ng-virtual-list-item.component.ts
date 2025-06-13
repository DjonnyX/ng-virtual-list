import { CommonModule } from '@angular/common';
import { Component, ElementRef, signal, TemplateRef } from '@angular/core';
import { IRenderVirtualListItem } from '../models/render-item.model';
import { takeUntilDestroyed, toObservable } from '@angular/core/rxjs-interop';
import { filter, tap } from 'rxjs';

@Component({
  selector: 'ng-virtual-list-item',
  imports: [CommonModule],
  templateUrl: './ng-virtual-list-item.component.html',
  styleUrl: './ng-virtual-list-item.component.scss'
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

  constructor(private _elementRef: ElementRef<HTMLElement>) {
    toObservable(this.data).pipe(
      takeUntilDestroyed(),
      filter(data => !!data),
      tap(data => {
        if (data.config.sticky > 0) {
          this._elementRef.nativeElement.style.position = 'sticky';
          this._elementRef.nativeElement.style.zIndex = String(data.config.sticky);
          this._elementRef.nativeElement.style.transform = 'unset';
        } else {
          this._elementRef.nativeElement.style.position = 'absolute';
          this._elementRef.nativeElement.style.zIndex = '0';
          this._elementRef.nativeElement.style.transform = `translate3d(0, ${data.measures.y}px , 0)`;
        }
        this._elementRef.nativeElement.style.height = `${data.measures.height}px`;
      })
    ).subscribe();
  }
}
