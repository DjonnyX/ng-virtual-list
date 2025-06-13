# NgVirtualList

Angular version 19.X.X.

## Example
![VirtualList-GoogleChrome2025-06-1321-18-21-ezgif com-crop](https://github.com/user-attachments/assets/7a364774-77d1-4ee6-8db0-4338a02d2357)

```bash
npm i ng-virtual-list
```

```html
<ng-virtual-list class="list simple" [items]="items()" [itemRenderer]="itemRenderer"></ng-virtual-list>

<ng-template #itemRenderer let-data="data">
  <div class="list__container">
    <p>{{data?.name}}</p>
  </div>
</ng-template>
```

```ts
const ITEMS: IVirtualListCollection = [];

for (let i = 0, l = 1000; i < l; i++) {
  ITEMS.push({ id: i, name: `Item: ${i}` });
}

@Component({
  selector: 'app-root',
  imports: [NgVirtualListComponent],
  templateUrl: './app.component.html',
  styleUrl: './app.component.scss'
})
export class AppComponent {
  items = signal(ITEMS);
}
```


