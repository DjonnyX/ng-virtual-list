import { InjectionToken } from "@angular/core";
import { SCROLLER_SCROLL } from "../../../const";

export const SCROLL_VIEW_INVERSION = new InjectionToken<boolean>('ScrollViewInversion');

export const SCROLL_VIEW_USE_SCROLL_LIMITS_AS_DEFAULT = new InjectionToken<boolean>('ScrollViewUseScrollLimitsAsDefault');

export const TOP = 'top',
    LEFT = 'left',
    INSTANT = 'instant',
    AUTO = 'auto',
    SMOOTH = 'smooth',
    DURATION = 2000,
    FRICTION_FORCE = .035,
    MAX_DURATION = 4000,
    ANIMATION_DURATION = 50,
    MASS = .005,
    MAX_DIST = 12500,
    MAX_VELOCITY_TIMESTAMP = 100,
    SPEED_SCALE = 15,
    OVERSCROLL_START_ITERATION = 2;

export const SCROLL_EVENT = new Event(SCROLLER_SCROLL);
