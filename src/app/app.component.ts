import { Component, viewChild } from '@angular/core';
import { NgVirtualListComponent } from '../../projects/ng-virtual-list/src/public-api';
import { IVirtualListCollection, IVirtualListStickyMap, IVirtualListItem } from '../../projects/ng-virtual-list/src/lib/models';
import { Id } from '../../projects/ng-virtual-list/src/lib/types';
import { LOGO } from './const';

const MAX_ITEMS = 50000;

interface ICollectionItem {
  name: string;
}

interface IGroupCollectionItem extends ICollectionItem {
  type: 'group-header' | 'item';
}

const ITEMS: IVirtualListCollection<ICollectionItem> = [];
for (let i = 0, l = MAX_ITEMS; i < l; i++) {
  const id = i + 1;
  ITEMS.push({ id, name: `Item: ${id}` });
}

const HORIZONTAL_ITEMS: IVirtualListCollection<ICollectionItem> = [];
for (let i = 0, l = MAX_ITEMS; i < l; i++) {
  const id = i + 1;
  HORIZONTAL_ITEMS.push({ id, name: `${id}` });
}

const GROUP_NAMES = ['A', 'B', 'C', 'D', 'E'];

const getGroupName = () => {
  return GROUP_NAMES[Math.floor(Math.random() * GROUP_NAMES.length)];
};

const HORIZONTAL_GROUP_ITEMS: IVirtualListCollection<IGroupCollectionItem> = [],
  HORIZONTAL_GROUP_ITEMS_STICKY_MAP: IVirtualListStickyMap = {};

for (let i = 0, l = MAX_ITEMS; i < l; i++) {
  const id = i + 1, type = i === 0 || Math.random() > .895 ? 'group-header' : 'item';
  HORIZONTAL_GROUP_ITEMS.push({ id, type, name: type === 'group-header' ? getGroupName() : `${id}` });
  HORIZONTAL_GROUP_ITEMS_STICKY_MAP[id] = type === 'group-header' ? 1 : 0;
}

const GROUP_ITEMS: IVirtualListCollection<IGroupCollectionItem> = [],
  GROUP_ITEMS_STICKY_MAP: IVirtualListStickyMap = {};

let groupIndex = 0;
for (let i = 0, l = MAX_ITEMS; i < l; i++) {
  const id = i + 1, type = i === 0 || Math.random() > .895 ? 'group-header' : 'item';
  if (type === 'group-header') {
    groupIndex++;
  }
  GROUP_ITEMS.push({ id, type, name: type === 'group-header' ? `Group ${groupIndex}` : `Item: ${id}` });
  GROUP_ITEMS_STICKY_MAP[id] = type === 'group-header' ? 1 : 0;
}

const CHARS = ['a', 'b', 'c', 'd', 'e', 'f', 'g', 'h', 'i', 'j', 'k', 'l', 'm', 'n', 'o', 'p', 'q', 'r', 's', 't', 'u', 'v', 'w', 'x', 'y', 'z'];

const generateLetter = () => {
  return CHARS[Math.round(Math.random() * CHARS.length)];
}

const generateWord = () => {
  const length = 5 + Math.floor(Math.random() * 50), result = [];
  while (result.length < length) {
    result.push(generateLetter());
  }
  return `${result.join('')}`;
};

const generateText = () => {
  const length = 2 + Math.floor(Math.random() * 10), result = [];
  while (result.length < length) {
    result.push(generateWord());
  }
  let firstWord = '';
  for (let i = 0, l = result[0].length; i < l; i++) {
    const letter = result[0].charAt(i);
    firstWord += i === 0 ? letter.toUpperCase() : letter;
  }
  result[0] = firstWord;
  return `${result.join(' ')}.`;
};

const GROUP_DYNAMIC_ITEMS: IVirtualListCollection<IGroupCollectionItem> = [],
  GROUP_DYNAMIC_ITEMS_STICKY_MAP: IVirtualListStickyMap = {},
  GROUP_DYNAMIC_ITEMS_WITH_SNAP: IVirtualListCollection<IGroupCollectionItem> = [],
  GROUP_DYNAMIC_ITEMS_STICKY_MAP_WITH_SNAP: IVirtualListStickyMap = {};

let groupDynamicIndex = 0;
for (let i = 0, l = MAX_ITEMS; i < l; i++) {
  const id = i + 1, type = i === 0 || Math.random() > .895 ? 'group-header' : 'item';
  if (type === 'group-header') {
    groupDynamicIndex++;
  }
  GROUP_DYNAMIC_ITEMS.push({ id, type, name: type === 'group-header' ? `Group ${id}. ${generateText()}` : `${id}. ${generateText()}` });
  GROUP_DYNAMIC_ITEMS_STICKY_MAP[id] = type === 'group-header' ? 1 : 0;
  GROUP_DYNAMIC_ITEMS_WITH_SNAP.push({ id, type, name: type === 'group-header' ? `Group ${id}` : `${id}. ${generateText()}` });
  GROUP_DYNAMIC_ITEMS_STICKY_MAP_WITH_SNAP[id] = type === 'group-header' ? 1 : 0;
}

@Component({
  selector: 'app-root',
  standalone: false,
  templateUrl: './app.component.html',
  styleUrl: './app.component.scss'
})
export class AppComponent {
  readonly logo = LOGO;

  protected _listContainerRef = viewChild('virtualList', { read: NgVirtualListComponent });

  protected _dynamicListContainerRef = viewChild('dynamicList', { read: NgVirtualListComponent });

  items = ITEMS;

  horizontalItems = HORIZONTAL_ITEMS;

  groupItems = GROUP_ITEMS;
  groupItemsStickyMap = GROUP_ITEMS_STICKY_MAP;

  groupDynamicItems = GROUP_DYNAMIC_ITEMS;
  groupDynamicItemsStickyMap = GROUP_DYNAMIC_ITEMS_STICKY_MAP;

  groupDynamicItemsWithSanp = GROUP_DYNAMIC_ITEMS_WITH_SNAP;
  groupDynamicItemsStickyMapWithSanp = GROUP_DYNAMIC_ITEMS_STICKY_MAP_WITH_SNAP;

  horizontalGroupItems = HORIZONTAL_GROUP_ITEMS;
  horizontalGroupItemsStickyMap = HORIZONTAL_GROUP_ITEMS_STICKY_MAP;

  private _minId: Id = this.items.length > 0 ? this.items[0].id : 0;
  get minId() { return this._minId; };

  private _maxId: Id = this.items.length > 0 ? this.items[this.items.length - 1].id : 0;
  get maxId() { return this._maxId; };

  itemId: Id = this._minId;

  private _minDlId: Id = this.groupDynamicItems.length > 0 ? this.groupDynamicItems[0].id : 0;
  get minDlId() { return this._minDlId; };

  private _maxDlId: Id = this.groupDynamicItems.length > 0 ? this.groupDynamicItems[this.groupDynamicItems.length - 1].id : 0;
  get maxDlId() { return this._maxDlId; };

  dlItemId: Id = this._minDlId;

  onButtonScrollToIdClickHandler = (e: Event) => {
    const list = this._listContainerRef();
    if (list && this.itemId !== undefined) {
      list.scrollTo(this.itemId, 'smooth');
    }
  }

  onButtonScrollDLToIdClickHandler = (e: Event) => {
    const list = this._dynamicListContainerRef();
    if (list && this.dlItemId !== undefined) {
      list.scrollTo(this.dlItemId, 'instant');
    }
  }

  onItemClick(data: IVirtualListItem<ICollectionItem>) {
    console.info(`Click: Item ${data.name} (ID: ${data.id})`);
  }
}
