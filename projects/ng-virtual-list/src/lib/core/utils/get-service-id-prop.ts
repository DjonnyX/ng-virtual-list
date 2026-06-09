/**
 * getServiceIdProp
 * @link https://github.com/DjonnyX/ng-virtual-list/blob/17.x/projects/ng-virtual-list/src/lib/core/utils/get-service-id-prop.ts
 * @author Evgenii Alexandrovich Grebennikov
 * @email djonnyx@gmail.com
 */
export const getServiceIdProp = (trackBy: string) => {
    return `__service-id-${trackBy}__`;
};
