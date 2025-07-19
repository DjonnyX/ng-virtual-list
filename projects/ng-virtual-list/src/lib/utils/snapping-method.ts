import { SnappingMethod, SnappingMethods } from "../enums";

const ADVANCED_PATTERNS: Array<SnappingMethod> = [SnappingMethods.ADVANCED, 'advanced'],
    DEFAULT_PATTERN: Array<SnappingMethod> = [SnappingMethods.NORMAL, 'normal'];

export const isSnappingMethodAdvenced = (method: SnappingMethod): boolean => {
    return ADVANCED_PATTERNS.includes(method);
}

export const isSnappingMethodDefault = (method: SnappingMethod): boolean => {
    return DEFAULT_PATTERN.includes(method);
}