/**
 * IStabilizerOptions.
 * Maximum performance for extremely large lists.
 * It is based on algorithms for virtualization of screen objects.
 * @link https://github.com/DjonnyX/ng-virtual-list/blob/19.x/projects/ng-virtual-list/src/lib/prerender-container/interfaces/render-stabilizer-options.ts
 * @author Evgenii Alexandrovich Grebennikov
 * @email djonnyx@gmail.com
 */
export interface IRenderStabilizerOptions {
    prepareIterations?: number;
    prepareReupdateLength?: number;
}