# NgVirtualList
Fast, optimized rendering of extremely large numbers of list items

Angular version 19.X.X.

## Example
![VirtualList-GoogleChrome2025-06-1323-32-48-ezgif com-video-to-gif-converter](https://github.com/user-attachments/assets/225fabf8-46da-43ec-bef1-41bb295af5d8)


```bash
npm i ng-virtual-list
```

```html
<ng-virtual-list class="list simple" [items]="items()" [itemRenderer]="itemRenderer" [itemHeight]="42"></ng-virtual-list>

<ng-template #itemRenderer let-data="data">
  <div class="list__container">
    <p>{{data?.name}}</p>
  </div>
</ng-template>
```

```ts
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
  items = signal(ITEMS);
}
```


## Development server

To start a local development server, run:

```bash
ng serve
```

Once the server is running, open your browser and navigate to `http://localhost:4200/`. The application will automatically reload whenever you modify any of the source files.
