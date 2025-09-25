import { IRenderVirtualListItemConfig } from "./render-item-config.model";

/**
 * Display object configuration. A set of `select`, `collapse`, and `focus` methods are also provided.
 * @link https://github.com/DjonnyX/ng-virtual-list/blob/14.x/projects/ng-virtual-list/src/lib/models/display-object-config.model.ts
 * @author Evgenii Grebennikov
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
  /**
    * Focus a list item
    */
  focus: () => void;
  /**
    * Selects a list item
    * @param selected - If the value is undefined, then the toggle method is executed, if false or true, then the selection/deselection is performed.
    */
  select: (selected: boolean | undefined) => void;
  /**
    * Collapse list items
    * @param collapsed - If the value is undefined, then the toggle method is executed, if false or true, then the collapse/expand is performed.
    */
  collapse: (collapsed: boolean | undefined) => void;
}