import { debounce } from './debounce';

describe('debounce', () => {
    it('The `debounce` procedure must be handled', async () => {
        const handled = await (new Promise((res, rej) => {
            const cb = () => {
                res(true);
            }, debounced = debounce(cb, 100);
            debounced.execute();
            setTimeout(() => {
                rej();
            }, 500);
        }));
        expect(handled).toBeTruthy();
    });

    it('The `debounce` procedure must pass arguments', async () => {
        const ARG1 = 1, ARG2 = true, ARG3 = 'done', EXPECTED = `${ARG1}-${ARG2}-${ARG3}`, result = await (new Promise((res, rej) => {
            const cb = (arg1: number, arg2: boolean, arg3: string) => {
                res(`${arg1}-${arg2}-${arg3}`);
            }, debounced = debounce(cb, 100);
            debounced.execute(ARG1, ARG2, ARG3);
            setTimeout(() => {
                rej();
            }, 500);
        }));
        expect(result).toEqual(EXPECTED);
    });

    it('The `debounce` procedure should be disposed', async () => {
        const result = await (new Promise<boolean>((res) => {
            const cb = () => {
                res(true);
            }, debounced = debounce(cb, 1000);
            debounced.execute();
            setTimeout(() => {
                res(false);
            }, 500);

            debounced.dispose();
        }));
        expect(result).toBeFalsy();
    });
});