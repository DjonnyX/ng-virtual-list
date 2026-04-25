import { FloatOrPersentageValue } from "./float-or-persentage-value";

type Operator = '+' | '-';

/**
 * ArithmeticExpression
 * @link https://github.com/DjonnyX/ng-virtual-list/blob/20.x/projects/ng-virtual-list/src/lib/types/arithmetic-expression.ts
 * @author Evgenii Alexandrovich Grebennikov
 * @email djonnyx@gmail.com
 */
export type ArithmeticExpression = FloatOrPersentageValue | `${FloatOrPersentageValue}${Operator}${FloatOrPersentageValue}` | `${FloatOrPersentageValue} ${Operator} ${FloatOrPersentageValue}`;
