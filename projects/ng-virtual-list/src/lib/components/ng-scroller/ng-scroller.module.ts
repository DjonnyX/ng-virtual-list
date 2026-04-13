import { NgModule, NO_ERRORS_SCHEMA } from '@angular/core';
import { CommonModule } from '@angular/common';
import { NgScrollerComponent } from './ng-scroller.component';
import { LocaleSensitiveModule } from '../../directives';
import { NgScrollBarModule } from '../ng-scroll-bar/ng-scroll-bar.module';
import { CdkScrollableModule } from '@angular/cdk/scrolling';

@NgModule({
  declarations: [NgScrollerComponent],
  exports: [NgScrollerComponent],
  imports: [CommonModule, NgScrollBarModule, LocaleSensitiveModule, CdkScrollableModule],
  schemas: [NO_ERRORS_SCHEMA],
})
export class NgScrollerModule { }
