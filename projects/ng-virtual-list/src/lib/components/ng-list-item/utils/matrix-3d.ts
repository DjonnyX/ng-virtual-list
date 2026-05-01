/**
 * matrix3d
 * @link https://github.com/DjonnyX/ng-virtual-list/blob/20.x/projects/ng-virtual-list/src/lib/components/ng-list-item/utils/matrix-3d.ts
 * @author Evgenii Alexandrovich Grebennikov
 * @email djonnyx@gmail.com
 */
export const matrix3d = (x: number, y: number, z: number, scaleX: number, scaleY: number, scaleZ: number, rotationX: number, rotationY: number, rotationZ: number) => {
  return `matrix3d(
          ${scaleX},        0,              ${rotationX},   0,
          0,                ${scaleY},      ${rotationY},   0,
          0,                0,              1,              0,
          ${x},             ${y},           ${z},           ${scaleZ}
        ) rotateZ(${rotationZ}deg)`;
};
