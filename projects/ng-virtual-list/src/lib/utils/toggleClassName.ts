export const toggleClassName = (el: HTMLElement, className: string, remove = false) => {
    if (!el.classList.contains(className)) {
        el.classList.add(className);
    } else if (remove) {
        el.classList.remove(className);
    }
};
