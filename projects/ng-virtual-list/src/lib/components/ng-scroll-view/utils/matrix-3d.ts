/**
 * matrix3d
 * @link https://github.com/DjonnyX/ng-virtual-list/blob/21.x/projects/ng-virtual-list/src/lib/components/ng-scroll-view/utils/matrix-3d.ts
 * @author Evgenii Alexandrovich Grebennikov
 * @email djonnyx@gmail.com
 */
export const matrix3d = (x: number, y: number) => {
  return `matrix3d(
          1,      0,      0,      0,
          0,      1,      0,      0,
          0,      0,      1,      0,
          ${x},   ${y},   0,      1
        )`;
};
