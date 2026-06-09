import { SnappingMethods } from "../enums";
import { SnappingMethod } from "../types";

const ADVANCED_PATTERNS: Array<SnappingMethod> = [SnappingMethods.ADVANCED, SnappingMethods.STANDART, 'advanced', 'standart'],
    DEFAULT_PATTERN: Array<SnappingMethod> = [SnappingMethods.STANDART, 'standart'];

export const isSnappingMethodAdvenced = (method: SnappingMethod): boolean => {
    return ADVANCED_PATTERNS.includes(method);
}

export const isSnappingMethodDefault = (method: SnappingMethod): boolean => {
    return DEFAULT_PATTERN.includes(method);
}