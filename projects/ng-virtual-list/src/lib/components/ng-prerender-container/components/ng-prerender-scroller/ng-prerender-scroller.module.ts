import { NgModule, NO_ERRORS_SCHEMA } from '@angular/core';
import { CommonModule } from '@angular/common';
import { NgPrerenderScrollerComponent } from './ng-prerender-scroller.component';
import { LocaleSensitiveModule } from '../../../../directives';

@NgModule({
    declarations: [NgPrerenderScrollerComponent],
    exports: [NgPrerenderScrollerComponent],
    imports: [CommonModule, LocaleSensitiveModule],
    schemas: [NO_ERRORS_SCHEMA],
})
export class NgPrerenderScrollerModule { }
