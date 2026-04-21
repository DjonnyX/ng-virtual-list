# NgVirtualList

🚀 High-performance virtual scrolling for Angular apps. Render 100,000+ items in Angular without breaking a sweat. Smooth, customizable, and developer-friendly.

Flexible, and actively maintained Angular library that excels with high-performance, feature-rich virtualized lists—including grouping, sticky headers, snapping, animations, collapsing group elements, single and multiple selection of elements and both scroll directions. Whether you're rendering millions of items or building interactive list components, it delivers scalability and customization. Angular (14–20) compatibility.

The main advantage of this solution is the elimination of the "empty spaces" effect during fast scrolling, which occurs in the classic implementation of virtualized lists. Visualization is as close as possible to native lists.

Works correctly in all browsers and platforms.

<img width="1033" height="171" alt="logo" src="https://github.com/user-attachments/assets/b559cfde-405a-4361-b71b-6715478d997d" />

<b>Angular version 20.X.X</b>.

![npm](https://img.shields.io/npm/v/ng-virtual-list)
![npm downloads](https://img.shields.io/npm/dm/ng-virtual-list)
![npm total downloads](https://img.shields.io/npm/dt/ng-virtual-list)

[Chat Demo](https://chat-demo.eugene-grebennikov.pro/)
[(Code)](https://github.com/DjonnyX/ng-virtual-list-chat-demo)

[News Feed Demo](https://news-feed-demo.eugene-grebennikov.pro/)
[(Code)](https://github.com/DjonnyX/ng-virtual-list-news-feed-demo)

[Live Examples (Storybook)](https://ng-virtual-list-examples.eugene-grebennikov.pro/)

[Examples](https://ng-virtual-list.eugene-grebennikov.pro/)
[(Code)](https://github.com/DjonnyX/ng-virtual-list-demo/tree/main/src/app)

<br/>

## ✨ Why use ng-virtual-list?

⚡ Blazing fast — only renders what’s visible (plus a smart buffer).<br/>
📱 Works everywhere — smooth on desktop & mobile.<br/>
🔀 Flexible layouts — vertical, horizontal, grouped lists, sticky headers.<br/>
📏 Dynamic sizes — handles items of varying height/width.<br/>
🔍 Precise control — scroll to an ID, or snap to positions.<br/>
✅ Selecting elements — ability to work in Select and MultiSelect modes.<br/>
🧩 Collapsing group elements — ability to collapse group elements (elements with the "stickiness" parameter).<br/>

<br/>

## ⚙️ Key Features

 Virtualization modes
- Fixed size (fastest)
  - Dynamic size (auto-measured)
  - Scrolling control
- Scroll to item ID
  - Smooth or instant scroll
  - Custom snapping behavior
- Advanced layouts
  - Grouped lists with sticky headers
  - Horizontal or vertical scrolling
- Selecting elements
  - Single selection
  - Multiple selection
- Performance tuning
  - bufferSize and maxBufferSize for fine-grained control
- Collapsing groups
  - collapse group elements

<br/>

## 📱 When to Use It: Ideal Use Cases

Drawing on general virtual-scroll insights and ng-virtual-list features:

Long-Scrolling Lists / Live Feeds
When displaying hundreds of thousands of items (think social media feeds, chat logs, or news streams), ng-virtual-list ensures smooth and responsive rendering without overwhelming the browser.

Horizontal Carousels or Galleries
Ideal for media-rich UI elements like image galleries, product cards, or horizontal scrollers where traditional ngFor rendering becomes sluggish.

Grouped Navigation with Section Headers
For catalogs, logs, or grouped entries (e.g., by date or category), you can use sticky headers and snapping to guide user navigation effectively. 

"Jump to" Item Navigation
Use cases like directories or chat histories benefit from the ability to scroll directly to specific items by ID. 

Complex or Rich-Content Templates
As each item may contain images, nested components, or interactions, virtual rendering keeps performance intact even when item complexity increases.

Single and multiple selection of elements

Navigating with the keyboard

Collapsing groups

Support for element animation

Implemented a virtual scroll handler, ensuring stable scrolling on all platforms

<br/>

## 📦 Installation

```bash
npm i ng-virtual-list
```

<br/>

## 🚀 Quick Start
```html
<ng-virtual-list [items]="items" [bufferSize]="5" [itemRenderer]="itemRenderer" [dynamicSize]="false" [itemSize]="64"></ng-virtual-list>

<ng-template #itemRenderer let-data="data">
  @if (data) {
      <span>{{data.name}}</span>
  }
</ng-template>
```
```ts
items = Array.from({ length: 100000 }, (_, i) => ({ id: i, name: `Item #${i}` }));
```

<br/>

## 📱 Examples

### Horizontal virtual list (Single selection)

![preview](https://github.com/user-attachments/assets/5a16d4b3-5e66-4d53-ae90-d0eab0b246a1)

Template:
```html
<ng-virtual-list class="list" direction="horizontal" [items]="horizontalItems" [bufferSize]="1" [maxBufferSize]="5"
    [itemRenderer]="horizontalItemRenderer" [dynamicSize]="false" [itemSize]="64" [methodForSelecting]="'select'"
    [selectedIds]="2" (onSelect)="onSelect($event)" (onItemClick)="onItemClick($event)"></ng-virtual-list>

<ng-template #horizontalItemRenderer let-data="data" let-config="config">
  @if (data) {
    <div [ngClass]="{'list__h-container': true, 'selected': config.selected}">
      <span>{{data.name}}</span>
    </div>
  }
</ng-template>
```

Component:
```ts
import { NgVirtualListComponent, IVirtualListCollection, IRenderVirtualListItem } from 'ng-virtual-list';

interface ICollectionItem {
  name: string;
}

const HORIZONTAL_ITEMS: IVirtualListCollection<ICollectionItem> = Array.from({ length: 100000 }, (_, i) => ({ id: i, name: `${i}` }));

@Component({
  selector: 'app-root',
  imports: [NgVirtualListComponent],
  templateUrl: './app.component.html',
  styleUrl: './app.component.scss'
})
export class AppComponent {
  horizontalItems = HORIZONTAL_ITEMS;

  onItemClick(item: IRenderVirtualListItem<ICollectionItem> | null) {
    if (item) {
      console.info(`Click: (ID: ${item.id}) Item ${item.data.name}`);
    }
  }

  onSelect(data: Array<Id> | Id | null) {
    console.info(`Select: ${JSON.stringify(data)}`);
  }
}
```

### Horizontal grouped virtual list (Multiple selection)

![preview](https://github.com/user-attachments/assets/99584660-dc0b-4cd0-9439-9b051163c077)

Template:
```html
<ng-virtual-list class="list" direction="horizontal" [items]="horizontalGroupItems" [itemRenderer]="horizontalGroupItemRenderer"
    [bufferSize]="1" [maxBufferSize]="5" [itemConfigMap]="horizontalGroupItemConfigMap" [dynamicSize]="false" [itemSize]="54" [stickyEnabled]="true" methodForSelecting="multi-select" [selectedIds]="[3,2]" (onSelect)="onSelect($event)" (onItemClick)="onItemClick($event)"></ng-virtual-list>

<ng-template #horizontalGroupItemRenderer let-data="data" let-config="config">
  @if (data) {
    @switch (data.type) {
      @case ("group-header") {
        <div class="list__h-group-container">
          <span>{{data.name}}</span>
        </div>
      }
      @default {
        <div [ngClass]="{'list__h-container': true, 'selected': config.selected}">
          <span>{{data.name}}</span>
        </div>
      }
    }
  }
</ng-template>
```

Component:
```ts
import { NgVirtualListComponent, IVirtualListCollection, IVirtualListItemConfigMap, IRenderVirtualListItem } from 'ng-virtual-list';

const GROUP_NAMES = ['A', 'B', 'C', 'D', 'E'];

const getGroupName = () => {
  return GROUP_NAMES[Math.floor(Math.random() * GROUP_NAMES.length)];
};

interface ICollectionItem {
  type: 'group-header' | 'item';
  name: string;
}

const HORIZONTAL_GROUP_ITEMS: IVirtualListCollection<ICollectionItem> = [],
  HORIZONTAL_GROUP_ITEM_CONFIG_MAP: IVirtualListItemConfigMap = {};

for (let i = 0, l = 1000000; i < l; i++) {
  const id = i + 1, type = Math.random() > .895 ? 'group-header' : 'item';
  HORIZONTAL_GROUP_ITEMS.push({ id, type, name: type === 'group-header' ? getGroupName() : `${i}` });
  HORIZONTAL_GROUP_ITEM_CONFIG_MAP[id] = type === 'group-header' ? 1 : 0;
}

@Component({
  selector: 'app-root',
  imports: [NgVirtualListComponent],
  templateUrl: './app.component.html',
  styleUrl: './app.component.scss'
})
export class AppComponent {
  horizontalGroupItems = HORIZONTAL_GROUP_ITEMS;
  horizontalGroupItemConfigMap = HORIZONTAL_GROUP_ITEM_CONFIG_MAP;

  onItemClick(item: IRenderVirtualListItem<ICollectionItem> | null) {
    if (item) {
      console.info(`Click: (ID: ${item.id}) Item ${item.data.name}`);
    }
  }

  onSelect(data: Array<Id> | Id | null) {
    console.info(`Select: ${JSON.stringify(data)}`);
  }
}
```

### Vertical virtual list

![preview](https://github.com/user-attachments/assets/ca00eec9-fa9e-4e8d-8899-23343e4bd8a5)

Template:
```html
<ng-virtual-list class="list simple" [items]="items" [bufferSize]="1" [maxBufferSize]="5" [itemRenderer]="itemRenderer"
  [dynamicSize]="false" [itemSize]="40"></ng-virtual-list>

<ng-template #itemRenderer let-data="data">
  @if (data) {
    <div class="list__container">
      <p>{{data.name}}</p>
    </div>
  }
</ng-template>
```

Component:
```ts
import { NgVirtualListComponent, IVirtualListCollection } from 'ng-virtual-list';

const ITEMS: IVirtualListCollection = [];

for (let i = 0, l = 100000; i < l; i++) {
  ITEMS.push({ id: i, name: `Item: ${i}` });
}

@Component({
  selector: 'app-root',
  imports: [NgVirtualListComponent],
  templateUrl: './app.component.html',
  styleUrl: './app.component.scss'
})
export class AppComponent {
  items = ITEMS;
}
```

### Vertical grouped virtual list

#### Without snapping

![preview](https://github.com/user-attachments/assets/bd4817d8-92f2-4703-aed1-ab7ca18a751e)

Template:
```html
<ng-virtual-list class="list simple" [items]="groupItems" [bufferSize]="1" [maxBufferSize]="5" [itemRenderer]="groupItemRenderer"
    [itemConfigMap]="groupItemConfigMap" [dynamicSize]="false" [itemSize]="40" [stickyEnabled]="false"></ng-virtual-list>

<ng-template #groupItemRenderer let-data="data">
  @if (data) {
    @switch (data.type) {
      @case ("group-header") {
        <div class="list__group-container">
          <p>{{data.name}}</p>
        </div>
      }
      @default {
        <div class="list__container">
          <p>{{data.name}}</p>
        </div>
      }
    }
  }
</ng-template>
```

#### With snapping

![preview](https://github.com/user-attachments/assets/d2101d78-73c8-4f2e-900a-1b55bc554f13)

Template (with snapping):
```html
<ng-virtual-list class="list simple" [items]="groupItems" [bufferSize]="1" [maxBufferSize]="5" [itemRenderer]="groupItemRenderer"
    [itemConfigMap]="groupItemConfigMap" [dynamicSize]="false" [itemSize]="40" [stickyEnabled]="true"></ng-virtual-list>

<ng-template #groupItemRenderer let-data="data">
  @if (data) {
    @switch (data.type) {
      @case ("group-header") {
        <div class="list__group-container">
          <p>{{data.name}}</p>
        </div>
      }
      @default {
        <div class="list__container">
          <p>{{data.name}}</p>
        </div>
      }
    }
  }
</ng-template>
```

Component:
```ts
import { NgVirtualListComponent, IVirtualListCollection, IVirtualListItemConfigMap } from 'ng-virtual-list';

const GROUP_ITEMS: IVirtualListCollection = [],
  GROUP_ITEM_CONFIG_MAP: IVirtualListItemConfigMap = {};

let groupIndex = 0;
for (let i = 0, l = 10000000; i < l; i++) {
  const id = i, type = Math.random() > .895 ? 'group-header' : 'item';
  if (type === 'group-header') {
    groupIndex++;
  }
  GROUP_ITEMS.push({ id, type, name: type === 'group-header' ? `Group ${groupIndex}` : `Item: ${i}` });
  GROUP_ITEM_CONFIG_MAP[id] = type === 'group-header' ? 1 : 0;
}

@Component({
  selector: 'app-root',
  imports: [NgVirtualListComponent],
  templateUrl: './app.component.html',
  styleUrl: './app.component.scss'
})
export class AppComponent {
  groupItems = GROUP_ITEMS;
  groupItemConfigMap = GROUP_ITEM_CONFIG_MAP;
}

```

### ScrollTo

The example demonstrates the scrollTo method by passing it the element id. It is important not to confuse the ordinal index and the element id. In this example, id = index + 1

![preview](https://github.com/user-attachments/assets/18aa0fd5-8953-4736-9725-b3a4c8b5b4b4)

Template
```html
<div class="scroll-to__controls">
  <input type="number" class="scroll-to__input" [(ngModel)]="itemId" [required]="true" [min]="items[0].id"
    [max]="items[items.length - 1].id">
  <button class="scroll-to__button" (click)="onButtonScrollToIdClickHandler($event)">Scroll</button>
</div>

<ng-virtual-list #virtualList class="list" [items]="items" [itemRenderer]="itemRenderer" [bufferSize]="1" [maxBufferSize]="5"
  [dynamicSize]="false" [itemSize]="40"></ng-virtual-list>

<ng-template #itemRenderer let-data="data">
@if (data) {
  <div class="list__container">
    <span>{{data.name}}</span>
  </div>
}
</ng-template>
```

Component
```ts
import { NgVirtualListComponent, IVirtualListCollection, Id } from 'ng-virtual-list';

const MAX_ITEMS = 1000000;

const ITEMS: IVirtualListCollection = [];
for (let i = 0, l = MAX_ITEMS; i < l; i++) {
  ITEMS.push({ id: i + 1, name: `Item: ${i}` });
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

  itemId: Id = this.items[0].id;

  onButtonScrollToIdClickHandler = (e: Event) => {
    const list = this._listContainerRef();
    if (list) {
      list.scrollTo(this.itemId, 'smooth');
    }
  }
}

```

### Virtual list (with dynamic item size)

Virtual list with height-adjustable elements.

![preview](https://github.com/user-attachments/assets/3c7e8779-c15d-4eb5-a1c5-d774f614fbaf)

Template
```html
<ng-virtual-list #dynamicList class="list" [items]="groupDynamicItems" [itemRenderer]="groupItemRenderer" [bufferSize]="1" [maxBufferSize]="5"
      [itemConfigMap]="groupDynamicItemConfigMap" [stickyEnabled]="true"></ng-virtual-list>

<ng-template #groupItemRenderer let-data="data">
  @if (data) {
    @switch (data.type) {
      @case ("group-header") {
        <div class="list__group-container">
          <span>{{data.name}}</span>
        </div>
      }
      @default {
        <div class="list__container">
          <span>{{data.name}}</span>
        </div>
      }
    }
  }
</ng-template>
```

Component
```ts
import { NgVirtualListComponent, IVirtualListCollection } from 'ng-virtual-list';

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
  result[0] = result[0].toUpperCase();
  return `${result.join(' ')}.`;
};

const GROUP_DYNAMIC_ITEMS: IVirtualListCollection = [],
  GROUP_DYNAMIC_ITEM_CONFIG_MAP: IVirtualListItemConfigMap = {};

let groupDynamicIndex = 0;
for (let i = 0, l = 100000; i < l; i++) {
  const id = i + 1, type = i === 0 || Math.random() > .895 ? 'group-header' : 'item';
  if (type === 'group-header') {
    groupDynamicIndex++;
  }
  GROUP_DYNAMIC_ITEMS.push({ id, type, name: type === 'group-header' ? `Group ${groupDynamicIndex}` : `${id}. ${generateText()}` });
  GROUP_DYNAMIC_ITEM_CONFIG_MAP[id] = type === 'group-header' ? 1 : 0;
}

@Component({
  selector: 'app-root',
  imports: [FormsModule, NgVirtualListComponent],
  templateUrl: './app.component.html',
  styleUrl: './app.component.scss'
})
export class AppComponent {
  groupDynamicItems = GROUP_DYNAMIC_ITEMS;
  groupDynamicItemConfigMap = GROUP_DYNAMIC_ITEM_CONFIG_MAP;
}
```

<br/>

## 🖼️ Stylization

### Scrollbar stylization

```scss
.list::part(scrollbar-thumb__shape) {
    background-color: rgba(51, 0, 97, 1);
    border-radius: 3px;
}
```

```html
<ng-virtual-list class="list" [scrollbarThickness]="12" [items]="items" [itemRenderer]="itemRenderer"></ng-virtual-list>

<ng-template #itemRenderer let-data="data" let-config="config">
  <span>{{data.name}}</span>
</ng-template>
```

### Scrollbar castomization

[Examples](https://github.com/DjonnyX/ng-virtual-list/blob/20.x/src/app/app.component.html)
[CustomScrollbarComponent](https://github.com/DjonnyX/ng-virtual-list/blob/20.x/src/app/components/custom-scrollbar/custom-scrollbar.component.ts)

List items are encapsulated in shadowDOM, so to override default styles you need to use ::part access

- Customize a scroll area of list
```css
.list {
    border-radius: 3px;
    box-shadow: 1px 2px 8px 4px rgba(0, 0, 0, 0.075);
    border: 1px solid rgba(0, 0, 0, 0.1);
}
```

- Set up the list item canvas
```css
.list::part(list) {
    background-color: #ffffff;
}
```

- Set up the snapped item (Only SnappingMethod.ADVANCED)
```css
.list::part(snapped-item) {
    color: #71718c;
}
```

- Set up the list item
```css
.list::part(item) {
    background-color: unset; // override default styles
}
```

Selecting even elements:

```html
<ng-virtual-list class="list" direction="horizontal" [items]="horizontalItems" [bufferSize]="1" [maxBufferSize]="5"
  [itemRenderer]="horizontalItemRenderer" [itemSize]="54"></ng-virtual-list>

<ng-template #horizontalItemRenderer let-data="data" let-config="config">
  @if (data) {
    <div [ngClass]="{'item-container': true, 'even': config.even}">
      <span>{{data.name}}</span>
    </div>
  }
</ng-template>
```

```css
.item-container {
  &.even {
      background-color: #1d1d21;
  }
}
```

<br/>

## 📚 API

### [NgVirtualListComponent](https://github.com/DjonnyX/ng-virtual-list/blob/20.x/projects/ng-virtual-list/src/lib/ng-virtual-list.component.ts)

Inputs

| Property | Type | Description |
|---|---|---|
| animationParams | [IAnimationParams](https://github.com/DjonnyX/ng-virtual-list/blob/20.x/projects/ng-virtual-list/src/lib/interfaces/animation-params.ts)? = { scrollToItem: 50, snapToItem: 150, navigateToItem: 150, navigateByKeyboard: 50 } | Animation parameters. The default value is "{ scrollToItem: 50, snapToItem: 150, navigateToItem: 150, navigateByKeyboard: 50 }". |
| bufferSize | number? = 2 | Number of elements outside the scope of visibility. Default value is 2. |
| maxBufferSize | number? = 10 | Maximum number of elements outside the scope of visibility. Default value is 10. If maxBufferSize is set to be greater than bufferSize, then adaptive buffer mode is enabled. The greater the scroll size, the more elements are allocated for rendering. |
| collapsedIds | Array<[Id](https://github.com/DjonnyX/ng-virtual-list/blob/20.x/projects/ng-virtual-list/src/lib/types/id.ts)> | Sets the collapsed items. |
| collapseByClick | boolean? = true | If `false`, the element is collapsed using the config.collapse method passed to the template; if `true`, the element is collapsed by clicking on it. The default value is `true`. |
| collectionMode | [CollectionMode? = 'normal'](https://github.com/DjonnyX/ng-virtual-list/blob/20.x/projects/ng-virtual-list/src/lib/enums/collection-mode.ts) | Determines the action modes for collection elements. Default value is `normal`. |
| divides | number = 1 | Column or row numbers. The default value is `1`. |
| direction | [Direction? = 'vertical'](https://github.com/DjonnyX/ng-virtual-list/blob/20.x/projects/ng-virtual-list/src/lib/enums/direction.ts) | Determines the direction in which elements are placed. Default value is "vertical". |
| dynamicSize | boolean? = true | If true, items in the list may have different sizes, and the itemSize property must be specified to adjust the sizes of items in the unallocated area. If false then the items in the list have a fixed size specified by the itemSize property. The default value is true. |
| enabledBufferOptimization | boolean? = true | Experimental! Enables buffer optimization. Can only be used if items in the collection are not added or updated. |
| id | number | Readonly. Returns the unique identifier of the component. | 
| items | [IVirtualListCollection](https://github.com/DjonnyX/ng-virtual-list/blob/20.x/projects/ng-virtual-list/src/lib/models/collection.model.ts) | Collection of list items. The collection of elements must be immutable. |
| itemSize | number \| 'viewport' = 24 | If direction = 'vertical', then the height of a typical element. If direction = 'horizontal', then the width of a typical element. If the dynamicSize property is true, the items in the list can have different sizes, and you must specify the itemSize property to adjust the sizes of the items in the unallocated area. If the value is 'viewport', the sizes of elements are automatically resized to fit the viewport size. |
| itemRenderer | TemplateRef | Rendering element template. |
| itemConfigMap | [IVirtualListItemConfigMap?](https://github.com/DjonnyX/ng-virtual-list/blob/20.x/projects/ng-virtual-list/src/lib/models/item-config-map.model.ts) | Sets `sticky` position and `selectable` for the list item element. If `sticky` position is greater than `0`, then `sticky` position is applied. If the `sticky` value is greater than `0`, then the `sticky` position mode is enabled for the element. `1` - position start, `2` - position end. Default value is `0`. `selectable` determines whether an element can be selected or not. Default value is `true`. |
| methodForSelecting | [MethodForSelecting](https://github.com/DjonnyX/ng-virtual-list/blob/20.x/projects/ng-virtual-list/src/lib/enums/method-for-selecting.ts) | Method for selecting list items. Default value is 'none'. 'select' - List items are selected one by one. 'multi-select' - Multiple selection of list items. 'none' - List items are not selectable. |
| langTextDir | [TextDirection? = 'ltr'](https://github.com/DjonnyX/ng-virtual-list/blob/20.x/projects/ng-virtual-list/src/lib/enums/text-direction.ts) | A string indicating the direction of text for the locale. Can be either "ltr" (left-to-right) or "rtl" (right-to-left). |
| loading | boolean? = false | If `true`, the scrollBar goes into loading state. The default value is `false`. |
| motionBlur | number \| 'disabled' = 0.15 | Motion blur effect. The default value is `0.25`. |
| maxMotionBlur | number = 0.5 | Maximum motion blur effect. The default value is `20`. |
| motionBlurEnabled | boolean = false | Determines whether to apply motion blur or not. The default value is `false`. |
| overscrollEnabled | boolean? = true | Determines whether the overscroll (re-scroll) feature will work. The default value is "true". |
| selectByClick | boolean? = true | If `false`, the element is selected using the config.select method passed to the template; if `true`, the element is selected by clicking on it. The default value is `true`. |
| stickyEnabled | boolean? = false | Determines whether items with the given `sticky` in `itemConfigMap` will stick to the edges. Default value is "false". |
| selectedIds | Array<[Id](https://github.com/DjonnyX/ng-virtual-list/blob/20.x/projects/ng-virtual-list/src/lib/types/id.ts)> \| [Id](https://github.com/DjonnyX/ng-virtual-list/blob/20.x/projects/ng-virtual-list/src/lib/types/id.ts) \| null | Sets the selected items. |
| screenReaderMessage | string? = "Showing items $1 to $2" | Message for screen reader. The message format is: "some text `$1` some text `$2`", where `$1` is the number of the first element of the screen collection, `$2` is the number of the last element of the screen collection. |
| clickDistance | number? = 40 | The maximum scroll distance at which a click event is triggered. |
| waitForPreparation | boolean? = true | If true, it will wait until the list items are fully prepared before displaying them.. The default value is `true`. |
| scrollStartOffset | number? = 0 | Sets the scroll start offset value; Default value is "0". |
| scrollEndOffset | number? = 0 | Sets the scroll end offset value; Default value is "0". |
| snapToItem | boolean = false | Snap to item. The default value is `false`. |
| snapToItemAlign | [SnapToItemAlign](https://github.com/DjonnyX/ng-virtual-list/blob/20.x/projects/ng-virtual-list/src/lib/enums/snap-to-item-align.ts) = [SnapToItemAligns](https://github.com/DjonnyX/ng-virtual-list/blob/20.x/projects/ng-virtual-list/src/lib/enums/snap-to-item-aligns.ts).CENTER | Alignment for snapToItem. Available values ​​are start, center, and end. The default value is `center`. |
| snappingMethod | [SnappingMethod](https://github.com/DjonnyX/ng-virtual-list/blob/20.x/projects/ng-virtual-list/src/lib/enums/snapping-method.ts) | Snapping method. Default value is [SnappingMethods.STANDART](https://github.com/DjonnyX/ng-virtual-list/blob/20.x/projects/ng-virtual-list/src/lib/enums/snapping-method.ts). [SnappingMethods.STANDART](https://github.com/DjonnyX/ng-virtual-list/blob/20.x/projects/ng-virtual-list/src/lib/enums/snapping-method.ts) - Classic group visualization. [SnappingMethods.ADVANCED](https://github.com/DjonnyX/ng-virtual-list/blob/20.x/projects/ng-virtual-list/src/lib/enums/snapping-method.ts) - A mask is applied to the viewport area so that the background is displayed underneath the attached group. |
| snapScrollToStart | boolean? = true | Determines whether the scroll will be anchored to the start of the list. Default value is "true". This property takes precedence over the snapScrollToEnd property. That is, if snapScrollToStart and snapScrollToEnd are enabled, the list will initially snap to the beginning; if you move the scroll bar to the end, the list will snap to the end. If snapScrollToStart is disabled and snapScrollToEnd is enabled, the list will snap to the end; if you move the scroll bar to the beginning, the list will snap to the beginning. If both snapScrollToStart and snapScrollToEnd are disabled, the list will never snap to the beginning or end. |
| snapScrollToEnd | boolean? = true | Determines whether the scroll will be anchored to the утв of the list. Default value is "true". That is, if snapScrollToStart and snapScrollToEnd are enabled, the list will initially snap to the beginning; if you move the scroll bar to the end, the list will snap to the end. If snapScrollToStart is disabled and snapScrollToEnd is enabled, the list will snap to the end; if you move the scroll bar to the beginning, the list will snap to the beginning. If both snapScrollToStart and snapScrollToEnd are disabled, the list will never snap to the beginning or end. |
| snapToEndTransitionInstantOffset | number? = 0 | Sets the offset value; if the scroll area value is exceeded, the scroll animation will be disabled. Default value is "0". |
| scrollbarEnabled | boolean? = true | Determines whether the scrollbar is shown or not. The default value is "true". |
| scrollbarInteractive | boolean? = true | Determines whether scrolling using the scrollbar will be possible. The default value is "true". |
| scrollbarMinSize | number? = 80 | Minimum scrollbar size. |
| scrollbarThickness | number? = 6 | Scrollbar thickness. |
| scrollbarThumbRenderer | TemplateRef<any> \| null = null | Scrollbar customization template. |
| scrollbarThumbParams | {[propName: string]: any;} \| null | Additional options for the scrollbar. |
| scrollBehavior | ScrollBehavior? = 'smooth' | Defines the scrolling behavior for any element on the page. The default value is "smooth". |
| scrollingSettings | [IScrollingSettings](https://github.com/DjonnyX/ng-virtual-list/blob/20.x/projects/ng-virtual-list/src/lib/interfaces/scrolling-settings.ts) = {frictionalForce: 0.035, mass: 0.005, maxDistance: 100000, maxDuration: 4000, speedScale: 10, optimization: true} | Scrolling settings. |
| scrollingOneByOne | boolean = false | Specifies whether to scroll one item at a time if true and the scrollToItem property is set. The default value is `false`. |
| trackBy | string? = 'id' | The name of the property by which tracking is performed. |

<br/>

Outputs

| Event | Type | Description |
|---|---|---|
| onItemClick | [IRenderVirtualListItem](https://github.com/DjonnyX/ng-virtual-list/blob/20.x/projects/ng-virtual-list/src/lib/models/render-item.model.ts) \| null | Fires when an element is clicked. |
| onScroll | ([IScrollEvent](https://github.com/DjonnyX/ng-virtual-list/blob/20.x/projects/ng-virtual-list/src/lib/interfaces/scroll-event.ts)) => void | Fires when the list has been scrolled. |
| onScrollEnd | ([IScrollEvent](https://github.com/DjonnyX/ng-virtual-list/blob/20.x/projects/ng-virtual-list/src/lib/interfaces/scroll-event.ts)) => void | Fires when the list has completed scrolling. |
| onSelect | Array<[Id](https://github.com/DjonnyX/ng-virtual-list/blob/20.x/projects/ng-virtual-list/src/lib/types/id.ts)> \| [Id](https://github.com/DjonnyX/ng-virtual-list/blob/20.x/projects/ng-virtual-list/src/lib/types/id.ts) \| null | Fires when an elements are selected. |
| onCollapse | Array<[Id](https://github.com/DjonnyX/ng-virtual-list/blob/20.x/projects/ng-virtual-list/src/lib/types/id.ts)> \| [Id](https://github.com/DjonnyX/ng-virtual-list/blob/20.x/projects/ng-virtual-list/src/lib/types/id.ts) \| null | Fires when elements are collapsed. |
| onViewportChange | [ISize](https://github.com/DjonnyX/ng-virtual-list/blob/20.x/projects/ng-virtual-list/src/lib/interfaces/size.ts) | Fires when the viewport size is changed. |
| onScrollReachStart | void | Fires when the scroll reaches the start. |
| onScrollReachEnd | void | Fires when the scroll reaches the end. |

<br/>

Methods

| Method | Type | Description |
|--|--|--|
| scrollTo | (id: [Id](https://github.com/DjonnyX/ng-virtual-list/blob/20.x/projects/ng-virtual-list/src/lib/types/id.ts), (cb: () => void) \| null = null, options: [IScrollOptions](https://github.com/DjonnyX/ng-virtual-list/blob/20.x/projects/ng-virtual-list/src/lib/interfaces/scroll-options.ts) \| null = null) | The method scrolls the list to the element with the given `id` and returns the value of the scrolled area. |
| scrollToStart | (cb: (() => void) \| null = null, options: [IScrollOptions](https://github.com/DjonnyX/ng-virtual-list/blob/20.x/projects/ng-virtual-list/src/lib/interfaces/scroll-options.ts) \| null = null) | Scrolls the scroll area to the first item in the collection. |
| scrollToEnd | (cb: (() => void) \| null = null, options: [IScrollOptions](https://github.com/DjonnyX/ng-virtual-list/blob/20.x/projects/ng-virtual-list/src/lib/interfaces/scroll-options.ts) \| null = null) | Scrolls the list to the end of the content height. |
| getItemBounds | (id: [Id](https://github.com/DjonnyX/ng-virtual-list/blob/20.x/projects/ng-virtual-list/src/lib/types/id.ts)) => [ISize \| null](https://github.com/DjonnyX/ng-virtual-list/blob/20.x/projects/ng-virtual-list/src/lib/interfaces/size.ts) | Returns the bounds of an element with a given id |
| focus | [Id](https://github.com/DjonnyX/ng-virtual-list/blob/20.x/projects/ng-virtual-list/src/lib/types/id.ts), align: [FocusAlignment](https://github.com/DjonnyX/ng-virtual-list/blob/20.x/projects/ng-virtual-list/src/lib/types/focus-alignment.ts) = [FocusAlignments.NONE](https://github.com/DjonnyX/ng-virtual-list/blob/20.x/projects/ng-virtual-list/src/lib/enums/focus-alignments.ts) | Focus an list item by a given id. |
| preventSnapping |  | Prevents the list from snapping to its start or end edge. |

<br/>

### Template API

```html
<ng-template #itemRenderer let-data="data" let-config="config" let-measures="measures" let-api="api">
  <!-- content -->
</ng-template>
```

Properties

| Property | Type | Description |
|--|--|--|
| api | [NgVirtualListPublicService](https://github.com/DjonnyX/ng-virtual-list/blob/20.x/projects/ng-virtual-list/src/lib/ng-virtual-list-public.service.ts) | List API Provider. |
| data | {\[id: [Id](https://github.com/DjonnyX/ng-virtual-list/blob/20.x/projects/ng-virtual-list/src/lib/types/id.ts) \], [otherProps: string]: any;} | Collection item data. |
| config | [IDisplayObjectConfig](https://github.com/DjonnyX/ng-virtual-list/blob/20.x/projects/ng-virtual-list/src/lib/models/display-object-config.model.ts) | Display object configuration. A set of `select`, `collapse`, and `focus` methods are also provided. |
| measures | [IDisplayObjectMeasures](https://github.com/DjonnyX/ng-virtual-list/blob/20.x/projects/ng-virtual-list/src/lib/models/display-object-measures.model.ts) \| null | Display object metrics. |

<br/>

## 🤝 Contributing

PRs and feature requests are welcome!
Open an issue or start a discussion to shape the future of [ng-virtual-list](https://github.com/DjonnyX/ng-virtual-list/).
Try it out, star ⭐ the repo, and let us know what you’re building.

<br/>

## 📄 License

MIT License

Copyright (c) 2026 djonnyx (Evgenii Alexandrovich Grebennikov)

Permission is hereby granted, free of charge, to any person obtaining a copy
of this software and associated documentation files (the "Software"), to deal
in the Software without restriction, including without limitation the rights
to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
copies of the Software, and to permit persons to whom the Software is
furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in all
copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
SOFTWARE.
