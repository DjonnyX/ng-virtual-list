import { IRect } from "../types";

/**
 * Display object metrics.
 * @link https://github.com/DjonnyX/ng-virtual-list/blob/19.x/projects/ng-virtual-list/src/lib/models/display-object-measures.model.ts
 * @author Evgenii Alexandrovich Grebennikov
 * @email djonnyx@gmail.com
 */
export interface IDisplayObjectMeasures extends IRect {
  /**
   * List position
   */
  positionOffset: number;
  /**
   * Item position
   */
  position: number;
  /**
   * Scroll size
   */
  scrollSize: number;
  /**
   * Item size
   */
  size: number;
  /**
   * Bounds size
   */
  boundsSize: number;
  /**
   * Start position in viewport
   */
  absoluteStartPosition: number;
  /**
   * Start position in viewport (percent)
   */
  absoluteStartPositionPercent: number;
  /**
   * End position in viewport
   */
  absoluteEndPosition: number;
  /**
   * End position in viewport (percent)
   */
  absoluteEndPositionPercent: number;
  /**
   * Delta is calculated for Snapping Method.ADVANCED
   */
  delta: number;
}