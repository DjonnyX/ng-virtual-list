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
 * @link https://github.com/DjonnyX/ng-virtual-list/blob/17.x/projects/ng-virtual-list/src/lib/utils/debounce.ts
 * @author Evgenii Alexandrovich Grebennikov
 * @email djonnyx@gmail.com
 */
export const debounce = (cb: (...args: Array<any>) => void, debounceTime: number = 0): IDebounce => {
    let timeout: any = null;
    const dispose = () => {
        if (timeout !== null) {
            clearTimeout(timeout);
            timeout = null
        }
    }
    const execute = (...args: Array<any>) => {
        dispose();

        timeout = setTimeout(() => {
            cb(...args);
        }, debounceTime);
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
