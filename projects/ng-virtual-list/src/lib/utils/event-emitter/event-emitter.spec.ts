import { EventEmitter } from "./event-emitter";

class TestedEventEmitter extends EventEmitter {
    getTotalListenersLength() {
        let result = 0;
        for (const eventName in this._listeners) {
            const listeners = this._listeners[eventName] ?? [];
            result += listeners.length;
        }
        return result;
    }

    getListenersLengthByEvent(eventName: string) {
        return this._listeners[eventName]?.length ?? 0;
    }
}

describe('EventEmitter', () => {
    it('The event must be handled', () => {
        let handled = false;
        const emitter = new EventEmitter();
        emitter.addEventListener('event', () => {
            handled = true;
        });
        emitter.dispatch('event');
        expect(handled).toBeTruthy();
    });

    it('The event must pass arguments', () => {
        let isCorrect = false;
        const emitter = new EventEmitter();
        emitter.addEventListener('event', (arg1, arg2, arg3) => {
            if (arg1 === true && arg2 === 1 && Array.isArray(arg3)) {
                isCorrect = true;
            }
        });
        emitter.dispatch('event', true, 1, []);
        expect(isCorrect).toBeTruthy();
    });

    it('There must be a correct order of emission', () => {
        const expected = ['event2', 'event1', 'event3'],
            result: Array<string> = [],
            emitter = new TestedEventEmitter(),
            handler1 = () => {
                result.push('event1');
            },
            handler2 = () => {
                result.push('event2');
            },
            handler3 = () => {
                result.push('event3');
            };

        emitter.addEventListener('event1', handler1);
        emitter.addEventListener('event2', handler2);
        emitter.addEventListener('event3', handler3);
        emitter.dispatch('event2');
        emitter.dispatch('event1');
        emitter.dispatch('event3');
        expect(JSON.stringify(expected) === JSON.stringify(result)).toBeTruthy();
    });

    it('All events with the name "event" must be unsubscribed', () => {
        const emitter = new TestedEventEmitter(), handler1 = () => { }, handler2 = () => { };
        emitter.addEventListener('event', handler1);
        emitter.addEventListener('event', handler2);
        emitter.addEventListener('event1', () => { });
        emitter.removeEventListener('event', handler1);
        expect(emitter.getListenersLengthByEvent('event') === 1 && emitter.getListenersLengthByEvent('event1') === 1).toBeTruthy();
    });

    it('All event listeners must unsubscribed', () => {
        const emitter = new TestedEventEmitter();
        emitter.addEventListener('event', () => { });
        emitter.addEventListener('event', () => { });
        emitter.addEventListener('event1', () => { });
        emitter.addEventListener('event2', () => { });
        emitter.removeAllListeners();
        expect(emitter.getTotalListenersLength()).toBe(0);
    });
});