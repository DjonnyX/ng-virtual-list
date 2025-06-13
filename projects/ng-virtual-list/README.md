
# NgVirtualList
Fast, optimized rendering of extremely large numbers of list items

Angular version 19.X.X.

## Examples

### Simple virtual list
![VirtualList-GoogleChrome2025-06-1323-32-48-ezgif com-video-to-gif-converter](https://github.com/user-attachments/assets/225fabf8-46da-43ec-bef1-41bb295af5d8)


```bash
npm i ng-virtual-list
```

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

```css
.vl-section {
    padding: 20px;
    margin-bottom: 8px;

    &>h1 {
        margin-bottom: 0;
    }
}

.list {
    border-radius: 3px;
    box-shadow: 1px 2px 8px 4px rgba(0, 0, 0, 0.075);
    border: 1px solid rgba(0, 0, 0, 0.1);

    &__container {
        width: 100%;
        padding: 0 12px;
    }

    &__group-container {
        width: 100%;
        padding: 0 12px;
        background-color: rgb(230, 234, 238);
        font-weight: 600;
        font-size: 14px;
        text-transform: uppercase;
        display: flex;
    }

    &.simple {
        height: 500px;
    }
}
```

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
![VirtualList-GoogleChrome2025-06-1401-40-11-ezgif com-crop](https://github.com/user-attachments/assets/b09fef83-83d0-4023-8472-38e20a6dd07f)


```html
<ng-virtual-list class="list simple" [items]="groupItems" [itemRenderer]="groupItemRenderer"
    [stickyMap]="groupItemsStickyMap" [itemHeight]="40"></ng-virtual-list>

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

```css
.vl-section {
    padding: 20px;
    margin-bottom: 8px;

    &>h1 {
        margin-bottom: 0;
    }
}

.list {
    border-radius: 3px;
    box-shadow: 1px 2px 8px 4px rgba(0, 0, 0, 0.075);
    border: 1px solid rgba(0, 0, 0, 0.1);

    &__container {
        width: 100%;
        padding: 0 12px;
    }

    &__group-container {
        width: 100%;
        padding: 0 12px;
        background-color: rgb(230, 234, 238);
        font-weight: 600;
        font-size: 14px;
        text-transform: uppercase;
        display: flex;
    }

    &.simple {
        height: 500px;
    }
}
```

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
