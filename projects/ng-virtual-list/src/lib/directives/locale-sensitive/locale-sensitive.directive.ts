import { Directive, ElementRef, Input, OnDestroy } from '@angular/core';
import { BehaviorSubject, combineLatest, Subject, takeUntil, tap } from 'rxjs';
import { TextDirection, TextDirections } from '../../enums';
import { ScrollerDirection, ScrollerDirections } from '../../components/scroller/enums';
import { isDirection } from '../../utils/is-direction';

const RIGHT = 'right',
  DIR = 'dir';

/**
 * LocaleSensitiveDirective
 * Maximum performance for extremely large lists.
 * It is based on algorithms for virtualization of screen objects.
 * @link https://github.com/DjonnyX/ng-virtual-list/blob/16.x/projects/ng-virtual-list/src/lib/directives/locale-sensitive/locale-sensitive.directive.ts
 * @author Evgenii Alexandrovich Grebennikov
 * @email djonnyx@gmail.com
 */
@Directive({
  selector: '[localeSensitive]',
})
export class LocaleSensitiveDirective implements OnDestroy {
  protected _$unsubscribe = new Subject<void>();

  private _$langTextDir = new BehaviorSubject<TextDirection>(TextDirections.LTR);
  readonly $langTextDir = this._$langTextDir.asObservable();

  @Input()
  set langTextDir(v: TextDirection) {
    this._$langTextDir.next(v);
  }
  get langTextDir() { return this._$langTextDir.getValue(); }


  private _$listDir = new BehaviorSubject<ScrollerDirections | null>(ScrollerDirection.VERTICAL);
  readonly $listDir = this._$listDir.asObservable();

  @Input()
  set listDir(v: ScrollerDirections | null) {
    this._$listDir.next(v);
  }
  get listDir() { return this._$listDir.getValue(); }

  constructor(private _elementRef: ElementRef<HTMLElement>) {
    const $langTextDir = this.$langTextDir,
      $listDir = this.$listDir;

    combineLatest([$langTextDir, $listDir]).pipe(
      takeUntil(this._$unsubscribe),
      tap(([dir, listDir]) => {
        const element = this._elementRef.nativeElement as HTMLElement,
          isVertical = isDirection(listDir!, ScrollerDirection.VERTICAL);
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

  ngOnDestroy(): void {
    if (this._$unsubscribe) {
      this._$unsubscribe.next();
      this._$unsubscribe.complete();
    }
  }
}
