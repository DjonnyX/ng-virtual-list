import { TemplateRef } from "@angular/core";

/**
 * IPrerenderTrackBoxRefreshParams.
 * Maximum performance for extremely large lists.
 * It is based on algorithms for virtualization of screen objects.
 * @link https://github.com/DjonnyX/ng-virtual-list/blob/15.x/projects/ng-virtual-list/src/lib/prerender-container/interfaces/refresh-params.ts
 * @author Evgenii Alexandrovich Grebennikov
 * @email djonnyx@gmail.com
 */
export interface IPrerenderTrackBoxRefreshParams {
    itemRenderer: TemplateRef<any> | undefined;
    dynamic: boolean;
    itemSize: number;
    isVertical: boolean;
    trackBy: string;
}