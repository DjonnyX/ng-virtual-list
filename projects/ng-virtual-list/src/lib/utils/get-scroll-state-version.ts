import { EMPTY_SCROLL_STATE_VERSION } from "../const";

export const getScrollStateVersion = (totalSize: number, scrollSize: number): string => {
    if (totalSize === -1) {
        return EMPTY_SCROLL_STATE_VERSION;
    }
    let scrollStateUpdateIndex = 0;
    if (totalSize < scrollSize) {
        scrollStateUpdateIndex = scrollStateUpdateIndex === Number.MAX_SAFE_INTEGER ? 0 : scrollStateUpdateIndex + 1;
    }
    return `${scrollStateUpdateIndex}_${totalSize}_${scrollSize}`;
};
