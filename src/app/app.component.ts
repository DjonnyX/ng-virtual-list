import { Component, viewChild } from '@angular/core';
import { NgVirtualListComponent } from '../../projects/ng-virtual-list/src/public-api';
import { IVirtualListCollection, IVirtualListStickyMap, IVirtualListItem } from '../../projects/ng-virtual-list/src/lib/models';
import { FormsModule } from '@angular/forms';
import { Id } from '../../projects/ng-virtual-list/src/lib/types';

const MAX_ITEMS = 1000000;

const ITEMS: IVirtualListCollection = [];
for (let i = 0, l = MAX_ITEMS; i < l; i++) {
  const id = i + 1;
  ITEMS.push({ id, name: `Item: ${id}` });
}

const HORIZONTAL_ITEMS: IVirtualListCollection = [];
for (let i = 0, l = MAX_ITEMS; i < l; i++) {
  const id = i + 1;
  HORIZONTAL_ITEMS.push({ id, name: `${id}` });
}

const GROUP_NAMES = ['A', 'B', 'C', 'D', 'E'];

const getGroupName = () => {
  return GROUP_NAMES[Math.floor(Math.random() * GROUP_NAMES.length)];
};

const HORIZONTAL_GROUP_ITEMS: IVirtualListCollection = [],
  HORIZONTAL_GROUP_ITEMS_STICKY_MAP: IVirtualListStickyMap = {};

for (let i = 0, l = MAX_ITEMS; i < l; i++) {
  const id = i + 1, type = i === 0 || Math.random() > .895 ? 'group-header' : 'item';
  HORIZONTAL_GROUP_ITEMS.push({ id, type, name: type === 'group-header' ? getGroupName() : `${id}` });
  HORIZONTAL_GROUP_ITEMS_STICKY_MAP[id] = type === 'group-header' ? 1 : 0;
}

const GROUP_ITEMS: IVirtualListCollection = [],
  GROUP_ITEMS_STICKY_MAP: IVirtualListStickyMap = {};

let groupIndex = 0;
for (let i = 0, l = MAX_ITEMS; i < l; i++) {
  const id = i + 1, type = i === 0 || Math.random() > .895 ? 'group-header' : 'item';
  if (type === 'group-header') {
    groupIndex++;
  }
  GROUP_ITEMS.push({ id, type, name: type === 'group-header' ? `Group ${id}` : `Item: ${id}` });
  GROUP_ITEMS_STICKY_MAP[id] = type === 'group-header' ? 1 : 0;
}

@Component({
  selector: 'app-root',
  imports: [FormsModule, NgVirtualListComponent],
  templateUrl: './app.component.html',
  styleUrl: './app.component.scss'
})
export class AppComponent {
  protected _listContainerRef = viewChild('virtualList', { read: NgVirtualListComponent });

  items = ITEMS;

  horizontalItems = HORIZONTAL_ITEMS;

  groupItems = GROUP_ITEMS;
  groupItemsStickyMap = GROUP_ITEMS_STICKY_MAP;

  horizontalGroupItems = HORIZONTAL_GROUP_ITEMS;
  horizontalGroupItemsStickyMap = HORIZONTAL_GROUP_ITEMS_STICKY_MAP;

  itemId: Id = this.items[0].id;

  onButtonScrollToIdClickHandler = (e: Event) => {
    const list = this._listContainerRef();
    if (list) {
      list.scrollTo(this.itemId, 'smooth');
    }
  }

  onItemClick(data: IVirtualListItem) {
    console.info(`Click: Item ${data['name']} (ID: ${data.id})`);
  }
}
