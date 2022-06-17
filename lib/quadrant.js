export const fullArc = 2 * Math.PI;

export function degreeToArc(x) {
  return (x / 360) * fullArc;
}

export function quadrant(arc) {
  const n = normalize(arc) / fullArc;
  return n < 0.25 ? 1 : n < 0.5 ? 2 : n < 0.75 ? 3 : 4;
}

export function normalize(arc) {
  return arc < 0
    ? normalize(arc + fullArc)
    : arc < fullArc
    ? arc
    : normalize(arc - fullArc);
}

export function getAngle(x, y) {
  let angle = x ? Math.atan(y / x) : Math.PI / 2;
  if (x < 0) {
    angle += Math.PI;
  } else if (y < 0) {
    angle = x == 0 ? Math.PI * 1.5 : Math.PI * 2 + angle;
  }
  return angle;
}
