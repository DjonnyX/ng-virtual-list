import { ArithmeticExpression } from "../types";
import { isPercentageValue } from "./is-persentage-value";
import { parseFloatOrPersentageValue } from "./parse-float-or-persentage-value";

const WHITESPACE = ' ', PLUS = '+', MINUS = '-', OPERATORS = [PLUS, MINUS];

const calculate = (exp: string, reference: number, operator: -1 | 1 = 1) => {
    let result: number = 0;
    const isPercentage = isPercentageValue(exp);
    if (isPercentage) {
        const v = parseFloatOrPersentageValue(exp);
        result += (reference * v) * operator;
    } else {
        result += (Number(exp) ?? 0) * operator;
    }
    return result;
}

export const parseArithmeticExpression = (value: ArithmeticExpression, reference: number): number => {
    if (typeof value === 'number') {
        return value;
    }

    let result: number = 0, operator: 1 | -1 = 1, exp: string = '';
    for (let i = 0, l = value.length; i < l; i++) {
        const char = value[i], isLast = i === l - 1;
        if ((char === WHITESPACE) || isLast) {
            if (isLast) {
                exp = `${exp}${char}`;
            }
            if (exp.length > 0) {
                result += calculate(exp, reference, operator);
            }
            exp = '';
            continue;
        }
        else if (OPERATORS.indexOf(char) > -1) {
            if (exp.length > 0) {
                result += calculate(exp, reference, operator);
            }
            exp = '';
            operator = char === PLUS ? 1 : -1;
            continue;
        } else {
            exp = `${exp}${char}`;
        }
    }
    return result;
}
