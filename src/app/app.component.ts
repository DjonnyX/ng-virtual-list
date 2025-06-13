import { Component, signal } from '@angular/core';
import { NgVirtualListComponent } from '../../projects/ng-virtual-list/src/public-api';
import { IVirtualListCollection } from '../../projects/ng-virtual-list/src/lib/models';

const ITEMS: IVirtualListCollection = [];
for (let i = 0, l = 10000000; i < l; i++) {
  ITEMS.push({ id: i, name: `Item: ${i}` });
}

@Component({
  selector: 'app-root',
  imports: [NgVirtualListComponent],
  templateUrl: './app.component.html',
  styleUrl: './app.component.scss'
})
export class AppComponent {
  items = signal(ITEMS);
}
