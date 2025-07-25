
/**
 * Switch css classes
 * @link https://github.com/DjonnyX/ng-virtual-list/blob/16.x/projects/ng-virtual-list/src/lib/utils/toggleClassName.ts
 * @author Evgenii Grebennikov
 * @email djonnyx@gmail.com
 */
export const toggleClassName = (el: HTMLElement, className: string, removeClassName?: string) => {
    if (!el.classList.contains(className)) {
        el.classList.add(className);
    }
    if (removeClassName) {
        el.classList.remove(removeClassName);
    }
};
