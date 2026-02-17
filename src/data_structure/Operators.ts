import * as fd from './Term';
import * as nm from './Numeric';
import * as cat from './Category';

@fd.register_term
export class Elementwise extends cat.Operator {
    constructor(
        readonly name: fd.DynamicName | null = new fd.DynamicName('\\sigma'),
    ) { super(name);}
}

@fd.register_term
export class Identity extends Elementwise {
    constructor(
        readonly name: fd.DynamicName | null = null,
    ) { super(name); }
}

@fd.register_term
export class SoftMax extends cat.Operator {
    constructor(
        readonly name: fd.DynamicName | null = new fd.DynamicName('SoftMax'),
        readonly contracted: boolean = false,
    ) { super(name); }
}

@fd.register_term
export class Einops extends cat.Operator {
    constructor(
        readonly name: fd.DynamicName | null = new fd.DynamicName('einops'),
        readonly signature: fd.int[][] = [],
    ) { super(name); }
}

@fd.register_term
export class Linear extends cat.Operator {
    constructor(
        readonly name: fd.DynamicName | null = new fd.DynamicName('L'),
    ) { super(name); }
}

@fd.register_term
export class Embedding extends cat.Operator {
    constructor(
        readonly name: fd.DynamicName | null = new fd.DynamicName('E'),
    ) { super(name); }
}

@fd.register_term
export class AdditionOp extends cat.Operator {
    constructor(
        readonly name: fd.DynamicName | null = new fd.DynamicName('+'),
    ) { super(name); }
}

@fd.register_term
export class Normalize extends cat.Operator {
    constructor(
        readonly name: fd.DynamicName | null = new fd.DynamicName('RMSNorm'),
    ) { super(name); }
}

@fd.register_term
export class WeightedTriangularLower extends cat.Operator {
    constructor(
        readonly name: fd.DynamicName | null = new fd.DynamicName('wtril'),
    ) { super(name); }
}