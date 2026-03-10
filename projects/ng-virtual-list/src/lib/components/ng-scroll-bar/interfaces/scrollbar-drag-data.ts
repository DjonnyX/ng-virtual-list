/**
 * IScrollBarDragEvent
 * @link https://github.com/DjonnyX/ng-virtual-list/blob/21.x/projects/ng-virtual-list/src/lib/components/ng-scroll-bar/interfaces/scrollbar-drag-data.ts
 * @author Evgenii Alexandrovich Grebennikov
 * @email djonnyx@gmail.com
 */
export interface IScrollBarDragEvent {
    position: number;
    min: number;
    max: number;
    userAction: boolean;
    animation: boolean;
}
