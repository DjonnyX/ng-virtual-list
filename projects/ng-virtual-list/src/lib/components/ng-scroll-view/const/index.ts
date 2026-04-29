import { InjectionToken } from "@angular/core";
import { SCROLLER_SCROLL } from "../../../const";

export const SCROLL_VIEW_INVERSION = new InjectionToken<boolean>('ScrollViewInversion');

export const SCROLL_VIEW_OVERSCROLL_ENABLED = new InjectionToken<boolean>('ScrollViewOverscrollEnabled');

export const SCROLL_VIEW_NORMALIZE_VALUE_FROM_ZERO = new InjectionToken<boolean>('ScrollViewNormalizeValueFromZero');

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

export const MAX_ITERATIONS_FOR_AVERAGE_CALCULATIONS = 5,
    INSTANT_VELOCITY_SCALE = 1000,
    MEASURE_VELOCITY_TIMER = 20;

export const SCROLL_EVENT = new Event(SCROLLER_SCROLL);
