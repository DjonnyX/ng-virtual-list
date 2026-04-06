export interface IDebounce {
    /**
     *  Call handling method
     */
    execute: (...args: Array<any>) => void;
    /**
     * Method of destroying handlers
     */
    dispose: () => void;
    /**
     * Indicates whether the handler has been removed (true) or not (false)
     */
    getIsDisposed: () => boolean;
}

/**
 * Simple debounce function.
 * @link https://github.com/DjonnyX/ng-virtual-list/blob/21.x/projects/ng-virtual-list/src/lib/utils/debounce.ts
 * @author Evgenii Alexandrovich Grebennikov
 * @email djonnyx@gmail.com
 * @param cb - Callback.
 * @param debounceTime - Debounce trigger time. 
 * @param maxSkips - Maximum numbers of skips.
 * @returns 
 */
export const debounce = (cb: (...args: Array<any>) => void, debounceTime: number = 0, maxSkips: number = 0): IDebounce => {
    let timeout: any = null, throws = 0;
    const dispose = () => {
        if (timeout !== null) {
            clearTimeout(timeout);
            timeout = null
        }
    }
    const execute = (...args: Array<any>) => {
        if (maxSkips > 0) {
            if (timeout !== null) {
                throws++;
            } else {
                throws = 0;
            }
        }

        dispose();

        let called = false;
        if (maxSkips > 0) {
            if (throws === maxSkips) {
                throws = 0;
                called = true;
                cb(...args);
            }
        }

        if (!called) {
            timeout = setTimeout(() => {
                cb(...args);
            }, debounceTime);
        }
    };
    const getIsDisposed = () => {
        return timeout === null;
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
        /**
         * Indicates whether the handler has been removed (true) or not (false)
         */
        getIsDisposed,
    };
};
