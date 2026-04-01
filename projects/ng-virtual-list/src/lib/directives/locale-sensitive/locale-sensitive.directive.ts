import { Directive, ElementRef, inject, input } from '@angular/core';
import { takeUntilDestroyed, toObservable } from '@angular/core/rxjs-interop';
import { combineLatest, tap } from 'rxjs';
import { TextDirection, TextDirections } from '../../enums';
import { ScrollerDirection, ScrollerDirections } from '../../components/scroller/enums';
import { isDirection } from '../../utils/is-direction';

const RIGHT = 'right',
  DIR = 'dir';

/**
 * LocaleSensitiveDirective
 * Maximum performance for extremely large lists.
 * It is based on algorithms for virtualization of screen objects.
 * @link https://github.com/DjonnyX/ng-virtual-list/blob/18.x/projects/ng-virtual-list/src/lib/directives/locale-sensitive/locale-sensitive.directive.ts
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
        const element = this._elementRef.nativeElement as HTMLElement,
          isVertical = isDirection(listDir, ScrollerDirection.VERTICAL);
        element.setAttribute(DIR, isVertical ? dir : TextDirections.LTR);
        if (dir === TextDirections.RTL && isVertical) {
          element.style.textAlign = RIGHT;
          element.classList.add(TextDirections.RTL);
          element.classList.remove(TextDirections.LTR);
        } else {
          element.classList.add(TextDirections.LTR);
          element.classList.remove(TextDirections.RTL);
        }
      }),
    ).subscribe();
  }
}
