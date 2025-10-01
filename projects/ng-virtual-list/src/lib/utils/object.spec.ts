import { objectAsReadonly, copyValueAsReadonly } from './object';

describe('objectAsReadonly', () => {
    it('The object must be read-only', async () => {
        const obj = { prop1: true, prop2: 1, prop3: 'done' },
            objReadonly = objectAsReadonly(obj);
        let accepted = true;
        try {
            objReadonly.prop1 = false;
            objReadonly.prop2 = 2;
            objReadonly.prop3 = 'changed';
        } catch (err) {
            accepted = false;
        }
        expect(accepted).toBeFalsy();
    });
});

describe('copyValueAsReadonly', () => {
    it('The object being copied must be read-only', async () => {
        const obj = { prop1: true, prop2: 1, prop3: 'done' },
            objReadonly = copyValueAsReadonly(obj);
        let accepted = true;
        try {
            objReadonly.prop1 = false;
            objReadonly.prop2 = 2;
            objReadonly.prop3 = 'changed';
        } catch (err) {
            accepted = false;
        }
        expect(accepted).toBeFalsy();
    });
    
    it('The array must be read-only', async () => {
        const arr = [1, 2, 3],
            arrReadonly = copyValueAsReadonly(arr);
        let valueChangeAccepted = true;
        try {
            arrReadonly[0] = 2;
        } catch (err) {
            valueChangeAccepted = false;
        }
        let shiftAccepted = true;
        try {
            arrReadonly.shift();
        } catch (err) {
            shiftAccepted = false;
        }
        expect(Number(valueChangeAccepted) + Number(shiftAccepted)).toEqual(0);
    });
});