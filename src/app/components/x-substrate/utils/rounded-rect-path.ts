export const roundedRectPath = (width: number, height: number, tl: number, tr: number, br: number, bl: number) => {
    const top = width - tl - tr;
    const right = height - tr - br;
    const bottom = width - br - bl;
    const left = height - bl - tl;
    const d = `
          M${tl},0
          h${top}
          a${tr},${tr} 0 0 1 ${tr},${tr}
          v${right}
          a${br},${br} 0 0 1 -${br},${br}
          h-${bottom}
          a${bl},${bl} 0 0 1 -${bl},-${bl}
          v-${left}
          a${tl},${tl} 0 0 1 ${tl},-${tl}
          z
      `;
    return d;
};
