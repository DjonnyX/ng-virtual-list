import { Injectable } from '@angular/core';
import { BehaviorSubject, Subject } from 'rxjs';
import { ScrollbarState } from './types';
import { ScrollbarStates } from './enums';

/**
 * NgScrollBarService
 * Maximum performance for extremely large lists.
 * It is based on algorithms for virtualization of screen objects.
 * @link https://github.com/DjonnyX/ng-virtual-list/blob/19.x/projects/ng-virtual-list/src/lib/components/ng-scroll-bar/ng-scroll-bar.service.ts
 * @author Evgenii Alexandrovich Grebennikov
 * @email djonnyx@gmail.com
 */
@Injectable({
  providedIn: 'root'
})
export class NgScrollBarService {
  private _$click = new Subject<PointerEvent | MouseEvent>();
  readonly $click = this._$click.asObservable();

  private _$state = new BehaviorSubject<ScrollbarState>(ScrollbarStates.NORMAL);
  readonly $state = this._$state.asObservable();

  set state(v: ScrollbarState) {
    if (this._$state.getValue() !== v) {
      this._$state.next(v);
    }
  }
  get state() { return this._$state.getValue(); }

  click(event: PointerEvent | MouseEvent) {
    this._$click.next(event);
  }
}
