
/**
 * Switch css classes
 * @link https://github.com/DjonnyX/ng-virtual-list/blob/14.x/projects/ng-virtual-list/src/lib/utils/toggleClassName.ts
 * @author Evgenii Grebennikov
 * @email djonnyx@gmail.com
 */
export const toggleClassName = (el: HTMLElement, className: string, remove = false) => {
    if (!el.classList.contains(className)) {
        el.classList.add(className);
    } else if (remove) {
        el.classList.remove(className);
    }
};
