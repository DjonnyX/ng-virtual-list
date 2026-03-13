export const easeOutQuad = (t: number) => {
    return t * (2 - t);
};

export const easeLinear = (t: number) => {
    return t + t;
};
