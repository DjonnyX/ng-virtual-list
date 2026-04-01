import { FocusAlignment } from "./focus-alignment";

export type FocusItemParams = {
    element: HTMLElement;
    position: number;
    align?: FocusAlignment;
    behavior?: ScrollBehavior
}
