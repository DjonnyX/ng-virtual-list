import { Component, ViewChild } from '@angular/core';
import {
  NgVirtualListComponent, IVirtualListCollection, IVirtualListItemConfigMap, IRenderVirtualListItem, ISize, GradientColor, Id,
  ScrollBarTheme, RoundedCorner,
} from '../../projects/ng-virtual-list/src/public-api';
import { LOGO } from './const';
import { delay, interval, tap } from 'rxjs';

const X_LITE_BLUE_PLASMA_GRADIENT: GradientColor = ["rgba(133, 142, 255, 0)", "rgb(0, 133, 160)"],
  ROUND_CORNER: RoundedCorner = [3, 3, 3, 3],
  SCROLLBAR_GRADIENT: ScrollBarTheme = {
    fill: ["rgba(51, 0, 97, 1)", "rgba(73, 0, 97, 1)"],
    hoverFill: ["rgba(73, 6, 133, 1)", "rgba(73, 6, 133, 1)"],
    pressedFill: ["rgba(73, 6, 150, 1)", "rgba(95, 0, 150, 1)"],
    strokeGradientColor: X_LITE_BLUE_PLASMA_GRADIENT,
    strokeAnimationDuration: 1000,
    thickness: 6,
    roundCorner: ROUND_CORNER,
    rippleColor: 'rgba(255,255,255,0.5)',
    rippleEnabled: true,
  };

const MAX_ITEMS = 10000;

interface ICollectionItem {
  id: Id;
  name: string;
}

interface IGroupCollectionItem extends ICollectionItem {
  id: Id;
  type: 'group-header' | 'item';
}

const ITEMS: IVirtualListCollection<ICollectionItem> = [];
for (let i = 0, l = MAX_ITEMS; i < l; i++) {
  const id = i + 1;
  ITEMS.push({ id, name: `Item: ${id}` });
}

const ITEMS_RTL: IVirtualListCollection<ICollectionItem> = [];
for (let i = 0, l = MAX_ITEMS; i < l; i++) {
  const id = i + 1;
  ITEMS_RTL.push({ id, name: `פָּרִיט: ${id}` });
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

const generateWord = (len: number = 50) => {
  const length = 5 + Math.floor(Math.random() * len), result = [];
  while (result.length < length) {
    result.push(generateLetter());
  }
  return `${result.join('')}`;
};

const generateText = (len: number = 10) => {
  const length = 2 + Math.floor(Math.random() * len), result = [];
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
    isGroup = type === 'group-header',
    sticky = 1;
  if (isGroup) {
    groupDynamicIndex++;
  }
  GROUP_DYNAMIC_ITEMS.push({ id, type, name: isGroup ? `Group ${id}. ${generateText()}` : `${id}. ${generateText()}` });
  GROUP_DYNAMIC_ITEMS_ITEM_CONFIG_MAP[id] = {
    sticky: isGroup ? sticky : 0,
    selectable: !isGroup,
    collapsable: isGroup,
  };
  GROUP_DYNAMIC_ITEMS_WITH_SNAP.push({ id, type, name: isGroup ? `Group ${id}` : `${id}. ${generateText()}` });
  GROUP_DYNAMIC_ITEMS_ITEM_CONFIG_MAP_WITH_SNAP[id] = {
    sticky: isGroup ? sticky : 0,
    selectable: !isGroup,
    collapsable: isGroup,
  };
}

const generateItems = (len: number) => {
  const result: IVirtualListCollection<ICollectionItem> = [];
  for (let i = 0, l = len; i < l; i++) {
    const id = i + 1;
    result.push({ id, name: `Item: ${id}` });
  }
  return result;
};

const generateDynamicItems = (len: number, startWith: number = 0) => {
  const result: IVirtualListCollection<ICollectionItem> = [];
  for (let i = 0, l = len; i < l; i++) {
    const id = startWith + i;
    result.push({ id, name: `${id} ${generateText(8)}` });
  }
  return result;
};

const generateDynamicShortItems = (len: number, startWith: number = 0) => {
  const result: IVirtualListCollection<ICollectionItem> = [];
  for (let i = 0, l = len; i < l; i++) {
    const id = startWith + i;
    result.push({ id, name: `${id} ${generateWord(12)}` });
  }
  return result;
};

@Component({
  selector: 'app-root',
  templateUrl: './app.component.html',
  styleUrls: ['./app.component.scss'],
  standalone: false,
})
export class AppComponent {
  @ViewChild('virtualList', { read: NgVirtualListComponent })
  protected _listContainerRef!: NgVirtualListComponent;

  @ViewChild('dynamicItemsList', { read: NgVirtualListComponent })
  protected _dynamicItemsListContainerRef!: NgVirtualListComponent;

  @ViewChild('dynamicList', { read: NgVirtualListComponent })
  protected _dynamicListContainerRef!: NgVirtualListComponent;
  readonly logo = LOGO;

  scrollbarTheme = SCROLLBAR_GRADIENT;

  items = ITEMS;

  items1 = generateItems(1000);

  dynamicItems = generateDynamicItems(20, 0);

  dynamicShortItems = generateDynamicShortItems(20, 0);

  itemsRtl = ITEMS_RTL;

  horizontalItems = HORIZONTAL_ITEMS;

  groupItems = GROUP_ITEMS;
  groupItemsStickyMap = GROUP_ITEMS_ITEM_CONFIG_MAP;

  groupDynamicItems = GROUP_DYNAMIC_ITEMS;
  groupDynamicItemsStickyMap = GROUP_DYNAMIC_ITEMS_ITEM_CONFIG_MAP;

  groupDynamicItemsWithSanp = GROUP_DYNAMIC_ITEMS_WITH_SNAP;
  groupDynamicItemsStickyMapWithSanp = GROUP_DYNAMIC_ITEMS_ITEM_CONFIG_MAP_WITH_SNAP;

  horizontalGroupItems = HORIZONTAL_GROUP_ITEMS;
  horizontalGroupItemsStickyMap = HORIZONTAL_GROUP_ITEMS_ITEM_CONFIG_MAP;

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

  itemsLength: number = 0;

  dynamicItemsLength: number = 0;

  dynamicShortItemsLength: number = 0;

  constructor() {
    interval(1000).pipe(
      delay(250),
      tap(() => {
        const collection = [...this.dynamicItems];
        collection.unshift(...generateDynamicItems(1, this.dynamicItems.length));
        this.dynamicItems = collection;
      }),
      // delay(250),
      // tap(() => {
      //   const collection = [...this.dynamicItems];
      //   collection.shift();
      //   this.dynamicItems = collection;
      // }),
      delay(450),
      tap(() => {
        const collection = [...this.dynamicItems], len = collection.length, insertIndex = Math.floor(len * .5),
          insertedItems = generateDynamicItems(1, this.dynamicItems.length);
        collection.splice(insertIndex, 0, ...insertedItems);
        this.dynamicItems = collection;
      }),
      delay(650),
      tap(() => {
        const collection = [...this.dynamicItems];
        collection.push(...generateDynamicItems(1, this.dynamicItems.length));
        this.dynamicItems = collection;
      }),
    ).subscribe();


    interval(1000).pipe(
      delay(0),
      tap(() => {
        const collection = [...this.dynamicShortItems];
        collection.unshift(...generateDynamicShortItems(1, this.dynamicShortItems.length));
        this.dynamicShortItems = collection;
      }),
      // delay(250),
      // tap(() => {
      //   const collection = [...this.dynamicShortItems];
      //   collection.shift();
      //   this.dynamicShortItems = collection;
      // }),
      delay(450),
      tap(() => {
        const collection = [...this.dynamicShortItems], len = collection.length, insertIndex = Math.floor(len * .5),
          insertedItems = generateDynamicShortItems(1, this.dynamicShortItems.length);
        collection.splice(insertIndex, 0, ...insertedItems);
        this.dynamicShortItems = collection;
      }),
      delay(650),
      tap(() => {
        const collection = [...this.dynamicShortItems];
        collection.push(...generateDynamicShortItems(1, this.dynamicShortItems.length));
        this.dynamicShortItems = collection;
      }),
    ).subscribe();
  }

  onButtonScrollToIdClickHandler = (e: Event) => {
    const list = this._listContainerRef, id = this.itemId;
    if (list && id !== null) {
      list.scrollTo(id, () => {
        list.focus(id);
        console.info(`scrollTo finished. id: ${id}`);
      }, {
        behavior: 'smooth',
      });
    }
  }

  onButtonScrollDLToIdClickHandler = (e: Event) => {
    const list = this._dynamicListContainerRef, id = this.dlItemId;
    if (list && id !== null) {
      list.scrollTo(id, () => {
        list.focus(id);
        console.info(`scrollTo finished. id: ${id}`);
      }, {
        behavior: 'instant',
      });
    }
  }

  onItemClick(item: IRenderVirtualListItem<ICollectionItem> | null) {
    if (item) {
      console.info(`Click: (ID: ${item.id}) Item ${item.data.name}`);
    }
  }

  onButtonChangeItemsLengthHandler() {
    const len = this.itemsLength;
    this.items1 = generateItems(len);
  }

  onButtonChangeDynamicItemsLengthHandler() {
    const len = this.dynamicItemsLength;
    this.dynamicItems = generateDynamicItems(len);
  }

  onButtonChangeDynamicShortItemsLengthHandler() {
    const len = this.dynamicShortItemsLength;
    this.dynamicShortItems = generateDynamicShortItems(len);
  }

  onSelectHandler(data: Array<Id> | Id | null) {
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
