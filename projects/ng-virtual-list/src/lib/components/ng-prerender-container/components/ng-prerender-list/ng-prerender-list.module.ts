import { NgModule, NO_ERRORS_SCHEMA } from '@angular/core';
import { CommonModule } from '@angular/common';
import { NgPrerenderVirtualListItemModule } from '../ng-prerender-list-item/ng-prerender-list-item.module';
import { NgPrerenderScrollerModule } from '../ng-prerender-scroller/ng-prerender-scroller.module';
import { NgPrerenderList } from './ng-prerender-list.component';

@NgModule({
    declarations: [NgPrerenderList],
    exports: [NgPrerenderList],
    imports: [CommonModule, NgPrerenderVirtualListItemModule, NgPrerenderScrollerModule],
    schemas: [NO_ERRORS_SCHEMA],
})
export class NgPrerenderListModule { }
