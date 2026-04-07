import { NgModule, NO_ERRORS_SCHEMA } from '@angular/core';
import { CommonModule } from '@angular/common';
import { NgPrerenderContainer } from './ng-prerender-container.component';
import { NgPrerenderListModule } from './components/ng-prerender-list/ng-prerender-list.module';

@NgModule({
    declarations: [NgPrerenderContainer],
    exports: [NgPrerenderContainer],
    imports: [CommonModule, NgPrerenderListModule],
    schemas: [NO_ERRORS_SCHEMA],
})
export class NgPrerenderContainerModule { }
