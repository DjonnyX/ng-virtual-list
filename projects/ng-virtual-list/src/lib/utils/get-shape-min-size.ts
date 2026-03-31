import { RoundedCorner } from "../types/rounded-corner";

/**
 * getShapeMinSize
 * @link https://github.com/DjonnyX/ng-virtual-list/blob/14.x/projects/ng-virtual-list/src/lib/utils/get-shape-min-size.ts
 * @author Evgenii Alexandrovich Grebennikov
 * @email djonnyx@gmail.com
 */
export const getShapeMinSize = (roundedRectPath: RoundedCorner | null) => {
    if (!Array.isArray(roundedRectPath)) {
        return 0;
    }
    return Math.max(...roundedRectPath) * 2;
};
