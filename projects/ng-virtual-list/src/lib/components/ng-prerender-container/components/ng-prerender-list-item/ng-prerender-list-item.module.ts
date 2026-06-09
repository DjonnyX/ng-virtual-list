import { NgModule, NO_ERRORS_SCHEMA } from '@angular/core';
import { CommonModule } from '@angular/common';
import { VirtualClickModule } from '../../../../directives';
import { NgPrerenderVirtualListItemComponent } from './ng-prerender-list-item.component';

@NgModule({
  declarations: [NgPrerenderVirtualListItemComponent],
  exports: [NgPrerenderVirtualListItemComponent],
  imports: [CommonModule, VirtualClickModule],
  schemas: [NO_ERRORS_SCHEMA],
})
export class NgPrerenderVirtualListItemModule { }
