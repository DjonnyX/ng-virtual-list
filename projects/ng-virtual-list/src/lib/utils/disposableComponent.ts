import { Component, OnDestroy } from '@angular/core';
import { Subject } from 'rxjs';

/**
 * Base disposable component
 * @link https://github.com/DjonnyX/ng-virtual-list/blob/15.x/projects/ng-virtual-list/src/lib/utils/disposableComponent.ts
 * @author Evgenii Grebennikov
 * @email djonnyx@gmail.com
 */
@Component({
    template: ``,
})
export class DisposableComponent implements OnDestroy {
    protected _$unsubscribe = new Subject<void>();

    ngOnDestroy(): void {
        if (this._$unsubscribe) {
            this._$unsubscribe.next();
            this._$unsubscribe.complete();
        }
    }
}