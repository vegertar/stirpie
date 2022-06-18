import * as d3 from "d3";
import RBush from "rbush";
import { PieCollision, crossover } from "../../lib/collision";

describe("crossover", () => {
  test("no motion", () => {
    expect(
      crossover({ angle: Math.PI / 4, rotate: 0 }, { angle: 0, rotate: 0 })
    ).toBe(false);
    expect(
      crossover(
        { angle: Math.PI / 4, rotate: 0 },
        { angle: -Math.PI / 4, rotate: 0 }
      )
    ).toBe(false);
    expect(
      crossover(
        { angle: Math.PI / 2, rotate: 0 },
        { angle: -Math.PI / 4, rotate: 0 }
      )
    ).toBe(false);
    expect(
      crossover(
        { angle: -Math.PI / 2, rotate: 0 },
        { angle: -Math.PI / 4, rotate: 0 }
      )
    ).toBeUndefined();
    expect(
      crossover(
        { angle: -Math.PI / 2, rotate: 0 },
        { angle: -Math.PI / 4, rotate: 0 },
        -1
      )
    ).toBe(false);
  });

  test("motion in clockwise", () => {
    expect(
      crossover(
        { angle: Math.PI * 2, rotate: Math.PI * 2 },
        { angle: -Math.PI / 4, rotate: 0 }
      )
    ).toBe(true);
    expect(
      crossover(
        { angle: Math.PI * 2, rotate: Math.PI * 2 },
        { angle: Math.PI / 4, rotate: Math.PI * 2 }
      )
    ).toBe(false);
  });

  test("motion in counterclockwise", () => {
    expect(
      crossover(
        { angle: 0, rotate: -Math.PI / 2 },
        { angle: Math.PI / 4, rotate: 0 },
        -1
      )
    ).toBeUndefined();
    expect(
      crossover(
        { angle: -0.7 * Math.PI, rotate: -1.9 * Math.PI },
        { angle: 1.5 * Math.PI, rotate: 0 },
        -1
      )
    ).toBe(true);
    expect(
      crossover(
        { angle: 0, rotate: -1.25 * Math.PI },
        { angle: 1.5 * Math.PI, rotate: 0 },
        -1
      )
    ).toBe(false);
  });
});

test("resolve overlapping rectangles along an orbit", async () => {
  const minWidth = 50;
  const maxWidth = 200;
  const minHeight = 12;
  const maxHeight = 48;
  const rectangles = [...Array(30)].map(() => {
    const width = parseInt(minWidth + (maxWidth - minWidth) * Math.random());
    const height = parseInt(
      minHeight + (maxHeight - minHeight) * Math.random()
    );
    return { width, height };
  });
  const data = rectangles.map((d) => d.width * d.height).sort((a, b) => b - a);
  const pie = d3
    .pie()
    .startAngle(-0.5 * Math.PI)
    .endAngle(1.5 * Math.PI)(data);

  for (const radius of [128, 150, [150, 170], 180]) {
    const resolver = new PieCollision(rectangles, pie, radius, { RBush });
    const resolved = resolver.resolved;
    resolver.resolve(true);
    expect(resolver.resolved).toBeGreaterThan(resolved);
  }
});
