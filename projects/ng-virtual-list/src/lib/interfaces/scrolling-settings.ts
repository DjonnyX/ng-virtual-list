/**
 * Interface IScrollingSettings.
 * - frictionalForce - Frictional force. Default value is `0.035`.
 * - mass - Mass. Default value is `0.005`.
 * - maxDistance - Maximum scrolling distance. Default value is `12500`.
 * - maxDuration - Maximum animation duration. Default value is `4000`.
 * - speedScale - Speed scale. Default value is `15`.
 * - optimization - Enables scrolling performance optimization. Default value is `true`.
 * @link https://github.com/DjonnyX/ng-virtual-list/blob/19.x/projects/ng-virtual-list/src/lib/interfaces/scrolling-settings.ts
 * @author Evgenii Alexandrovich Grebennikov
 * @email djonnyx@gmail.com
 */
export interface IScrollingSettings {
    /**
     * Frictional force. Default value is `0.035`.
     */
    frictionalForce?: number;
    /**
     * Maximum animation duration. Default value is `4000`.
     */
    maxDuration?: number;
    /**
     * Mass. Default value is `0.005`.
     */
    mass?: number;
    /**
     * Maximum scrolling distance. Default value is `12500`.
     */
    maxDistance?: number;
    /**
     * Speed scale. Default value is `15`.
     */
    speedScale?: number;
    /**
     * Enables scrolling performance optimization. Default value is `true`.
     */
    optimization?: boolean;
}
