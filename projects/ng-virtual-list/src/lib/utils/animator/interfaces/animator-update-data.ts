/**
 * IAnimatorUpdateData
 * @link https://github.com/DjonnyX/ng-virtual-list/blob/main/library/src/utils/animator/interfaces/animator-update-data.ts
 * @author Evgenii Alexandrovich Grebennikov
 * @email djonnyx@gmail.com
 */
export interface IAnimatorUpdateData {
    id: number;
    timestamp: number;
    elapsed: number;
    delta: number;
    value: number;
}