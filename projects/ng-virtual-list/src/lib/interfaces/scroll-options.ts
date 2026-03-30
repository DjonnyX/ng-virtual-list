/**
 * Interface IScrollOptions.
 * @link https://github.com/DjonnyX/ng-virtual-list/blob/20.x/projects/ng-virtual-list/src/lib/interfaces/scroll-options.ts
 * @author Evgenii Alexandrovich Grebennikov
 * @email djonnyx@gmail.com
 */
export interface IScrollOptions {
    /**
     * Default value is `0`.
     */
    iteration?: number;
    /**
     * Scroll behavior. Default value is `instant`.
     */
    behavior?: ScrollBehavior | 'auto' | 'instant' | 'smooth';
    /**
     * Specifies whether scrolling will smoothly transition to the previous animation. Default value is false.
     */
    blending?: boolean;
    /**
     * Determines whether the element will have focus after scrolling is complete. Default value is true.
     */
    focused?: boolean;
}
