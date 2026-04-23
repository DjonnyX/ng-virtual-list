export const NGVL_INDEX = 'ngvl-index',
    /**
     * getListElementByIndex
     * @link https://github.com/DjonnyX/ng-virtual-list/blob/20.x/projects/ng-virtual-list/src/lib/components/ng-list-item/utils/get-element-by-index.ts
     * @author Evgenii Alexandrovich Grebennikov
     * @email djonnyx@gmail.com
     */
    getListElementByIndex = (index: number) => {
        return `[${NGVL_INDEX}="${index}"]`;
    },
    /**
     * getListElements
     * @link https://github.com/DjonnyX/ng-virtual-list/blob/20.x/projects/ng-virtual-list/src/lib/components/ng-list-item/utils/get-element-by-index.ts
     * @author Evgenii Alexandrovich Grebennikov
     * @email djonnyx@gmail.com
     */
    getListElements = () => {
        return `[${NGVL_INDEX}]`;
    };
