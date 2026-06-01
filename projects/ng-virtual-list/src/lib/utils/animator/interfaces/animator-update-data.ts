/**
 * IAnimatorUpdateData
 * @link https://github.com/DjonnyX/data-channel-router/blob/main/library/src/utils/animator/interfaces/animator-update-data.ts
 * @author Evgenii Alexandrovich Grebennikov
 * @email djonnyx@gmail.com
 */
export interface IAnimatorUpdateData {
    timestamp: number;
    elapsed: number;
    delta: number;
    value: number;
}