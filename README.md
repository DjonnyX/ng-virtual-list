# NgVirtualList

Maximum performance for extremely large lists.<br/>
Animation of elements is supported.

<img width="1033" height="171" alt="logo" src="https://github.com/user-attachments/assets/b559cfde-405a-4361-b71b-6715478d997d" />

Angular version 17.X.X.

[Live Demo](https://ng-virtual-list-chat-demo.eugene-grebennikov.pro/)

[Live Examples](https://ng-virtual-list.eugene-grebennikov.pro/)

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
<ng-virtual-list #dynamicList class="list" [items]="groupDynamicItems" [itemRenderer]="groupItemRenderer" [itemsOffset]="10"
      [stickyMap]="groupDynamicItemsStickyMap" [dynamicSize]="true" [snap]="true"></ng-virtual-list>

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
  GROUP_DYNAMIC_ITEMS_STICKY_MAP: IVirtualListStickyMap = {};

let groupDynamicIndex = 0;
for (let i = 0, l = 100000; i < l; i++) {
  const id = i + 1, type = i === 0 || Math.random() > .895 ? 'group-header' : 'item';
  if (type === 'group-header') {
    groupDynamicIndex++;
  }
  GROUP_DYNAMIC_ITEMS.push({ id, type, name: type === 'group-header' ? `Group ${groupDynamicIndex}` : `${id}. ${generateText()}` });
  GROUP_DYNAMIC_ITEMS_STICKY_MAP[id] = type === 'group-header' ? 1 : 0;
}

@Component({
  selector: 'app-root',
  imports: [FormsModule, NgVirtualListComponent],
  templateUrl: './app.component.html',
  styleUrl: './app.component.scss'
})
export class AppComponent {
  groupDynamicItems = GROUP_DYNAMIC_ITEMS;
  groupDynamicItemsStickyMap = GROUP_DYNAMIC_ITEMS_STICKY_MAP;
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

- Set up the snapped item (Only SnappingMethod.ADVANCED)
```css
.list::part(snapped-item) {
    color: #71718c;
}

- Set up the list item
```css
.list::part(item) {
    background-color: unset; // override default styles
}
```

## API

[NgVirtualListComponent](https://github.com/DjonnyX/ng-virtual-list/blob/17.x/projects/ng-virtual-list/src/lib/ng-virtual-list.component.ts)

Inputs

| Property | Type | Description |
|---|---|---|
| id | number | Readonly. Returns the unique identifier of the component. | 
| items | [IVirtualListCollection](https://github.com/DjonnyX/ng-virtual-list/blob/17.x/projects/ng-virtual-list/src/lib/models/collection.model.ts) | Collection of list items.  The collection of elements must be immutable. |
| itemSize | number? = 24 | If direction = 'vertical', then the height of a typical element. If direction = 'horizontal', then the width of a typical element. Ignored if the dynamicSize property is true. |
| itemsOffset | number? = 2 | Number of elements outside the scope of visibility. Default value is 2. |
| itemRenderer | TemplateRef | Rendering element template. |
| stickyMap | [IVirtualListStickyMap?](https://github.com/DjonnyX/ng-virtual-list/blob/17.x/projects/ng-virtual-list/src/lib/models/sticky-map.model.ts) | Dictionary zIndex by id of the list element. If the value is not set or equal to 0, then a simple element is displayed, if the value is greater than 0, then the sticky position mode is enabled for the element. |
| snap | boolean? = false | Determines whether elements will snap. Default value is "false". |
| snappingMethod | [SnappingMethod? = 'normal'](https://github.com/DjonnyX/ng-virtual-list/blob/17.x/projects/ng-virtual-list/src/lib/enums/snapping-method.ts) | Snapping method. 'normal' - Normal group rendering. 'advanced' - The group is rendered on a transparent background. List items below the group are not rendered. |
| direction | [Direction? = 'vertical'](https://github.com/DjonnyX/ng-virtual-list/blob/17.x/projects/ng-virtual-list/src/lib/enums/direction.ts) | Determines the direction in which elements are placed. Default value is "vertical". |
| dynamicSize | boolean? = false | If true then the items in the list can have different sizes and the itemSize property is ignored. If false then the items in the list have a fixed size specified by the itemSize property. The default value is false. |
| enabledBufferOptimization | boolean? = true | Experimental! Enables buffer optimization. Can only be used if items in the collection are not added or updated. |
| trackBy | string? = 'id' | The name of the property by which tracking is performed. |

<br/>

Outputs

| Event | Type | Description |
|---|---|---|
| onScroll | ([IScrollEvent](https://github.com/DjonnyX/ng-virtual-list/blob/17.x/projects/ng-virtual-list/src/lib/models/scroll-event.model.ts)) => void | Fires when the list has been scrolled. |
| onScrollEnd | ([IScrollEvent](https://github.com/DjonnyX/ng-virtual-list/blob/17.x/projects/ng-virtual-list/src/lib/models/scroll-event.model.ts)) => void | Fires when the list has completed scrolling. |

<br/>

Methods

| Method | Type | Description |
|--|--|--|
| scrollTo | (id: [Id](https://github.com/DjonnyX/ng-virtual-list/blob/17.x/projects/ng-virtual-list/src/lib/types/id.ts), behavior: ScrollBehavior = 'auto') => number | The method scrolls the list to the element with the given id and returns the value of the scrolled area. Behavior accepts the values ​​"auto", "instant" and "smooth". |
| scrollToEnd | (behavior?: ScrollBehavior) => void | Scrolls the scroll area to the desired element with the specified ID. |
| getItemBounds | (id: [Id](https://github.com/DjonnyX/ng-virtual-list/blob/17.x/projects/ng-virtual-list/src/lib/types/id.ts), behavior?: ScrollBehavior) => void | Returns the bounds of an element with a given id |

<br/>

## Development server

To start a local development server, run:

```bash
ng serve
```

Once the server is running, open your browser and navigate to `http://localhost:4200/`. The application will automatically reload whenever you modify any of the source files.

## License

MIT License

Copyright (c) 2025 djonnyx (Evgenii Grebennikov)

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