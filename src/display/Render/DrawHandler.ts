import { Point, Rectangle } from "../../utilities/Point";

export interface LineAttrs {
    'stroke': string,
    'stroke-width': string,
    'stroke-dasharray'?: string,
}

export const defaultLineAttrs: LineAttrs = {
    'stroke': 'black',
    'stroke-width': '1px',
}

export interface PolygonAttrs extends LineAttrs {
    fill: string,
}

const defaultPolygonAttrs: PolygonAttrs = {
    ...defaultLineAttrs,
    fill: 'none',
}

export interface AuxAttrs {
    dropShadow: boolean,
}

const defaultAuxAttrs: AuxAttrs = {
    dropShadow: false,
}

export interface CircleAttrs extends PolygonAttrs {
    radius: number,
}

const defaultCircleAttrs: CircleAttrs = {
    ...defaultPolygonAttrs,
    radius: 5,
}

export class DrawLayer<T, R = any> {
    constructor(
        public name: string,
        public zIndex: number = 0,
    ) {}
}

export enum PointsDrawMode {
    'DELTA',
    'ABSOLUTE',
    'RELATIVE'
}

export abstract class DrawHandler<T, R = any> {
    public drawLayers: Record<string, DrawLayer<T, R>> = {
        'main': new DrawLayer<T, R>('main')
    }
    constructor(
    ) {}
    abstract update(): void;
    abstract removeElement(target: R): void;

    get_drawLayer(draw_layer: string | DrawLayer<T, R>): DrawLayer<T, R> {
        if (typeof draw_layer === 'string') {
            if (!(draw_layer in this.drawLayers)) {
                this.drawLayers[draw_layer] = new DrawLayer<T, R>(draw_layer);
            }
            return this.drawLayers[draw_layer];
        }
        if (!(draw_layer.name in this.drawLayers)) {
            this.drawLayers[draw_layer.name] = draw_layer;
        }
        else if (this.drawLayers[draw_layer.name] !== draw_layer) {
            throw new Error(`Draw layer name conflict for layer ${draw_layer.name}`);
        }
        return draw_layer;
    }

    deltaPolygon(
        points: Point[], 
        main_attr?: Partial<PolygonAttrs>, 
        aux_attr?:  Partial<AuxAttrs>,
        draw_layer: string | DrawLayer<T, R> = 'main'
    ): R {
        const attr = {...defaultPolygonAttrs, ...main_attr};
        const aux  = {...defaultAuxAttrs, ...aux_attr};
        const output = this._deltaPolygon(points, attr, aux, draw_layer);
        this._appendDraw([output], draw_layer);
        return output;
    }
    protected abstract _deltaPolygon(
        points: Point[],
        main_attr: PolygonAttrs, 
        aux_attr: AuxAttrs,
        draw_layer: string | DrawLayer<T, R>
    ): R;
    drawRectangle(
        rect: Rectangle, 
        attrs?: Partial<PolygonAttrs>, 
        aux_attr?: Partial<AuxAttrs>,
        draw_layer: string | DrawLayer<T, R> = 'main'
    ): R {
        return this.deltaPolygon(
            [rect.top_left, 
                {x: rect.dims.x, y: 0}, 
                {x:0, y: rect.dims.y},
                {x: -rect.dims.x, y: 0},],
            attrs, aux_attr, draw_layer
        )
    }
    curve<Attr>(
        points: Point[], 
        main_attr?: Partial<LineAttrs>, 
        aux_attr?:  Partial<AuxAttrs>,
        draw_layer: string | DrawLayer<T, R> = 'main'
    ): R {
        const attr = {...defaultLineAttrs, ...main_attr};
        const aux  = {...defaultAuxAttrs, ...aux_attr};
        const output = this._curve(points, attr, aux, draw_layer);
        this._appendDraw([output], draw_layer);
        return output;
    }
    protected abstract _curve(
        points: Point[], 
        attrs: LineAttrs, 
        aux_attr: AuxAttrs, 
        draw_layer: string | DrawLayer<T, R>): R;

    circle(
        point: Point,
        main_attr?: Partial<CircleAttrs>,
        aux_attr?:  Partial<AuxAttrs>,
        draw_layer: string | DrawLayer<T, R> = 'main'
    ) {
        const attr = {...defaultCircleAttrs, ...main_attr};
        const aux  = {...defaultAuxAttrs, ...aux_attr};
        const output = this._circle(point, attr, aux, draw_layer);
        this._appendDraw([output], draw_layer);
        return output;
    }
    protected abstract _circle(
        point: Point, 
        main_attr: PolygonAttrs, 
        aux_attr: AuxAttrs,
        draw_layer: string | DrawLayer<T, R>
    ): R;
    // public abstract latex(): void;

    arcCurve(
        p0: Point,
        p1: Point,
        radius: number,
        largeArcFlag: boolean,
        main_attr?: Partial<PolygonAttrs>,
        aux_attr?:  Partial<AuxAttrs>,
        draw_layer: string | DrawLayer<T, R> = 'main'
    ): R {
        const attr = {...defaultPolygonAttrs, ...main_attr};
        const aux  = {...defaultAuxAttrs, ...aux_attr};
        const output = this._arcCurve(p0, p1, radius, largeArcFlag, attr, aux, draw_layer);
        this._appendDraw([output], draw_layer);
        return output;
    }
    protected abstract _arcCurve(
        p0: Point, 
        p1: Point, 
        radius: number, 
        largeArcFlag: boolean,
        main_attr: PolygonAttrs, 
        aux_attr: AuxAttrs,
        draw_layer: string | DrawLayer<T, R>
    ): R;

    protected abstract _appendDraw(target: R[], draw_layer: string | DrawLayer<T, R>): void;
    // public highlight(target: DiagramElement<T>): R {
    //     const rect = target.renderHandler.getRect(target);
    //     return this.drawRectangle(
    //         rect.top_left, rect.dims,
    //         {fill: 'none', stroke: 'red', 'stroke-width': '2px'}
    //     )
    // }
    polyline(
        points: Point[],
        main_attr?: Partial<LineAttrs>,
        draw_layer: string | DrawLayer<T, R> = 'main',
        mode: PointsDrawMode = PointsDrawMode.ABSOLUTE,
    ): R {
        const attr = {...defaultLineAttrs, ...main_attr};
        const aux = {...defaultAuxAttrs};
        const output = this._polyline(points, attr, draw_layer, mode);
        this._appendDraw([output], draw_layer);
        return output;
    }

    protected abstract _polyline(
        points: Point[],
        main_attr: LineAttrs,
        draw_layer: string | DrawLayer<T, R>,
        mode: PointsDrawMode
    ): R
}