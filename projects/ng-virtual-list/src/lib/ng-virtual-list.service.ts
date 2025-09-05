import { Injectable } from '@angular/core';
import { Subject } from 'rxjs';
import { TrackBox } from './utils/trackBox';
import { IRenderVirtualListItem } from './models';

@Injectable({
  providedIn: 'root'
})
export class NgVirtualListService {
  private _nextComponentId: number = 0;

  private _$itemClick = new Subject<IRenderVirtualListItem<any> | undefined>();
  $itemClick = this._$itemClick.asObservable();

  private _trackBox: TrackBox | undefined;

  constructor() { }

  itemClick(data: IRenderVirtualListItem | undefined) {
    this._$itemClick.next(data);
  }

  initialize(trackBox: TrackBox) {
    this._trackBox = trackBox;
  }

  generateComponentId() {
    return this._nextComponentId = this._nextComponentId === Number.MAX_SAFE_INTEGER
      ? 0 : this._nextComponentId + 1;
  }
}
