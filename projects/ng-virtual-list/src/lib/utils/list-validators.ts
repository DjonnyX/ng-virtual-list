import { MAX_SCROLL_TO_ITERATIONS } from "../const";
import { FocusAlignment, Id } from "../types";
import { validateFloat, validateInt, validateString } from "./validation";

export const validateScrollIteration = (value: number) => {
    const result = Number.isNaN(value) || (value < 0) ? 0 : value > MAX_SCROLL_TO_ITERATIONS ? MAX_SCROLL_TO_ITERATIONS : value;
    return result;
},
    validateId = (id: Id) => {
        const valid = validateString(id as string) || validateFloat(id as number);
        if (!valid) {
            throw Error('The "id" parameter must be of type `Id`.');
        }
    },
    validateScrollBehavior = (behavior: ScrollBehavior) => {
        const valid = validateString(behavior as string) && (behavior === 'auto' || behavior === 'instant' || behavior === 'smooth');
        if (!valid) {
            throw Error('The "behavior" parameter must have the value `auto`, `instant` or `smooth`.');
        }
    },
    validateIteration = (iteration: number | undefined) => {
        const valid = validateInt(iteration, true);
        if (!valid) {
            throw Error('The "iteration" parameter must be of type `number`.');
        }
    },
    validateFocusAlignment = (align: FocusAlignment) => {
        const valid = validateString(align as string) && (align === 'none' || align === 'start' || align === 'center' || align === 'end');
        if (!valid) {
            throw Error('The "align" parameter must have the value `none`, `start`, `center` or `end`.');
        }
    };