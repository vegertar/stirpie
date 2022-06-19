import rbush from "rbush";
import { PieCollision } from "./lib/collision.js";

(PieCollision.defaultConfig as any).RBush = rbush;

type Config = {
  /**
   * The maximum movement angle in arc. Defaults `80deg`.
   */
  max?: number | ((index: number) => number);

  /**
   * The increment of angle in arc at every movement. Defaults `1deg`.
   */
  inc?: number;

  /**
   * By default the resolving orbit will be intersecting at labels's corners,
   * otherwise the middle of labels if `verticalAlign` is `"middle"`. Defaults
   * `"auto"`.
   */
  verticalAlign?: "auto" | "middle";

  /**
   * Used to cancel out the non-standard angle offset, e.g. the zero arc of
   * `d3.arc` is actually `-pi/2`. Defaults `-pi/2`.
   */
  angleOffset?: number;
};

type Box = {
  /**
   * The index of box in `.boxes` property
   */
  i: number;

  /**
   * The width of label.
   */
  width: number;

  /**
   * The height of label.
   */
  height: number;

  /**
   * The angle in arc of the intersection of resolving orbit and the label.
   */
  angle: number;

  /**
   * The X coordinate of point at `angle`;
   */
  translateX: number;

  /**
   * The Y coordinate of point at `angle`;
   */
  translateY: number;

  /**
   * The finally minimum `x` of box rectangle, calculated from
   * `radius * cos(angle + angleOffset) + mx + dx`.
   */
  minX: number;

  /**
   * The finally maximum `x` of box rectangle, calculated from `minX + width`.
   */
  maxX: number;

  /**
   * The finally minimum `y` of box rectangle, calculated from
   * `radius * sin(angle + angleOffset) + my + dy`.
   */
  minY: number;

  /**
   * The finally maximum `y` of box rectangle, calculated from `minY + height`.
   */
  maxY: number;

  /**
   * The horizontal movement of the point at `angle`.
   */
  mx: number;

  /**
   * The vertical movement of the point at `angle`.
   */
  my: number;

  /**
   * The `dx` is used to adjust the box rectangle outside of orbit in X-axis.
   */
  dx: number;

  /**
   * The `dy` is used to adjust the box rectangle outside of orbit in Y-axis.
   */
  dy: number;
};

type Dimensions = Iterable<{ width: number; height: number }>;
type Pie = Iterable<{ startAngle: number; endAngle: number }>;
type Radius = number | [rx: number, ry: number];

export interface Resolver {
  readonly pie: Pie;
  readonly radius: Radius;

  /**
   * `boxes` contains resolved results for every label.
   */
  readonly boxes: Box[];

  /**
   * `collided` is a set collided indices of labels.
   */
  get collided(): number[];

  /**
   * `resolved` is the number of labels that has been resolved.
   */
  get resolved(): number;

  /**
   * Resolving overlapping labels as many as possible. This is a wrapper of
   * looping iterator that created by `resolve()`.
   * @param all True
   */
  resolve(all: true): Resolver;
  /**
   * Create an iterator to resolve every collided label.
   */
  resolve(all?: false): { [Symbol.iterator](): Generator<Box, void, void> };
}

/**
 * Creates a resolver to resolve overlapping labels outside of Pie. The Pie
 * data should be sorted in descending order.
 * @param dimensions The dimensions of array of labels.
 * @param pie If you're using `d3.shape`, simply pass an instance of `d3.pie()`.
 * @param radius The radius of orbit to resolve overlapping, either a circle or an ellipse.
 * @param config The configure of resolving process.
 * @returns The instance of resolver.
 */
export default function (
  dimensions: Dimensions,
  pie: Pie,
  radius: Radius,
  config?: Config
) {
  return new PieCollision(dimensions, pie, radius, config) as Resolver;
}
