import { NgModule, NO_ERRORS_SCHEMA } from '@angular/core';
import { CommonModule } from '@angular/common';
import { PrerenderContainer } from './prerender-container.component';
import { PrerenderListModule } from './components/prerender-list/prerender-list.module';

@NgModule({
    declarations: [PrerenderContainer],
    exports: [PrerenderContainer],
    imports: [CommonModule, PrerenderListModule],
    schemas: [NO_ERRORS_SCHEMA],
})
export class PrerenderContainerModule { }
