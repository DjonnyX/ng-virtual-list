/**
 * IAnimationParams
 * Maximum performance for extremely large lists.
 * It is based on algorithms for virtualization of screen objects.
 * @link https://github.com/DjonnyX/ng-virtual-list/blob/20.x/projects/ng-virtual-list/src/lib/interfaces/animation-params.ts
 * @author Evgenii Alexandrovich Grebennikov
 * @email djonnyx@gmail.com
 */
export interface IAnimationParams {
    scrollToItem: number;
    navigateToItem: number;
    navigateByKeyboard: number;
}
