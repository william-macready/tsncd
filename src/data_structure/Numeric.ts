import * as fd from './Term';

export abstract class Numeric extends fd.Term {
    abstract to_latex(): string;
}

@fd.register_term
export class FreeNumeric extends Numeric {
    constructor(
        readonly uid: fd.UID<FreeNumeric> = fd.UID.template<FreeNumeric>('FreeNumeric'),
    ) {
        super();
    };
    to_latex(): string {
        return this.uid._name?.to_latex() || '';
    }
}

@fd.register_term
export class Integer extends Numeric {
    constructor(
        readonly _value: fd.int = 0,
    ) { super(); }
    to_latex(): string {
        return this._value.toString();
    }
}

// TODO: Rest of the numerics.