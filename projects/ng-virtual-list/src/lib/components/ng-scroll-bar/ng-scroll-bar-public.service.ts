import { inject, Injectable } from '@angular/core';
import { NgScrollBarService } from './ng-scroll-bar.service';

/**
 * NgScrollBarService
 * Maximum performance for extremely large lists.
 * It is based on algorithms for virtualization of screen objects.
 * @link https://github.com/DjonnyX/ng-virtual-list/blob/19.x/projects/ng-virtual-list/src/lib/components/ng-scroll-bar/ng-scroll-bar-public.service.ts
 * @author Evgenii Alexandrovich Grebennikov
 * @email djonnyx@gmail.com
 */
@Injectable({
  providedIn: 'root'
})
export class NgScrollBarPublicService {
  private _internalService = inject(NgScrollBarService);

  get $click() { return this._internalService.$click; }

  get $state() { return this._internalService.$state; }
}
