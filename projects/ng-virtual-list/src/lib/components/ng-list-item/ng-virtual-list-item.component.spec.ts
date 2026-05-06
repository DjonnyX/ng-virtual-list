import { ComponentFixture, TestBed } from '@angular/core/testing';
import { NgVirtualListItemComponent } from './ng-virtual-list-item.component';
import { NgVirtualListService } from '../../ng-virtual-list.service';
import { IRenderVirtualListItem } from '../../models/render-item.model';
import { SelectingModesTypes } from '../../enums/selecting-modes-types';

const generateItem = (data?: Partial<IRenderVirtualListItem>): IRenderVirtualListItem => {
  return {
    index: 0,
    id: 1,
    measures: { x: 0, y: 0, width: 100, height: 20, delta: 0 },
    data: { id: 1, name: 'test' } as any,
    config: {
      new: false,
      odd: false,
      even: true,
      collapsable: false,
      sticky: 0,
      selectable: true,
      snap: false,
      snapped: false,
      snappedOut: false,
      isVertical: true,
      dynamic: false,
      isSnappingMethodAdvanced: false,
      tabIndex: 0,
      zIndex: '0',
    },
    ...data,
  } as IRenderVirtualListItem;
};

describe('NgVirtualListItemComponent', () => {
  let component: NgVirtualListItemComponent,
    fixture: ComponentFixture<NgVirtualListItemComponent>,
    service: NgVirtualListService;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [NgVirtualListItemComponent],
    }).compileComponents();

    fixture = TestBed.createComponent(NgVirtualListItemComponent);
    component = fixture.componentInstance;
    service = TestBed.inject(NgVirtualListService);
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('should set item and update element attribute "item-id"', async () => {
    const item = generateItem();
    component.item = item;

    await new Promise(resolve => setTimeout(resolve, 0));

    expect(component.itemId).toBe(item.id);
    const hostEl: HTMLElement = component.element;
    expect(hostEl.getAttribute('item-id')).toBe(String(item.id));
  });

  it('show() / hide() should toggle visibility/display and zIndex correctly for regular=false', async () => {
    const item = generateItem();
    component.item = item;

    await new Promise(resolve => setTimeout(resolve, 0));

    component.hide();
    expect(component.element.style.visibility).toBe('hidden');
    expect(component.element.style.position).toBe('absolute');
    expect(component.element.style.transform).toBe('translate3d(0px, 0px, 0px)');
    expect(component.element.style.zIndex).toBe('-1');

    component.show();
    expect(component.element.style.visibility).toBe('visible');
    expect(component.element.style.zIndex).toBe('0');
  });

  it('show() / hide() should toggle display for regular=true', async () => {
    const item = generateItem();
    component.regular = true;
    component.item = item;

    await new Promise(resolve => setTimeout(resolve, 0));

    component.hide();
    expect(component.element.style.display).toBe('none');
    expect(component.element.style.position).toBe('absolute');
    expect(component.element.style.transform).toBe('translate3d(0px, 0px, 0px)');
    expect(component.element.style.zIndex).toBe('-1');

    component.show();
    expect(component.element.style.display).toBe('block');
    expect(component.element.style.zIndex).toBe('0');
  });

  it('should set focused on focusin and remove on focusout and update part string', async () => {
    const item = generateItem();
    component.item = item;

    await new Promise(resolve => setTimeout(resolve, 0));

    const host: HTMLElement = component.element;

    host.dispatchEvent(new FocusEvent('focusin'));
    await new Promise(resolve => setTimeout(resolve, 0));
    expect(component.focused()).toBeTrue();
    expect(component.part()).toContain('item-focused');

    host.dispatchEvent(new FocusEvent('focusout'));
    await new Promise(resolve => setTimeout(resolve, 0));
    expect(component.focused()).toBeFalse();
    expect(component.part()).not.toContain('item-focused');
  });

  it('pressing space should call service.select and service.collapse when enabled', async () => {
    const item = generateItem();
    component.item = item;

    await new Promise(resolve => setTimeout(resolve, 0));

    spyOn(service, 'select').and.callThrough();
    spyOn(service, 'collapse').and.callThrough();

    const keyEvent = new KeyboardEvent('keydown', { key: ' ' });
    component.element.dispatchEvent(keyEvent);

    await new Promise(resolve => setTimeout(resolve, 0));

    expect(service.select).toHaveBeenCalled();
    expect(service.collapse).toHaveBeenCalled();
  });

  it('should set area-selected attribute when service selected ids contain item id in SELECT mode', async () => {
    const item = generateItem();
    component.item = item;

    await new Promise(resolve => setTimeout(resolve, 0));

    service.selectingMode = SelectingModesTypes.SELECT;
    service.setSelectedIds(item.id);

    await new Promise(resolve => setTimeout(resolve, 0));

    const host = component.element;
    expect(host.getAttribute('area-selected')).toBe('true');

    service.setSelectedIds(999);
    await new Promise(resolve => setTimeout(resolve, 0));
    expect(host.getAttribute('area-selected')).toBe('false');
  });
});