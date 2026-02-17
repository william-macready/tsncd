import * as pt from '../../utilities/Point';
import * as rh from './RenderHandler';

export class TransformHandler {
    private _scale: pt.Point = {x: 1, y: 1};
    private _translate: pt.Point = {x: 0, y: 0};
    private _positioning: pt.Point = {x: 0, y: 0};
    constructor(
        public target: rh.DiagramElement,
    ) {}

    get scale() {
        return this._scale;
    }
    set scale(_scale: pt.Point) {
        this._scale = _scale;
    }

    set positioning(_positioning: Partial<pt.Point>) {
        this._positioning = {...this._positioning, ..._positioning};
        this.target.set_transform();
    }
    get positioning() {
        return this._positioning;
    }
    get offset(){
        return this._translate;
    }
    set offset(_offset: pt.Point) {
        this._translate = {
            x: _offset.x ? _offset.x : this.offset.x,
            y: _offset.y ? _offset.y : this.offset.y,
        };
        this.target.set_transform();
    }
    fromTemplate(template: TransformHandler) {
        this._scale = {...template.scale};
        this._translate = {...template.offset};
    }
    set_transform(): void {}
}