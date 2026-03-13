import { CUSTOM_ELEMENTS_SCHEMA, NgModule, NO_ERRORS_SCHEMA } from '@angular/core';
import { CommonModule } from '@angular/common';
import { NgScrollBarComponent } from './ng-scroll-bar.component';
import { SubstrateModule } from '../substrate/substrate.module';

@NgModule({
  declarations: [NgScrollBarComponent],
  exports: [NgScrollBarComponent],
  imports: [CommonModule, SubstrateModule],
  schemas: [CUSTOM_ELEMENTS_SCHEMA, NO_ERRORS_SCHEMA],
})
export class NgScrollBarModule { }
