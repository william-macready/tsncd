import * as fd from './Term';
import * as nm from './Numeric';
import * as util from '../utilities/utilities';

export type ProdCategory<L, M extends Morphism<L>> =
    M | Rearrangement<L>
    | ProductOfMorphisms<L, ProdCategory<L, M>>
    | Composed<L, ProdCategory<L, M>>
    | Block<L, ProdCategory<L, M>>;

@fd.register_term
export class ProdObject<L> extends fd.Term {
    constructor(
        readonly content: L[],
    ) { super(); }

    *[Symbol.iterator](): Iterator<L> {
        yield *this.content
    }
    get length(): fd.int {
        return this.content.length
    }
    map<T>(func: (target: L) => T): T[] {
        return this.content.map(func);
    }
    identity(): Rearrangement<L> {
        return new Rearrangement<L>(
            util.range(this.content.length),
            this.content,
        );
    }
}

export abstract class Morphism<L> extends fd.Term {
    abstract dom(): ProdObject<L>;
    abstract cod(): ProdObject<L>;
}

@fd.register_term
export class BlockAesthetics extends fd.Term {
    constructor(
        readonly title: null | string = null,
        readonly description: null | string = null,
        readonly fill_color: null | string = null,
    ) { super(); }
}

@fd.register_term
export class BlockTag extends fd.UTerm {
    constructor(
        readonly uid: fd.UID,
        readonly repetition: nm.Numeric = new nm.Integer(1),
        readonly aesthetics: null | BlockAesthetics = null
    ) { super(uid); }
}

@fd.register_term
export class Block<L, M extends Morphism<L>> extends Morphism<L> {
    constructor(
        readonly body: M,
        readonly block_tag: BlockTag,
        readonly _display_order?: fd.int,
    ) { super(); }

    dom(): ProdObject<L> {
        return this.body.dom();
    }
    cod(): ProdObject<L> {
        return this.body.cod();
    }
    get repetition(): nm.Numeric {
        return this.block_tag.repetition;
    }
    get aesthetics(): null | BlockAesthetics {
        return this.block_tag.aesthetics;
    }
}

@fd.register_term
export class Composed<L, M extends Morphism<L>> extends Morphism<L> {
    constructor(
        readonly content: M[],
    ) { super(); }

    dom(): ProdObject<L> {
        return this.content[0].dom();
    }
    cod(): ProdObject<L> {
        return this.content[this.content.length - 1].cod();
    }
}

@fd.register_term
export class ProductOfMorphisms<L, M extends Morphism<L>> extends Morphism<L> {
    constructor(
        readonly content: M[],
    ) { super(); }
    dom(): ProdObject<L> {
        return new ProdObject<L>(
            this.content.flatMap(m => m.dom().content));
    }
    cod(): ProdObject<L> {
        return new ProdObject<L>(
            this.content.flatMap(m => m.cod().content));
    }
    *partition<T>(target: T[]): Iterable<[M, T[]]> {
        var start = 0;
        for (const m of this.content) {
            const end = start + m.dom().length;
            yield [m, target.slice(start, end)];
            start = end;
        }
    }
}

@fd.register_term
export class Rearrangement<L> extends Morphism<L> {
    constructor(
        readonly mapping: fd.int[],
        readonly _dom: L[],
    ) { super(); }

    dom(): ProdObject<L> {
        return new ProdObject<L>(this._dom);
    }
    cod(): ProdObject<L> {
        return new ProdObject<L>(this.apply(this._dom));
    }
    apply<T>(target: T[]): T[] {
        return this.mapping.map(i => target[i]);
    }
    invert<T>(target: T[]): T[] {
        return Array(this._dom.length).map(
            i => util.iallequals(
                util.zip(target, this.mapping)
                .filter(([_, j]) => j === i)
                .map(([x, _]) => x)
            )
        )
    }
}