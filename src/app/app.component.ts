import { Component, viewChild } from '@angular/core';
import { NgVirtualListComponent, IVirtualListCollection, IVirtualListItemConfigMap, IRenderVirtualListItem, ISize } from '../../projects/ng-virtual-list/src/public-api';
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
  HORIZONTAL_GROUP_ITEMS_ITEM_CONFIG_MAP: IVirtualListItemConfigMap = {};

for (let i = 0, l = MAX_ITEMS; i < l; i++) {
  const id = i + 1, type = i === 0 || Math.random() > .895 ? 'group-header' : 'item';
  HORIZONTAL_GROUP_ITEMS.push({ id, type, name: type === 'group-header' ? getGroupName() : `${id}` });
  HORIZONTAL_GROUP_ITEMS_ITEM_CONFIG_MAP[id] = {
    sticky: type === 'group-header' ? Math.round(Math.random() * 2) === 1 ? 1 : 2 : 0,
    selectable: type !== 'group-header',
  }
}

const GROUP_ITEMS: IVirtualListCollection<IGroupCollectionItem> = [],
  GROUP_ITEMS_ITEM_CONFIG_MAP: IVirtualListItemConfigMap = {};

let groupIndex = 0;
for (let i = 0, l = MAX_ITEMS; i < l; i++) {
  const id = i + 1, type = i === 0 || Math.random() > .895 ? 'group-header' : 'item';
  if (type === 'group-header') {
    groupIndex++;
  }
  GROUP_ITEMS.push({ id, type, name: type === 'group-header' ? `Group ${groupIndex}` : `Item: ${id}` });
  GROUP_ITEMS_ITEM_CONFIG_MAP[id] = {
    sticky: type === 'group-header' ? 1 : 0,
    selectable: type !== 'group-header',
  };
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
  GROUP_DYNAMIC_ITEMS_ITEM_CONFIG_MAP: IVirtualListItemConfigMap = {},
  GROUP_DYNAMIC_ITEMS_WITH_SNAP: IVirtualListCollection<IGroupCollectionItem> = [],
  GROUP_DYNAMIC_ITEMS_ITEM_CONFIG_MAP_WITH_SNAP: IVirtualListItemConfigMap = {};

let groupDynamicIndex = 0;
for (let i = 0, l = MAX_ITEMS; i < l; i++) {
  const id = i + 1, type = i === 0 || Math.random() > .895 ? 'group-header' : 'item',
    isGroup = type === 'group-header';
  if (isGroup) {
    groupDynamicIndex++;
  }
  GROUP_DYNAMIC_ITEMS.push({ id, type, name: isGroup ? `Group ${id}. ${generateText()}` : `${id}. ${generateText()}` });
  GROUP_DYNAMIC_ITEMS_ITEM_CONFIG_MAP[id] = {
    sticky: isGroup ? 1 : 0,
    selectable: !isGroup,
    collapsable: isGroup,
  };
  GROUP_DYNAMIC_ITEMS_WITH_SNAP.push({ id, type, name: isGroup ? `Group ${id}` : `${id}. ${generateText()}` });
  GROUP_DYNAMIC_ITEMS_ITEM_CONFIG_MAP_WITH_SNAP[id] = {
    sticky: isGroup ? 1 : 0,
    selectable: !isGroup,
    collapsable: isGroup,
  };
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
  groupItemConfigMap = GROUP_ITEMS_ITEM_CONFIG_MAP;

  groupDynamicItems = GROUP_DYNAMIC_ITEMS;
  groupDynamicItemConfigMap = GROUP_DYNAMIC_ITEMS_ITEM_CONFIG_MAP;

  groupDynamicItemsWithSanp = GROUP_DYNAMIC_ITEMS_WITH_SNAP;
  groupDynamicItemConfigMapWithSanp = GROUP_DYNAMIC_ITEMS_ITEM_CONFIG_MAP_WITH_SNAP;

  horizontalGroupItems = HORIZONTAL_GROUP_ITEMS;
  horizontalGroupItemConfigMap = HORIZONTAL_GROUP_ITEMS_ITEM_CONFIG_MAP;

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
      setTimeout(() => {
        list.focus(this.itemId);
      }, 1500);
    }
  }

  onButtonScrollDLToIdClickHandler = (e: Event) => {
    const list = this._dynamicListContainerRef();
    if (list && this.dlItemId !== undefined) {
      list.scrollTo(this.dlItemId, 'instant');
      setTimeout(() => {
        list.focus(this.dlItemId);
      }, 100);
    }
  }

  onItemClick(item: IRenderVirtualListItem<ICollectionItem> | undefined) {
    if (item) {
      console.info(`Click: (ID: ${item.id}) Item ${item.data.name}`);
    }
  }

  onSelectHandler(data: Array<Id> | Id | undefined) {
    console.info(`Select: ${JSON.stringify(data)}`);
  }

  onViewportChangeHandler(size: ISize) {
    console.info(`Viewport changed: ${JSON.stringify(size)}`);
  }

  onScrollReachStartHandler() {
    console.info(`onScrollReachStart`);
  }

  onScrollReachEndHandler() {
    console.info(`onScrollReachEnd`);
  }
}
