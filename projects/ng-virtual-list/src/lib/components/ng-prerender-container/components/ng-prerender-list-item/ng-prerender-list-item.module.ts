import { CUSTOM_ELEMENTS_SCHEMA, NgModule, NO_ERRORS_SCHEMA } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ItemClickModule } from '../../../../directives';
import { NgPrerenderVirtualListItemComponent } from './ng-prerender-list-item.component';

@NgModule({
  declarations: [NgPrerenderVirtualListItemComponent],
  exports: [NgPrerenderVirtualListItemComponent],
  imports: [CommonModule, ItemClickModule],
  schemas: [CUSTOM_ELEMENTS_SCHEMA, NO_ERRORS_SCHEMA],
})
export class NgPrerenderVirtualListItemModule { }
