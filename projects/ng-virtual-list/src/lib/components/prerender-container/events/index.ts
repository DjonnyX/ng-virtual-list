import { PrerenderCache } from "../types";

export enum PrerenderTrackBoxEvents {
    RESIZE = 'resize',
};

export type PrerenderTrackBoxResizeHandler = (cache: PrerenderCache) => void;

export type PrerenderTrackBoxHandlers = PrerenderTrackBoxResizeHandler;
