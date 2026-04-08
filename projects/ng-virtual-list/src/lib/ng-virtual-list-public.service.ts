import { inject, Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { IRenderVirtualListItem, IVirtualListItem } from './models';
import { IScrollOptions } from './interfaces';
import { FocusAlignment, Id } from './types';
import { FocusItemParams } from './types/focus-item-params';
import { NgVirtualListService } from './ng-virtual-list.service';
import { FocusAlignments } from './enums';

/**
 * NgVirtualListPublicService
 * Maximum performance for extremely large lists.
 * It is based on algorithms for virtualization of screen objects.
 * @link https://github.com/DjonnyX/ng-virtual-list/blob/17.x/projects/ng-virtual-list/src/lib/ng-virtual-list-publick.service.ts
 * @author Evgenii Alexandrovich Grebennikov
 * @email djonnyx@gmail.com
 */
@Injectable({
  providedIn: 'root'
})
export class NgVirtualListPublicService {
  private _internalService = inject(NgVirtualListService);

  /**
   * Unique list identifier.
   */
  get id(): number { return this._internalService.id; }

  /**
   * Informs about a click on a list item.
   */
  get $itemClick(): Observable<IRenderVirtualListItem<any> | null> { return this._internalService.$itemClick; };

  /**
   * Informs about the selection of a list item(s).
   */
  get $selectedIds(): Observable<Array<Id> | Id | null> { return this._internalService.$selectedIds; };

  /**
   * Informs about the collapse (expanding) of a list element(s).
   */
  get $collapsedIds(): Observable<Array<Id>> { return this._internalService.$collapsedIds; };

  /**
   * Informs the focus on the specified list item.
   */
  get $focusItem(): Observable<FocusItemParams> { return this._internalService.$focusItem; };

  /**
   * Notifies about the next change detection tick. Works similarly to `setTimeout` with a timeout of 0.
   */
  get $tick(): Observable<void> { return this._internalService.$tick; };

  /**
   * Specifies a list of selected items.
   */
  set selectedIds(ids: Array<Id> | Id | null) {
    this._internalService.selectedIds = ids;
  }

  /**
   * Returns a list of selected items.
   */
  get selectedIds() { return this._internalService.selectedIds; }

  /**
   * Specifies a list of collapsed elements.
   */
  set сollapsedIds(ids: Array<Id>) {
    this._internalService.collapsedIds = ids;
  }

  /**
   * Returns a list of collapsed elements.
   */
  get сollapsedIds() { return this._internalService.collapsedIds; }

  /**
   * Updates the list
   * @param immediately - Indicates that the list is updated instantly.
   * @param force - Forced update.
   */
  update(immediately: boolean = false, force: boolean = false) {
    this._internalService.update(immediately, force);
  }

  /**
   * Selects a list item
   * @param id 
   * @param selected - If the value is undefined, then the toggle method is executed, if false or true, then the selection/deselection is performed.
   */
  select(id: Id, selected: boolean | undefined = undefined) {
    this._internalService.select(id, selected);
  }

  /**
    * Collapse list items
    * @param id 
    * @param collapsed - If the value is undefined, then the toggle method is executed, if false or true, then the collapse/expand is performed.
    */
  collapse(id: Id, collapsed: boolean | undefined = undefined) {
    this._internalService.collapse(id, collapsed);
  }

  /**
   * Focus an list item by a given id.
   */
  focus(id: Id, align: FocusAlignment = FocusAlignments.NONE, scrollBehavior: ScrollBehavior = "auto") {
    return this._internalService.focusById(id, align, scrollBehavior)
  }

  /**
    * The method scrolls the list to the element with the given `id` and returns the value of the scrolled area.
    */
  scrollTo(id: Id, cb: (() => void) | null = null, options: IScrollOptions | null = null) {
    this._internalService.scrollTo(id, cb, options);
  }

  /**
   * Scrolls the scroll area to the first item in the collection.
   */
  scrollToStart(options?: IScrollOptions) {
    this._internalService.scrollToStart(options);
  }

  /**
   * Scrolls the list to the end of the content size.
   */
  scrollToEnd(options?: IScrollOptions) {
    this._internalService.scrollToEnd(options);
  }
}
