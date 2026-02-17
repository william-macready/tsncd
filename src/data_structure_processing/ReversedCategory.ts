import * as cat from '../data_structure/Category';

export type ReversedCategory<L, M extends cat.Morphism<L>> = 
    ReversedMorphism<L, M>
    | ReversedRearrangement<L>
    | cat.ProductOfMorphisms<L, ReversedCategory<L, M>>
    | cat.Composed<L, ReversedCategory<L, M>>;

export function rearrangement_pairs<L>(
    target: ReversedRearrangement<L> | cat.Rearrangement<L>
): [number, number][] {
    if (target instanceof cat.Rearrangement) {
        return target.mapping.map((dom_idx, cod_idx) => [dom_idx, cod_idx]);
    }
    if (target instanceof ReversedRearrangement) {
        return target.mapping.map((cod_idx, dom_idx) => [dom_idx, cod_idx]);
    }
    throw new Error("Target must be a Rearrangement or ReversedRearrangement.");
}

export class ReversedRearrangement<L> extends cat.Morphism<L> {
    constructor(
        readonly mapping: number[],
        readonly _cod: L[]
    ) { super(); }
    dom(): cat.ProdObject<L> {
        return new cat.ProdObject<L>(this.apply(this._cod));
    }
    cod(): cat.ProdObject<L> {
        return new cat.ProdObject<L>(this._cod);
    }
    apply<T>(target: T[]): T[] {
        return this.mapping.map(i => target[i]);
    }
}

export class ReversedMorphism<L, M extends cat.Morphism<L>> extends cat.Morphism<L> {
    constructor(
        public target: M
    ) {
        super();
    }
    dom(): cat.ProdObject<L> {
        return this.target.cod();
    }
    cod(): cat.ProdObject<L> {
        return this.target.dom();
    }
}

export function reverse_category<L, M extends cat.Morphism<L>>(
    target: cat.ProdCategory<L, M>
): ReversedCategory<L, M> {
    if (target instanceof cat.Composed) {
        return new cat.Composed<L, ReversedCategory<L, M>>(
            target.content.reverse().map(
                (m) => reverse_category(m)
            )
        );
    }
    if (target instanceof cat.ProductOfMorphisms) {
        return new cat.ProductOfMorphisms<L, ReversedCategory<L, M>>(
            target.content.map(
                (m) => reverse_category(m)
            )
        );
    }
    if (target instanceof cat.Rearrangement) {
        return new ReversedRearrangement<L>(
            target.mapping,
            target.dom().content
        );
    }
    return new ReversedMorphism<L, M>(target);
}