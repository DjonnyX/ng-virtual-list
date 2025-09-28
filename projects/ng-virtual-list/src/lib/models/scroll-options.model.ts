/**
 * Interface IScrollOptions.
 * @link https://github.com/DjonnyX/ng-virtual-list/blob/20.x/projects/ng-virtual-list/src/lib/models/scroll-options.model.ts
 * @author Evgenii Grebennikov
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
}
