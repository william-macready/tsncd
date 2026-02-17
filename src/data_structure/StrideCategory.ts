import * as fd from './Term';
import * as pc from './ProductCategory';
import * as nm from './Numeric';
import * as utils from '../utilities/utilities';

export type StrideCategory<A extends Axis> = 
    pc.ProdCategory<A, StrideMorphism<A>>;

export abstract class Axis extends fd.UTerm {
    constructor(
        readonly uid: fd.UID,
        readonly _size: nm.Numeric = new nm.FreeNumeric(),
    ) {
        super(uid);
    }
}

@fd.register_term
export class RawAxis extends Axis {}

@fd.register_term
export class StrideMorphism<A extends Axis> extends pc.Morphism<A> {
    constructor(
        readonly _dom: A[],
        readonly _cod_stride: [A, nm.Numeric[]][],
        readonly name: null | fd.DynamicName = null,
    ) {
        super();
    }
    dom(): pc.ProdObject<A> {
        return new pc.ProdObject<A>(this._dom);
    }
    cod(): pc.ProdObject<A> {
        return new pc.ProdObject<A>(
            this._cod_stride.map(([axis, _]) => axis));
    }
}