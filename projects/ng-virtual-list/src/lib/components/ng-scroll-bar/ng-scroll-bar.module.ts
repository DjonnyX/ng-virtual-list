import { NgModule, NO_ERRORS_SCHEMA } from '@angular/core';
import { CommonModule } from '@angular/common';
import { NgScrollBarComponent } from './ng-scroll-bar.component';

@NgModule({
  declarations: [NgScrollBarComponent],
  exports: [NgScrollBarComponent],
  imports: [CommonModule],
  schemas: [NO_ERRORS_SCHEMA],
})
export class NgScrollBarModule { }
