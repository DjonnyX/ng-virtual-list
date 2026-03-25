import { Id } from "../types";

export interface IScrollParams {
    id: Id;
    behavior?: ScrollBehavior;
    blending?: boolean;
    iteration?: number;
    isLastIteration?: boolean;
    scrollCalled?: boolean;
    cb?: () => void;
}
