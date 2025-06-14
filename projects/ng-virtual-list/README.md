
# NgVirtualList
Fast, optimized rendering of extremely large numbers of list items

Angular version 19.X.X.

## Installation

```bash
npm i ng-virtual-list
```

## Examples

### Simple virtual list

![VirtualList-GoogleChrome2025-06-1420-49-35-ezgif com-video-to-gif-converter](https://github.com/user-attachments/assets/2d120a77-7715-4d6a-ba8d-bb5030d48947)

Template:
```html
<ng-virtual-list class="list simple" [items]="items" [itemRenderer]="itemRenderer" [itemHeight]="40"></ng-virtual-list>

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

### Grouped virtual list

#### Without snapping
![VirtualList-GoogleChrome2025-06-1420-49-35-ezgif com-video-to-gif-converter (1)](https://github.com/user-attachments/assets/eb1e1709-4feb-489a-82fd-7fc0ff1211cb)

Template:
```html
<ng-virtual-list class="list simple" [items]="groupItems" [itemRenderer]="groupItemRenderer"
    [stickyMap]="groupItemsStickyMap" [itemHeight]="40" [snap]="false"></ng-virtual-list>

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

![VirtualList-GoogleChrome2025-06-1420-49-35-ezgif com-video-to-gif-converter (2)](https://github.com/user-attachments/assets/a92e63aa-971d-42ff-a3f8-8811e1731f72)

Template (with snapping):
```html
<ng-virtual-list class="list simple" [items]="groupItems" [itemRenderer]="groupItemRenderer"
    [stickyMap]="groupItemsStickyMap" [itemHeight]="40" [snap]="true"></ng-virtual-list>

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

## API

[NgVirtualListComponent](https://github.com/DjonnyX/ng-virtual-list/blob/main/projects/ng-virtual-list/src/lib/ng-virtual-list.component.ts)

Inputs

| Property | Type | Description |
|---|---|---|
| items | [IVirtualListCollection](https://github.com/DjonnyX/ng-virtual-list/blob/main/projects/ng-virtual-list/src/lib/models/collection.model.ts) | Collection of list items |
| itemHeight | number | Height of a typical list item |
| itemRenderer | TemplateRef | Rendering element template |
| stickyMap | [IVirtualListStickyMap](https://github.com/DjonnyX/ng-virtual-list/blob/main/projects/ng-virtual-list/src/lib/models/sticky-map.model.ts) | Dictionary zIndex by id of the list element. If the value is not set or equal to 0, then a simple element is displayed, if the value is greater than 0, then the sticky position mode is enabled for the element |
| snap | boolean? | Determines whether elements will snap. Default value is "true" |

<br/>

Outputs

| Event | Type | Description |
|---|---|---|
| onScroll | (e: Event) => void | Fires when the list has been scrolled |
| onScrollEnd | (e: Event) => void | Fires when the list has completed scrolling. |