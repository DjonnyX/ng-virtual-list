import { NgModule, NO_ERRORS_SCHEMA } from '@angular/core';
import { CommonModule } from '@angular/common';
import { NgVirtualListItemModule } from '../../components/list-item/ng-virtual-list-item.module';
import { PrerenderContainer } from './prerender-container.component';

@NgModule({
    declarations: [PrerenderContainer],
    exports: [PrerenderContainer],
    imports: [CommonModule, NgVirtualListItemModule],
    schemas: [NO_ERRORS_SCHEMA],
})
export class PrerenderContainerModule { }
