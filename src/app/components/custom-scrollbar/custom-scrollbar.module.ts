import { NgModule, NO_ERRORS_SCHEMA } from '@angular/core';
import { CommonModule } from '@angular/common';
import { CustomScrollbarComponent } from './custom-scrollbar.component';
import { XSubstrateModule } from '../x-substrate/x-substrate.module';

@NgModule({
  declarations: [CustomScrollbarComponent],
  exports: [CustomScrollbarComponent],
  imports: [CommonModule, XSubstrateModule],
  schemas: [NO_ERRORS_SCHEMA],
})
export class CustomScrollbarModule { }
