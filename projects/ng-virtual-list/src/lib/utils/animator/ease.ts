/**
 * easeOutQuad
 * @link https://github.com/DjonnyX/ng-virtual-list/blob/18.x/projects/ng-virtual-list/src/lib/utils/animator/ease.ts
 * @author Evgenii Alexandrovich Grebennikov
 * @email djonnyx@gmail.com
 */
export const easeOutQuad = (t: number) => {
    return t * (2 - t);
};

/**
 * easeLinear
 * @link https://github.com/DjonnyX/ng-virtual-list/blob/18.x/projects/ng-virtual-list/src/lib/utils/animator/ease.ts
 * @author Evgenii Alexandrovich Grebennikov
 * @email djonnyx@gmail.com
 */
export const easeLinear = (t: number) => {
    return t + t;
};
