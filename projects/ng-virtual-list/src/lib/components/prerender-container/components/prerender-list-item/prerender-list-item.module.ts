import { CUSTOM_ELEMENTS_SCHEMA, NgModule, NO_ERRORS_SCHEMA } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ItemClickModule } from '../../../../directives';
import { PrerenderVirtualListItemComponent } from './prerender-list-item.component';

@NgModule({
  declarations: [PrerenderVirtualListItemComponent],
  exports: [PrerenderVirtualListItemComponent],
  imports: [CommonModule, ItemClickModule],
  schemas: [CUSTOM_ELEMENTS_SCHEMA, NO_ERRORS_SCHEMA],
})
export class PrerenderVirtualListItemModule { }
