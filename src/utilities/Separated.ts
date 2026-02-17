import * as utils from './utilities';

export function joinProvide<T, S>(separator: (index?: number) => S, xs: T[]): [(T|S)[], S[]] {
    const separators: S[] = [];
    function sep_push(index: number): S {
        const sep = separator(index);
        separators.push(sep);
        return sep;
    }
    return [utils.join<T|S>(sep_push, xs), separators];
}

export class Separated<T, S=T> {
    public readonly content: (T|S)[];
    public readonly separators: S[];

    constructor(
        public readonly segments: T[],
        public readonly separator_gen: (i?: number) => S,
        public readonly caps?: [S, S],
    ) {
        const [_content, _separators] = joinProvide<T, S>(separator_gen, segments);
        if (caps === undefined) {
            [this.content, this.separators] = [_content, _separators];
        } else {
            this.content = [caps[0], ..._content, caps[1]];
            this.separators = [caps[0], ..._separators, caps[1]];
        }
    }
}