/**
 * Simple debounce function.
 * @homepage https://github.com/DjonnyX/ng-virtual-list/tree/main/projects/ng-virtual-list
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
        execute,
        dispose,
    };
};
