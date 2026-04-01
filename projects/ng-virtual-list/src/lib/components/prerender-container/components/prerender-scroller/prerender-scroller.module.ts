import { CUSTOM_ELEMENTS_SCHEMA, NgModule, NO_ERRORS_SCHEMA } from '@angular/core';
import { CommonModule } from '@angular/common';
import { PrerenderScrollerComponent } from './prerender-scroller.component';
import { LocaleSensitiveModule } from '../../../../directives';

@NgModule({
    declarations: [PrerenderScrollerComponent],
    exports: [PrerenderScrollerComponent],
    imports: [CommonModule, LocaleSensitiveModule],
    schemas: [CUSTOM_ELEMENTS_SCHEMA, NO_ERRORS_SCHEMA],
})
export class PrerenderScrollerModule { }
