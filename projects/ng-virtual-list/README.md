# NgVirtualList
Fast, optimized rendering of extremely large numbers of list items

Angular version 19.X.X.

[Demo](https://ng-virtual-list.eugene-grebennikov.pro/)

## Installation

```bash
npm i ng-virtual-list
```

## Examples

### Horizontal virtual list

![preview](https://github.com/user-attachments/assets/5a16d4b3-5e66-4d53-ae90-d0eab0b246a1)

Template:
```html
<ng-virtual-list class="list" direction="hotizontal" [items]="horizontalItems" [itemsOffset]="50"
    [itemRenderer]="hotizontalItemRenderer" [itemSize]="64"></ng-virtual-list>

<ng-template #hotizontalItemRenderer let-data="data">
  @if (data) {
  <div class="list__h-container" (click)="onItemClick(data)">
    <span>{{data.name}}</span>
  </div>
  }
</ng-template>
```

Component:
```ts
import { NgVirtualListComponent, IVirtualListCollection } from 'ng-virtual-list';

const HORIZONTAL_ITEMS: IVirtualListCollection = [];
for (let i = 0, l = 1000000; i < l; i++) {
  HORIZONTAL_ITEMS.push({ id: i + 1, name: `${i}` });
}

@Component({
  selector: 'app-root',
  imports: [NgVirtualListComponent],
  templateUrl: './app.component.html',
  styleUrl: './app.component.scss'
})
export class AppComponent {
  horizontalItems = HORIZONTAL_ITEMS;
}
```

### Horizontal grouped virtual list

![preview](https://github.com/user-attachments/assets/99584660-dc0b-4cd0-9439-9b051163c077)

Template:
```html
<ng-virtual-list class="list" direction="hotizontal" [items]="horizontalGroupItems" [itemRenderer]="horizontalGroupItemRenderer"
    [itemsOffset]="50" [stickyMap]="horizontalGroupItemsStickyMap" [itemSize]="54" [snap]="true"></ng-virtual-list>

<ng-template #horizontalGroupItemRenderer let-data="data">
  @if (data) {
    @switch (data.type) {
      @case ("group-header") {
      <div class="list__h-group-container">
        <span>{{data.name}}</span>
      </div>
      }
      @default {
      <div class="list__h-container" (click)="onItemClick(data)">
        <span>{{data.name}}</span>
      </div>
      }
    }
  }
</ng-template>
```

Component:
```ts
import { NgVirtualListComponent, IVirtualListCollection, IVirtualListStickyMap } from 'ng-virtual-list';

const GROUP_NAMES = ['A', 'B', 'C', 'D', 'E'];

const getGroupName = () => {
  return GROUP_NAMES[Math.floor(Math.random() * GROUP_NAMES.length)];
};

const HORIZONTAL_GROUP_ITEMS: IVirtualListCollection = [],
  HORIZONTAL_GROUP_ITEMS_STICKY_MAP: IVirtualListStickyMap = {};

for (let i = 0, l = 1000000; i < l; i++) {
  const id = i + 1, type = Math.random() > .895 ? 'group-header' : 'item';
  HORIZONTAL_GROUP_ITEMS.push({ id, type, name: type === 'group-header' ? getGroupName() : `${i}` });
  HORIZONTAL_GROUP_ITEMS_STICKY_MAP[id] = type === 'group-header' ? 1 : 0;
}

@Component({
  selector: 'app-root',
  imports: [NgVirtualListComponent],
  templateUrl: './app.component.html',
  styleUrl: './app.component.scss'
})
export class AppComponent {
  horizontalGroupItems = HORIZONTAL_GROUP_ITEMS;
  horizontalGroupItemsStickyMap = HORIZONTAL_GROUP_ITEMS_STICKY_MAP;
}
```

### Vertical virtual list

![preview](https://github.com/user-attachments/assets/ca00eec9-fa9e-4e8d-8899-23343e4bd8a5)

Template:
```html
<ng-virtual-list class="list simple" [items]="items" [itemsOffset]="50" [itemRenderer]="itemRenderer"
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
<ng-virtual-list class="list simple" [items]="groupItems" [itemsOffset]="50" [itemRenderer]="groupItemRenderer"
    [stickyMap]="groupItemsStickyMap" [itemSize]="40" [snap]="false"></ng-virtual-list>

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
<ng-virtual-list class="list simple" [items]="groupItems" [itemsOffset]="50" [itemRenderer]="groupItemRenderer"
    [stickyMap]="groupItemsStickyMap" [itemSize]="40" [snap]="true"></ng-virtual-list>

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
import { NgVirtualListComponent, IVirtualListCollection, IVirtualListStickyMap } from 'ng-virtual-list';

const GROUP_ITEMS: IVirtualListCollection = [],
  GROUP_ITEMS_STICKY_MAP: IVirtualListStickyMap = {};

let groupIndex = 0;
for (let i = 0, l = 10000000; i < l; i++) {
  const id = i, type = Math.random() > .895 ? 'group-header' : 'item';
  if (type === 'group-header') {
    groupIndex++;
  }
  GROUP_ITEMS.push({ id, type, name: type === 'group-header' ? `Group ${groupIndex}` : `Item: ${i}` });
  GROUP_ITEMS_STICKY_MAP[id] = type === 'group-header' ? 1 : 0;
}

@Component({
  selector: 'app-root',
  imports: [NgVirtualListComponent],
  templateUrl: './app.component.html',
  styleUrl: './app.component.scss'
})
export class AppComponent {
  groupItems = GROUP_ITEMS;
  groupItemsStickyMap = GROUP_ITEMS_STICKY_MAP;
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

<ng-virtual-list #virtualList class="list" [items]="items" [itemRenderer]="itemRenderer" [itemsOffset]="50"
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
import { Component, viewChild } from '@angular/core';
import { NgVirtualListComponent } from '../../projects/ng-virtual-list/src/public-api';
import { IVirtualListCollection } from '../../projects/ng-virtual-list/src/lib/models';
import { FormsModule } from '@angular/forms';
import { Id } from '../../projects/ng-virtual-list/src/lib/types';

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

## Stylization

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

- Set up the list item
```css
.list::part(item) {
    background-color: unset; // override default styles
}
```

## API

[NgVirtualListComponent](https://github.com/DjonnyX/ng-virtual-list/blob/main/projects/ng-virtual-list/src/lib/ng-virtual-list.component.ts)

Inputs

| Property | Type | Description |
|---|---|---|
| id | number | Readonly. Returns the unique identifier of the component. | 
| items | [IVirtualListCollection](https://github.com/DjonnyX/ng-virtual-list/blob/main/projects/ng-virtual-list/src/lib/models/collection.model.ts) | Collection of list items. |
| itemSize | number | If direction = 'vertical', then the height of a typical element. If direction = 'horizontal', then the width of a typical element. |
| itemsOffset | number? | Number of elements outside the scope of visibility. Default value is 2. |
| itemRenderer | TemplateRef | Rendering element template. |
| stickyMap | [IVirtualListStickyMap?](https://github.com/DjonnyX/ng-virtual-list/blob/main/projects/ng-virtual-list/src/lib/models/sticky-map.model.ts) | Dictionary zIndex by id of the list element. If the value is not set or equal to 0, then a simple element is displayed, if the value is greater than 0, then the sticky position mode is enabled for the element. |
| snap | boolean? | Determines whether elements will snap. Default value is "false". |
| snapToItem | boolean? | Determines whether scroll positions will be snapped to the element. Default value is "false". |
| direction | [Direction](https://github.com/DjonnyX/ng-virtual-list/blob/main/projects/ng-virtual-list/src/lib/enums/direction.ts) | Determines the direction in which elements are placed. Default value is "vertical". |

<br/>

Outputs

| Event | Type | Description |
|---|---|---|
| onScroll | (e: Event) => void | Fires when the list has been scrolled. |
| onScrollEnd | (e: Event) => void | Fires when the list has completed scrolling. |

<br/>

Methods

| Method | Type | Description |
|--|--|--|
| scrollTo | (id: [Id](https://github.com/DjonnyX/ng-virtual-list/blob/main/projects/ng-virtual-list/src/lib/types/id.ts), behavior: ScrollBehavior = 'auto') => number | The method scrolls the list to the element with the given id and returns the value of the scrolled area. Behavior accepts the values ​​"auto", "instant" and "smooth". |