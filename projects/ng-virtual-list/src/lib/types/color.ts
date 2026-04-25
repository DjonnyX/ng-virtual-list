/**
 * @license Copyright (c) 2026 Evgenii Alexandrovich Grebennikov (djonnyx@gmail.com tg: http://t.me/djonnyx).
 */
export type Color = `#${string}` | `rgb(${number},${number},${number})` | `rgba(${number},${number},${number},${number})`
    | `rgba(#${string},${number})`;
