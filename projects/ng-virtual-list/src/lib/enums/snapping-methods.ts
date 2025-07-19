/**
 * Snapping method.
 * @link https://github.com/DjonnyX/ng-virtual-list/blob/18.x/projects/ng-virtual-list/src/lib/enums/snapping-method.ts
 * @author Evgenii Grebennikov
 * @email djonnyx@gmail.com
 */
export enum SnappingMethods {
    /**
     * Normal group rendering.
     */
    NORMAL = 'normal',
    /**
     * The group is rendered on a transparent background. List items below the group are not rendered.
     */
    ADVANCED = 'advanced',
}