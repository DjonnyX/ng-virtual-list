/**
 * Simple debounce function.
 * @link https://github.com/DjonnyX/ng-virtual-list/blob/14.x/projects/ng-virtual-list/src/lib/utils/debounce.ts
 * @author Evgenii Grebennikov
 * @email djonnyx@gmail.com
 */
export const debounce = (cb: (...args: Array<any>) => void, debounceTime: number = 0) => {
    let timeout: any;
    const dispose = () => {
        if (timeout !== undefined) {
            clearTimeout(timeout);
        }
    }
    const execute = (...args: Array<any>) => {
        dispose();

        timeout = setTimeout(() => {
            cb(...args);
        }, debounceTime);
    };
    return {
        /**
         *  Call handling method
         */
        execute,
        /**
         * Method of destroying handlers
         */
        dispose,
    };
};
