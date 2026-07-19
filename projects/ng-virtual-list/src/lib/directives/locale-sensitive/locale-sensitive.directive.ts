import { Directive, ElementRef, inject, input } from '@angular/core';
import { takeUntilDestroyed, toObservable } from '@angular/core/rxjs-interop';
import { combineLatest, tap } from 'rxjs';
import { TextDirections } from '../../enums';
import { TextDirection } from '../../types';
import { ScrollerDirection, ScrollerDirections } from '../../components/ng-scroller/enums';

const LEFT = 'left',
  RIGHT = 'right',
  DIR = 'dir';

/**
 * LocaleSensitiveDirective
 * Maximum performance for extremely large lists.
 * It is based on algorithms for virtualization of screen objects.
 * @link https://github.com/DjonnyX/ng-virtual-list/blob/21.x/projects/ng-virtual-list/src/lib/directives/locale-sensitive/locale-sensitive.directive.ts
 * @author Evgenii Alexandrovich Grebennikov
 * @email djonnyx@gmail.com
 */
@Directive({
  selector: '[localeSensitive]',
  standalone: false,
})
export class LocaleSensitiveDirective {
  langTextDir = input<TextDirection>(TextDirections.LTR);

  listDir = input<ScrollerDirections>(ScrollerDirection.VERTICAL);

  private _elementRef = inject(ElementRef<HTMLElement>);

  constructor() {
    const $langTextDir = toObservable(this.langTextDir),
      $listDir = toObservable(this.listDir);

    combineLatest([$langTextDir, $listDir]).pipe(
      takeUntilDestroyed(),
      tap(([dir, listDir]) => {
        const element = this._elementRef.nativeElement as HTMLElement;
        element.setAttribute(DIR, dir);
        if (dir === TextDirections.RTL) {
          element.style.textAlign = RIGHT;
          element.classList.add(TextDirections.RTL);
          element.classList.remove(TextDirections.LTR);
        } else {
          element.style.textAlign = LEFT;
          element.classList.add(TextDirections.LTR);
          element.classList.remove(TextDirections.RTL);
        }
      }),
    ).subscribe();
  }
}
