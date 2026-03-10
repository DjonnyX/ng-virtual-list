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

[Live Demo](https://chat-demo.eugene-grebennikov.pro/)
[(Code)](https://github.com/DjonnyX/ng-virtual-list-chat-demo)

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
<ng-virtual-list [items]="items" [bufferSize]="5" [itemRenderer]="itemRenderer" [itemSize]="64"></ng-virtual-list>

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
    [itemRenderer]="horizontalItemRenderer" [itemSize]="64" [methodForSelecting]="'select'"
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

  onItemClick(item: IRenderVirtualListItem<ICollectionItem> | undefined) {
    if (item) {
      console.info(`Click: (ID: ${item.id}) Item ${item.data.name}`);
    }
  }

  onSelect(data: Array<Id> | Id | undefined) {
    console.info(`Select: ${JSON.stringify(data)}`);
  }
}
```

### Horizontal grouped virtual list (Multiple selection)

![preview](https://github.com/user-attachments/assets/99584660-dc0b-4cd0-9439-9b051163c077)

Template:
```html
<ng-virtual-list class="list" direction="horizontal" [items]="horizontalGroupItems" [itemRenderer]="horizontalGroupItemRenderer"
    [bufferSize]="1" [maxBufferSize]="5" [itemConfigMap]="horizontalGroupItemConfigMap" [itemSize]="54" [snap]="true"
    methodForSelecting="multi-select" [selectedIds]="[3,2]" (onSelect)="onSelect($event)" (onItemClick)="onItemClick($event)"></ng-virtual-list>

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

  onItemClick(item: IRenderVirtualListItem<ICollectionItem> | undefined) {
    if (item) {
      console.info(`Click: (ID: ${item.id}) Item ${item.data.name}`);
    }
  }

  onSelect(data: Array<Id> | Id | undefined) {
    console.info(`Select: ${JSON.stringify(data)}`);
  }
}
```

### Vertical virtual list

![preview](https://github.com/user-attachments/assets/ca00eec9-fa9e-4e8d-8899-23343e4bd8a5)

Template:
```html
<ng-virtual-list class="list simple" [items]="items" [bufferSize]="1" [maxBufferSize]="5" [itemRenderer]="itemRenderer"
  [itemSize]="40"></ng-virtual-list>

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
    [itemConfigMap]="groupItemConfigMap" [itemSize]="40" [snap]="false"></ng-virtual-list>

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
    [itemConfigMap]="groupItemConfigMap" [itemSize]="40" [snap]="true"></ng-virtual-list>

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
  [itemSize]="40"></ng-virtual-list>

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
      [itemConfigMap]="groupDynamicItemConfigMap" [dynamicSize]="true" [snap]="true"></ng-virtual-list>

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

- Scrollbar theme
```ts
import { NgVirtualListComponent, GradientColor, RoundedCorner, ScrollBarTheme } from 'ng-virtual-list';

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

@Component({
  selector: 'app-root',
  imports: [FormsModule, NgVirtualListComponent],
  templateUrl: './app.component.html',
  styleUrl: './app.component.scss'
})
export class AppComponent {
  scrollbarTheme = SCROLLBAR_GRADIENT;

  items = Array.from({ length: 100000 }, (_, i) => ({ id: i, name: `Item #${i}` }));
}

```

```html
<ng-virtual-list [scrollbarTheme]="scrollbarTheme" [items]="items" [itemRenderer]="itemRenderer"></ng-virtual-list>

<ng-template #horizontalItemRenderer let-data="data" let-config="config">
  @if (data) {
    <div [ngClass]="{'list__h-container': true, 'selected': config.selected}">
      <span>{{data.name}}</span>
    </div>
  }
</ng-template>
```

List items are encapsulated in shadowDOM, so to override default styles you need to use ::part access

- Customize a scroll area of list
```css
.list::part(scroller) {
    scroll-behavior: auto;

    /* custom scrollbar */
    &::-webkit-scrollbar {
        width: 16px;
        height: 16px;
    }

    &::-webkit-scrollbar-track {
        background-color: #ffffff;
    }

    &::-webkit-scrollbar-thumb {
        background-color: #d6dee1;
        border-radius: 20px;
        border: 6px solid transparent;
        background-clip: content-box;
        min-width: 60px;
        min-height: 60px;
    }

    &::-webkit-scrollbar-thumb:hover {
        background-color: #a8bbbf;
    }
}

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
| id | number | Readonly. Returns the unique identifier of the component. | 
| items | [IVirtualListCollection](https://github.com/DjonnyX/ng-virtual-list/blob/20.x/projects/ng-virtual-list/src/lib/models/collection.model.ts) | Collection of list items. The collection of elements must be immutable. |
| itemSize | number? = 24 | If direction = 'vertical', then the height of a typical element. If direction = 'horizontal', then the width of a typical element. Ignored if the dynamicSize property is true. |
| bufferSize | number? = 2 | Number of elements outside the scope of visibility. Default value is 2. |
| maxBufferSize | number? = 10 | Maximum number of elements outside the scope of visibility. Default value is 10. If maxBufferSize is set to be greater than bufferSize, then adaptive buffer mode is enabled. The greater the scroll size, the more elements are allocated for rendering. |
| itemRenderer | TemplateRef | Rendering element template. |
| methodForSelecting | [MethodForSelecting](https://github.com/DjonnyX/ng-virtual-list/blob/20.x/projects/ng-virtual-list/src/lib/enums/method-for-selecting.ts) | Method for selecting list items. Default value is 'none'. 'select' - List items are selected one by one. 'multi-select' - Multiple selection of list items. 'none' - List items are not selectable. |
| itemConfigMap | [IVirtualListItemConfigMap?](https://github.com/DjonnyX/ng-virtual-list/blob/20.x/projects/ng-virtual-list/src/lib/models/item-config-map.model.ts) | Sets `sticky` position and `selectable` for the list item element. If `sticky` position is greater than `0`, then `sticky` position is applied. If the `sticky` value is greater than `0`, then the `sticky` position mode is enabled for the element. `1` - position start, `2` - position end. Default value is `0`. `selectable` determines whether an element can be selected or not. Default value is `true`. |
| collapseByClick | boolean? = true | If `false`, the element is collapsed using the config.collapse method passed to the template; if `true`, the element is collapsed by clicking on it. The default value is `true`. |
| collectionMode | [CollectionMode? = 'normal'](https://github.com/DjonnyX/ng-virtual-list/blob/20.x/projects/ng-virtual-list/src/lib/enums/collection-mode.ts) | Determines the action modes for collection elements. Default value is `normal`. |
| selectByClick | boolean? = true | If `false`, the element is selected using the config.select method passed to the template; if `true`, the element is selected by clicking on it. The default value is `true`. |
| snap | boolean? = false | Determines whether elements will snap. Default value is "false". |
| snappingMethod | [SnappingMethod? = 'normal'](https://github.com/DjonnyX/ng-virtual-list/blob/20.x/projects/ng-virtual-list/src/lib/enums/snapping-method.ts) | Snapping method. 'normal' - Normal group rendering. 'advanced' - The group is rendered on a transparent background. 'chat' - The group is rendered on a background. List items below the group are not rendered. |
| direction | [Direction? = 'vertical'](https://github.com/DjonnyX/ng-virtual-list/blob/20.x/projects/ng-virtual-list/src/lib/enums/direction.ts) | Determines the direction in which elements are placed. Default value is "vertical". |
| dynamicSize | boolean? = false | If true then the items in the list can have different sizes and the itemSize property is ignored. If false then the items in the list have a fixed size specified by the itemSize property. The default value is false. |
| enabledBufferOptimization | boolean? = true | Experimental! Enables buffer optimization. Can only be used if items in the collection are not added or updated. |
| trackBy | string? = 'id' | The name of the property by which tracking is performed. |
| selectedIds | Array<[Id](https://github.com/DjonnyX/ng-virtual-list/blob/20.x/projects/ng-virtual-list/src/lib/types/id.ts)> \| [Id](https://github.com/DjonnyX/ng-virtual-list/blob/20.x/projects/ng-virtual-list/src/lib/types/id.ts) \| undefined | Sets the selected items. |
| collapsedIds | Array<[Id](https://github.com/DjonnyX/ng-virtual-list/blob/20.x/projects/ng-virtual-list/src/lib/types/id.ts)> | Sets the collapsed items. |
| screenReaderMessage | string? = "Showing items $1 to $2" | Message for screen reader. The message format is: "some text `$1` some text `$2`", where `$1` is the number of the first element of the screen collection, `$2` is the number of the last element of the screen collection. |
| langTextDir | [TextDirection? = 'ltr'](https://github.com/DjonnyX/ng-virtual-list/blob/20.x/projects/ng-virtual-list/src/lib/enums/text-direction.ts) | A string indicating the direction of text for the locale. Can be either "ltr" (left-to-right) or "rtl" (right-to-left). |
| loading | boolean? = false | If `true`, the scrollBar goes into loading state. The default value is `false`. |
| scrollbarTheme | [ScrollBarTheme?](https://github.com/DjonnyX/ng-virtual-list/blob/20.x/projects/ng-virtual-list/src/lib/types/scrollbar-theme.ts) | Scrollbar theme. |
| clickDistance | number? = 40 | The maximum scroll distance at which a click event is triggered. |
| waitForPreparation | boolean? = true | If true, it will wait until the list items are fully prepared before displaying them.. The default value is `true`. |
| scrollStartOffset | number? = 0 | Sets the scroll start offset value; Default value is "0". |
| scrollEndOffset | number? = 0 | Sets the scroll end offset value; Default value is "0". |
| snapScrollToBottom | boolean? = false | Determines whether the scroll will be anchored to the end of the list at startup.. Default value is "false". |
| snapToEndTransitionInstantOffset | number? = 0 | Sets the offset value; if the scroll area value is exceeded, the scroll animation will be disabled. Default value is "0". |
| scrollbarMinSize | number? = 80 | Minimum scrollbar size. |
| scrollbarEnabled | boolean? = true | Determines whether the scrollbar is shown or not. The default value is "true". |
| scrollbarInteractive | boolean? = true | Determines whether scrolling using the scrollbar will be possible. The default value is "true". |
| overscrollEnabled | boolean? = true | Determines whether the overscroll (re-scroll) feature will work. The default value is "true". |
| animationParams | [IAnimationParams](https://github.com/DjonnyX/ng-virtual-list/blob/20.x/projects/ng-virtual-list/src/lib/types/animation-params.ts)? = { scrollToItem: 50, navigateToItem: 150 } | Animation parameters. The default value is "{ scrollToItem: 50, navigateToItem: 150 }". |
| scrollBehavior | ScrollBehavior? = 'smooth' | Defines the scrolling behavior for any element on the page. The default value is "smooth". |

<br/>

Outputs

| Event | Type | Description |
|---|---|---|
| onItemClick | [IRenderVirtualListItem](https://github.com/DjonnyX/ng-virtual-list/blob/20.x/projects/ng-virtual-list/src/lib/models/render-item.model.ts) \| undefined | Fires when an element is clicked. |
| onScroll | ([IScrollEvent](https://github.com/DjonnyX/ng-virtual-list/blob/20.x/projects/ng-virtual-list/src/lib/models/scroll-event.model.ts)) => void | Fires when the list has been scrolled. |
| onScrollEnd | ([IScrollEvent](https://github.com/DjonnyX/ng-virtual-list/blob/20.x/projects/ng-virtual-list/src/lib/models/scroll-event.model.ts)) => void | Fires when the list has completed scrolling. |
| onSelect | Array<[Id](https://github.com/DjonnyX/ng-virtual-list/blob/20.x/projects/ng-virtual-list/src/lib/types/id.ts)> \| [Id](https://github.com/DjonnyX/ng-virtual-list/blob/20.x/projects/ng-virtual-list/src/lib/types/id.ts) \| undefined | Fires when an elements are selected. |
| onCollapse | Array<[Id](https://github.com/DjonnyX/ng-virtual-list/blob/20.x/projects/ng-virtual-list/src/lib/types/id.ts)> \| [Id](https://github.com/DjonnyX/ng-virtual-list/blob/20.x/projects/ng-virtual-list/src/lib/types/id.ts) \| undefined | Fires when elements are collapsed. |
| onViewportChange | [ISize](https://github.com/DjonnyX/ng-virtual-list/blob/20.x/projects/ng-virtual-list/src/lib/types/size.ts) | Fires when the viewport size is changed. |
| onScrollReachStart | void | Fires when the scroll reaches the start. |
| onScrollReachEnd | void | Fires when the scroll reaches the end. |

<br/>

Methods

| Method | Type | Description |
|--|--|--|
| scrollTo | (id: [Id](https://github.com/DjonnyX/ng-virtual-list/blob/20.x/projects/ng-virtual-list/src/lib/types/id.ts), cb?: () => void, options?: [IScrollOptions](https://github.com/DjonnyX/ng-virtual-list/blob/20.x/projects/ng-virtual-list/src/lib/models/scroll-options.model.ts)) | The method scrolls the list to the element with the given `id` and returns the value of the scrolled area. |
| scrollToStart | (cb?: () => void, options?: [IScrollOptions](https://github.com/DjonnyX/ng-virtual-list/blob/20.x/projects/ng-virtual-list/src/lib/models/scroll-options.model.ts)) | Scrolls the scroll area to the first item in the collection. |
| scrollToEndItem | (cb?: () => void, options?: [IScrollOptions](https://github.com/DjonnyX/ng-virtual-list/blob/20.x/projects/ng-virtual-list/src/lib/models/scroll-options.model.ts)) | Scrolls the scroll area to the last item in the collection. |
| scrollToEnd | | Scrolls the list to the end of the content height. |
| getItemBounds | (id: [Id](https://github.com/DjonnyX/ng-virtual-list/blob/20.x/projects/ng-virtual-list/src/lib/types/id.ts), behavior?: ScrollBehavior) => void | Returns the bounds of an element with a given id |
| focus | [Id](https://github.com/DjonnyX/ng-virtual-list/blob/20.x/projects/ng-virtual-list/src/lib/types/id.ts), align: [FocusAlignment](https://github.com/DjonnyX/ng-virtual-list/blob/20.x/projects/ng-virtual-list/src/lib/types/focus-alignment.ts) = [FocusAlignments.NONE](https://github.com/DjonnyX/ng-virtual-list/blob/20.x/projects/ng-virtual-list/src/lib/enums/focus-alignments.ts) | Focus an list item by a given id. |
| cacheClean |  | Force clearing the cache. |
| stopSnappingScrollToEnd |  | Stops the list from snapping to the bottom edge. |

<br/>

### Template API

```html
<ng-template #itemRenderer let-data="data" let-config="config" let-measures="measures">
  <!-- content -->
</ng-template>
```

Properties

| Property | Type | Description |
|--|--|--|
| data | {\[id: [Id](https://github.com/DjonnyX/ng-virtual-list/blob/20.x/projects/ng-virtual-list/src/lib/types/id.ts) \], [otherProps: string]: any;} | Collection item data. |
| config | [IDisplayObjectConfig](https://github.com/DjonnyX/ng-virtual-list/blob/20.x/projects/ng-virtual-list/src/lib/models/display-object-config.model.ts) | Display object configuration. A set of `select`, `collapse`, and `focus` methods are also provided. |
| measures | [IDisplayObjectMeasures](https://github.com/DjonnyX/ng-virtual-list/blob/20.x/projects/ng-virtual-list/src/lib/models/display-object-measures.model.ts) \| undefined | Display object metrics. |

<br/>

## 📦 Previous versions

| Angular version | ng-virtual-list version | git | npm |
|--|--|--|--|
| 19.x | 19.10.0 | [19.x](https://github.com/DjonnyX/ng-virtual-list/tree/19.x) | [19.10.0](https://www.npmjs.com/package/ng-virtual-list/v/19.10.0) |
| 18.x | 18.10.0 | [18.x](https://github.com/DjonnyX/ng-virtual-list/tree/18.x) | [18.10.0](https://www.npmjs.com/package/ng-virtual-list/v/18.10.0) |
| 17.x | 17.10.0 | [17.x](https://github.com/DjonnyX/ng-virtual-list/tree/17.x) | [17.10.0](https://www.npmjs.com/package/ng-virtual-list/v/17.10.0) |
| 16.x | 16.9.6 | [16.x](https://github.com/DjonnyX/ng-virtual-list/tree/16.x) | [16.9.6](https://www.npmjs.com/package/ng-virtual-list/v/16.9.6) |
| 15.x | 15.9.6 | [15.x](https://github.com/DjonnyX/ng-virtual-list/tree/15.x) | [15.9.6](https://www.npmjs.com/package/ng-virtual-list/v/15.9.6) |
| 14.x | 14.9.6 | [14.x](https://github.com/DjonnyX/ng-virtual-list/tree/14.x) | [14.9.6](https://www.npmjs.com/package/ng-virtual-list/v/14.9.6) |

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
