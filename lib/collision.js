import { normalize, quadrant, fullArc, degreeToArc } from "./quadrant.js";

export function intersects(a, b) {
  return (
    b.minX <= a.maxX && b.minY <= a.maxY && b.maxX >= a.minX && b.maxY >= a.minY
  );
}

export function crossover(a, b, dir = 1) {
  const rawA = a.angle - a.rotate;
  const rawB = b.angle - b.rotate;
  const sign = dir >= 0 ? 1 : -1;
  const rawDistance = sign * (rawA - rawB);
  return rawDistance < 0
    ? undefined
    : Math.abs(a.rotate - b.rotate) + rawDistance > fullArc;
}

export class ResolveError extends Error {
  constructor(message, index) {
    super(message);
    this.index = index;
  }
}

export class PieCollision {
  static defaultConfig = {
    max: degreeToArc(80), // the max angle in arc
    inc: degreeToArc(1), // the increment of angle in arc
    debug: false,
    measure: false,
    verticalAlign: "auto", // auto, middle
    angleOffset: -Math.PI / 2, // the zero arc of d3.arc is actually -pi/2
  };

  constructor(dimensions, pie, radius, config) {
    this.pie = pie;
    this.radius = radius;
    this.config = Object.assign({ ...PieCollision.defaultConfig }, config);
    this.boxes = dimensions.map((d, i) =>
      this._set({
        i,
        width: d.width,
        height: d.height,
        rotate: 0,
        dir: 0, // direction, 1 for clockwise, -1 for counterclockwise
        mx: 0, // move in x-aixs
        my: 0, // move in y-axis
        dx: 0, // delta in x-axis
        dy: 0, // delta in y-axis
        ax: Math.atan(d.width / this.rx), // angle in x-axis
        ay: Math.atan(d.height / this.ry), // angle in y-axis,
      })
    );

    this._hinc = this.ry * Math.tan(this.config.inc);
    this._vinc = this.rx * Math.tan(this.config.inc);
    this._tree = new (this.config.RBush || window.RBush)();
    this._tree.load(this.boxes);
    this._collided = null;
    this._resolved = null;
  }

  get radius() {
    return this._radius;
  }

  set radius(v) {
    this._radius = v;
    // we don't use the definition of major/minor radius which depends on size
    if (Array.isArray(v)) {
      [this.rx, this.ry = this.rx] = v;
    } else {
      this.rx = this.ry = v;
    }
  }

  get collided() {
    if (this._collided) {
      return this._collided;
    }

    this._collided = this.boxes
      .filter((item) => this._hasCollidedWithOthers(item))
      .map((item) => item.i);
    return this._collided;
  }

  get resolved() {
    if (this._resolved === null) {
      let k = this.collided[1];
      if (!k) {
        k = this.boxes.length;
      } else {
        while (
          k < this.boxes.length &&
          !this._hasCollidedWithBefore(this.boxes[k])
        ) {
          ++k;
        }
      }

      this._resolved = k;
    }
    return this._resolved;
  }

  _angle(i, rotate = 0) {
    const { startAngle, endAngle } = this.pie[i];
    return (startAngle + endAngle) / 2 + rotate;
  }

  _betweenQuadrant12(item, q, angleHat) {
    const { quadrant, ax } = item;
    if (quadrant === 1 && q === 2 && angleHat < (ax + Math.PI) / 2) {
      item.mx = -this._hinc;
      item.my = this._vinc;
    } else if (quadrant === 2 && q === 1 && angleHat > (Math.PI - ax) / 2) {
      item.mx = this._hinc;
      item.my = this._vinc;
    } else {
      return false;
    }
    return true;
  }

  _betweenQuadrant23(item, q, angleHat) {
    const { quadrant, ay } = item;
    if (quadrant === 2 && q === 3 && angleHat < Math.PI + ay / 2) {
      item.mx = -this._hinc;
      item.my = -this._vinc;
    } else if (quadrant === 3 && q === 2 && angleHat > Math.PI - ay / 2) {
      item.mx = -this._hinc;
      item.my = this._vinc;
    } else {
      return false;
    }
    return true;
  }

  _betweenQuadrant34(item, q, angleHat) {
    const { quadrant, ay } = item;
    if (quadrant === 3 && q === 4 && angleHat < (3 * Math.PI + ay) / 2) {
      item.mx = this._hinc;
      item.my = -this._vinc;
    } else if (quadrant === 4 && q === 3 && angleHat > (3 * Math.PI - ay) / 2) {
      item.mx = -this._hinc;
      item.my = -this._vinc;
    } else {
      return false;
    }
    return true;
  }

  _betweenQuadrant41(item, q, angleHat) {
    const { quadrant, ay } = item;
    if (quadrant === 4 && q === 1 && angleHat < ay / 2) {
      item.mx = this._hinc;
      item.my = this._vinc;
    } else if (quadrant === 1 && q === 4 && angleHat > 2 * Math.PI - ay / 2) {
      item.mx = this._hinc;
      item.my = -this._vinc;
    } else {
      return false;
    }
    return true;
  }

  _horizontally(item, angleHat) {
    if (!item.mx) {
      return false;
    }

    const { dir, ax } = item;
    if (
      ((Math.PI - ax) / 2 < angleHat && angleHat < (Math.PI + ax) / 2) ||
      ((Math.PI * 3 - ax) / 2 < angleHat && angleHat < (Math.PI * 3 + ax) / 2)
    ) {
      item.mx += dir < 0 ? this._hinc : -this._hinc;
    } else {
      return false;
    }

    return true;
  }

  _vertically(item, angleHat) {
    if (!item.my) {
      return false;
    }

    const { dir, ay } = item;
    if (
      (Math.PI - ay / 2 < angleHat && angleHat < Math.PI + ay / 2) ||
      (0 < angleHat && angleHat < ay / 2) ||
      (Math.PI * 2 - ay / 2 < angleHat && angleHat < Math.PI * 2)
    ) {
      item.mx += dir < 0 ? this._hinc : -this._hinc;
    } else {
      return false;
    }

    return true;
  }

  _move(item, q, angleHat) {
    const { width, height } = item;

    if (
      !(
        this._betweenQuadrant12(item, q, angleHat) ||
        this._betweenQuadrant23(item, q, angleHat) ||
        this._horizontally(item, angleHat) ||
        this._vertically(item, angleHat) ||
        this._betweenQuadrant34(item, q, angleHat) ||
        this._betweenQuadrant41(item, q, angleHat)
      )
    ) {
      item.mx = item.my = 0;
      item.dx = q === 2 || q === 3 ? -width : 0;
      item.dy =
        this.config.verticalAlign === "middle"
          ? -height / 2
          : q >= 3
          ? -height
          : 0;
    }
  }

  _max(i) {
    if (typeof this.config.max === "number") {
      return this.config.max;
    }
    return this.config.max(i);
  }

  _set(item) {
    const angle = this._angle(item.i, item.rotate);
    const angleHat = normalize(angle + this.config.angleOffset);
    const q = quadrant(angleHat);

    this._move(item, q, angleHat);
    const x = item.mx + item.dx;
    const y = item.my + item.dy;

    const translateX = Math.cos(angleHat) * this.rx;
    const translateY = Math.sin(angleHat) * this.ry;

    // to reflect the translated center point in d3.arc
    item.translateX = translateX;
    item.translateY = translateY;
    item.angle = angle;
    item.quadrant = q;

    // to be used by rbush
    item.minX = translateX + x;
    item.maxX = translateX + x + item.width;
    item.minY = translateY + y;
    item.maxY = translateY + y + item.height;

    if (this.config.measure && !item.metric) {
      item.metric = { search: 0, mutation: 0 };
    }

    return item;
  }

  _rotate(item, inc, margin) {
    const rotate = item.rotate + inc;
    const max = this._max(item.i);
    if (Math.abs(rotate) > max) {
      throw new ResolveError(
        `The item[${
          item.i
        }] will exceed the mutable extent: Math.abs(${item.rotate.toFixed(
          3
        )} + ${inc.toFixed(3)}) > ${max.toFixed(3)}`,
        item.i
      );
    }

    const dry = this._set({ ...item, rotate, dir: inc >= 0 ? 1 : -1 });
    if (margin && (intersects(dry, margin) || crossover(dry, margin, inc))) {
      throw new ResolveError(
        `The item[${item.i}] will touch over the margin item[${margin.i}]`,
        item.i
      );
    }

    this._tree.remove(item, (a, b) => a.i === b.i);
    Object.assign(item, dry);
    if (this.config.measure) {
      item.metric.mutation += 1;
    }
    this._tree.insert(item);

    // clear cache
    this._collided = null;
    this._resolved = null;
  }

  _hasCollidedWithBefore = (item) => {
    if (this.config.measure) {
      item.metric.search += 1;
    }
    return this._tree.search(item).filter((v) => v.i < item.i).length;
  };

  _hasCollidedWithBehind = (item) => {
    if (this.config.measure) {
      item.metric.search += 1;
    }
    return this._tree.search(item).filter((v) => v.i > item.i).length;
  };

  _hasCollidedWithOthers = (item) => {
    if (this.config.measure) {
      item.metric.search += 1;
    }
    return this._tree.search(item).filter((v) => v.i !== item.i).length;
  };

  // return [whether to continue, rotated node]
  _doRotate(k, inc, margin, collidedWith) {
    const curr = this.boxes[k];
    const rotate = curr.rotate;
    let toContinue = k < this.boxes.length - 1;

    try {
      while (collidedWith(curr)) {
        this._rotate(curr, inc, margin);
      }
    } catch (error) {
      if (error instanceof ResolveError) {
        toContinue = false;
        if (this.config.debug) {
          console.debug(error.message);
        }
      } else {
        throw error;
      }
    }

    return [toContinue, rotate !== curr.rotate ? curr : null];
  }

  *resolver() {
    if (!this.collided.length) {
      return;
    }

    let again;
    let inc = -this.config.inc;

    for (let k = this.collided[0]; k < this.boxes.length; ++k) {
      const [toContinue, rotatedNode] = this._doRotate(
        k,
        inc,
        inc < 0 ? this.boxes[k - 1] : this.boxes[0],
        inc < 0 ? this._hasCollidedWithBehind : this._hasCollidedWithBefore
      );

      if (this.config.debug) {
        console.debug(
          `did rotate:
            k=${k}
            inc=${inc}
            toContinue=${toContinue}
            rotated=${rotatedNode?.rotate}
            again=${again}`
        );
      }

      if (rotatedNode) {
        yield rotatedNode;
      }

      if (!toContinue) {
        // go to opposite direction
        inc = -inc;
      } else if (!rotatedNode && again !== k) {
        // try again in opposite direction
        again = k--;
        inc = -inc;
      }
    }
  }

  resolve(all) {
    if (all) {
      const resolver = this.resolver();
      while (!resolver.next().done) {}
      return this;
    }

    const self = this;
    return {
      *[Symbol.iterator]() {
        yield* self.resolver.apply(self);
      },
    };
  }

  point(x, y) {
    const result = this._tree.search({ minX: x, maxX: x, minY: y, maxY: y });
    return result.length ? result : null;
  }
}
