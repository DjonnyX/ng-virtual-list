import { NgModule, NO_ERRORS_SCHEMA } from '@angular/core';
import { CommonModule } from '@angular/common';
import { PrerenderVirtualListItemModule } from '../prerender-list-item/prerender-list-item.module';
import { PrerenderScrollerModule } from '../prerender-scroller/prerender-scroller.module';
import { PrerenderList } from './prerender-list.component';

@NgModule({
    declarations: [PrerenderList],
    exports: [PrerenderList],
    imports: [CommonModule, PrerenderVirtualListItemModule, PrerenderScrollerModule],
    schemas: [NO_ERRORS_SCHEMA],
})
export class PrerenderListModule { }
