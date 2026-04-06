import { NgModule } from '@angular/core';
import { BrowserModule } from '@angular/platform-browser';

import { AppRoutingModule } from './app-routing.module';
import { AppComponent } from './app.component';
import { FormsModule } from '@angular/forms';
import { NgVirtualListModule } from '../../projects/ng-virtual-list/src/lib/ng-virtual-list.module';
import { CommonModule } from '@angular/common';
import { CustomScrollbarModule } from './components/custom-scrollbar/custom-scrollbar.module';

@NgModule({
  declarations: [
    AppComponent,
  ],
  exports: [],
  imports: [
    BrowserModule,
    CommonModule,
    FormsModule,
    AppRoutingModule,
    NgVirtualListModule,
    CustomScrollbarModule,
  ],
  providers: [],
  bootstrap: [AppComponent]
})
export class AppModule { }
