import { ScrollEvent } from './scroll-event';

describe('ScrollEvent', () => {
    it('should create', () => {
        const instance = new ScrollEvent({
            direction: 1,
            container: document.createElement('div'),
            list: document.createElement('div'),
            delta: 0,
            scrollDelta: 0,
            isVertical: true,
            scrollSize: 100,
            itemsRange: [0, 1],
            isEnd: false,
        });
        expect(instance).toBeDefined();
    });
});