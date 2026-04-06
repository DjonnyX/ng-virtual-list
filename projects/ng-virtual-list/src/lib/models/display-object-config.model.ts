import { IRenderVirtualListItemConfig } from "./render-item-config.model";

/**
 * Display object configuration.
 * @link https://github.com/DjonnyX/ng-virtual-list/blob/15.x/projects/ng-virtual-list/src/lib/models/display-object-config.model.ts
 * @author Evgenii Alexandrovich Grebennikov
 * @email djonnyx@gmail.com
 */
export interface IDisplayObjectConfig extends IRenderVirtualListItemConfig {
  /**
   * Determines whether the element has focused or not.
   */
  focused: boolean;
  /**
   * Determines whether the element is selected or not.
   */
  selected: boolean;
  /**
   * Determines whether the element is collapsed or not.
   */
  collapsed: boolean;
}