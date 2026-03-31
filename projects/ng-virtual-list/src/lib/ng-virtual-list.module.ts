import { NgModule, NO_ERRORS_SCHEMA } from '@angular/core';
import { CommonModule } from '@angular/common';
import { NgVirtualListComponent } from './ng-virtual-list.component';
import { LocaleSensitiveModule } from './directives';
import { NgVirtualListItemModule } from './components/list-item/ng-virtual-list-item.module';
import { NgScrollerModule } from './components/scroller/ng-scroller.module';
import { PrerenderContainerModule } from './components/prerender-container/prerender-container.module';

@NgModule({
  declarations: [NgVirtualListComponent],
  exports: [NgVirtualListComponent],
  imports: [CommonModule, NgVirtualListItemModule, NgScrollerModule, PrerenderContainerModule, LocaleSensitiveModule],
  schemas: [NO_ERRORS_SCHEMA],
})
export class NgVirtualListModule { }
