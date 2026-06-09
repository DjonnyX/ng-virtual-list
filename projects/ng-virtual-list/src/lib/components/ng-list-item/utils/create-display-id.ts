/**
 * createDisplayId
 * @link https://github.com/DjonnyX/ng-virtual-list/blob/20.x/projects/ng-virtual-list/src/lib/components/ng-list-item/utils/create-display-id.ts
 * @author Evgenii Alexandrovich Grebennikov
 * @email djonnyx@gmail.com
 */
export const createDisplayId = (listId: number, id: number) => {
    return `${listId}-${id}`;
};
