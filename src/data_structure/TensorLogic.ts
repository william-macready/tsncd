import * as fd from './Term';
import * as nm from './Numeric';
import * as sc from './StrideCategory';
import * as cat from './Category';

// Minimal stubs for RHS expression tree types — registered so that
// to_term() can deserialize Broadcasted<_, _, TensorEquation> without throwing.
// Display code only reads TensorEquation.output_weaves[0].datatype; the rhs
// field content is not inspected at render time.

@fd.register_term
export class TensorRef extends fd.Term {
    constructor(
        readonly name: fd.DynamicName | null = null,
        readonly axes: sc.RawAxis[] = [],
    ) { super(); }
}

@fd.register_term
export class IversonConst extends fd.Term {
    constructor(
        readonly value: nm.Numeric | null = null,
    ) { super(); }
}

@fd.register_term
export class IversonBinOp extends fd.Term {
    constructor(
        readonly op: string = '',
        readonly lhs: fd.Term | null = null,
        readonly rhs: fd.Term | null = null,
    ) { super(); }
}

@fd.register_term
export class IversonUnaryOp extends fd.Term {
    constructor(
        readonly op: string = '',
        readonly operand: fd.Term | null = null,
    ) { super(); }
}

// Mirrors Python TensorEquation(bc.Operator). Field order must match the
// Python dataclass field order (inherited first): name, lhs_name, lhs_indices,
// rhs, operator — so positional deserialization via to_term() works correctly.
@fd.register_term
export class TensorEquation extends cat.Operator {
    constructor(
        readonly name: fd.DynamicName | null = null,
        readonly lhs_name: fd.DynamicName | null = null,
        readonly lhs_indices: sc.RawAxis[] = [],
        readonly rhs: fd.Term[] = [],
        readonly operator: cat.Operator | null = null,
    ) { super(name); }
}
