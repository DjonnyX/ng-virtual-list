import { NgModule, NO_ERRORS_SCHEMA } from '@angular/core';
import { CommonModule } from '@angular/common';
import { NgVirtualListComponent } from './ng-virtual-list.component';
import { LocaleSensitiveModule } from './directives';
import { NgVirtualListItemModule } from './components/ng-list-item/ng-virtual-list-item.module';
import { NgScrollerModule } from './components/ng-scroller/ng-scroller.module';
import { NgPrerenderContainerModule } from './components/ng-prerender-container/ng-prerender-container.module';

@NgModule({
  declarations: [NgVirtualListComponent],
  exports: [NgVirtualListComponent],
  imports: [CommonModule, NgVirtualListItemModule, NgScrollerModule, NgPrerenderContainerModule, LocaleSensitiveModule],
  schemas: [NO_ERRORS_SCHEMA],
})
export class NgVirtualListModule { }
