import * as pt from '../../utilities/Point';

export abstract class Curve {
    abstract y(x: number): pt.Point;
    abstract dy(x: number): number;
    angle(x: number): number {
        const dy = this.dy(x);
        return Math.atan2(dy, 1);
    }
}

export class CubicBezierCurve extends Curve {
    constructor(
        readonly start: pt.Point,
        readonly control0: pt.Point,
        readonly control1: pt.Point,
        readonly end: pt.Point,
    ) {
        super();
    }
    y(x: number): pt.Point {
        const t = (x - this.start.x) / (this.end.x - this.start.x);
        const y = Math.pow(1 - t, 3) * this.start.y
            + 3 * Math.pow(1 - t, 2) * t * this.control0.y
            + 3 * (1 - t) * Math.pow(t, 2) * this.control1.y
            + Math.pow(t, 3) * this.end.y;
        return new pt.Point(x, y);
    }
    dy(x: number): number {
        const t = (x - this.start.x) / (this.end.x - this.start.x);
        const dy = -3 * Math.pow(1 - t, 2) * this.start.y
            + 3 * Math.pow(1 - t, 2) * this.control0.y
            + 6 * (1 - t) * t * this.control1.y
            + 3 * Math.pow(t, 2) * this.end.y;
        return dy;
    }
}

export class StraightLine extends Curve {
    constructor(
        readonly start: pt.Point,
        readonly end: pt.Point,
    ) {
        super();
    }
    y(x: number): pt.Point {
        const t = (x - this.start.x) / (this.end.x - this.start.x);
        const y = (1 - t) * this.start.y + t * this.end.y;
        return new pt.Point(x, y);
    }
    dy(x: number): number {
        return (this.end.y - this.start.y) / (this.end.x - this.start.x);
    }
}

export function flatCurve(
    p0: pt.Point,
    p1: pt.Point,
    controlRatio: number = 0.4,
): Curve {
    if (Math.abs(p1.y - p0.y) < 1) {
        return new StraightLine(p0, p1);
    }
    const controlDistance = Math.abs(p1.x - p0.x) * controlRatio;
    const control0 = new pt.Point(
        p0.x + controlDistance,
        p0.y
    );
    const control1 = new pt.Point(
        p1.x - controlDistance,
        p1.y
    );
    return new CubicBezierCurve(p0, control0, control1, p1);
}