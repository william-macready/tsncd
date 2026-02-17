enum AllEqualsFallback {
    RAISE = 'RAISE',
}

export function zip<T extends unknown[][]>(...arrays: T): { [K in keyof T]: T[K][number] }[] {
    const minlength = Math.min(...arrays.map(arr => arr.length));
    return Array.from({ length: minlength }, (_, i) => arrays.map(arr => arr[i]) as any);
}

export function iallequals<T>(
    xs: Iterable<T>, 
    fallback: AllEqualsFallback | T = AllEqualsFallback.RAISE): T {
        const iterator = xs[Symbol.iterator]();
        const first = iterator.next();

        if (first.done) {
            if (fallback !== AllEqualsFallback.RAISE) {
                return fallback as T;
            }
            throw new Error("Empty iterable and no fallback provided.");
        }

        while (true) {
            const result = iterator.next();
            if (result.done) break;
            if (result.value !== first.value) {
                if (fallback !== AllEqualsFallback.RAISE) {
                    return fallback as T;
                }
                console.log(xs);
                throw new Error("Not all elements are equal and no fallback provided.");
            }
        }

        return first.value;
    }

export function map_filter<T, U>(
    xs: Iterable<T>, 
    predicate: (x: T) => boolean,
    fn: (x: T, i?: number) => U): U[] {
    return Array.from(xs).filter(x => predicate(x)).map(fn);
}

export function map_defined<T, U>(
    xs: Iterable<T | undefined>,
    fn: (x: T) => U | undefined): U[] {
    return Array.from(xs).filter((x): x is T => x !== undefined).map(fn).filter((x): x is U => x !== undefined);
}

export function sum(xs: Iterable<number>): number {
    let total = 0;
    for (const x of xs) {
        total += x;
    }
    return total;
}

export function join<T>(separator: () => T, xs: T[]): T[];
export function join<T>(separator: (index: number) => T, xs: T[]): T[];

export function join<T>(separator: (index?: number) => T, xs: T[]): T[] {
    if (separator.length === 0) {
        return [xs[0], ...xs.slice(1).flatMap((x) => [separator(), x])];
    } else if (separator.length === 1) {
        return [xs[0], ...xs.slice(1).flatMap((x, i) => [separator(i), x])];
    }
    throw new Error('Separator function must take 0 or 1 arguments.');
}

export function all(xs: Iterable<boolean>): boolean {
    for (const x of xs) {
        if (!x) {
            return false;
        }
    }
    return true;
}

export function mask<T>(_mask: boolean[], xs: T[]) {
    return xs.filter((_, i) => _mask[i]);
}

export function conditional_swap<T>(a: T, b: T, condition?: boolean): [T, T] {
    if (condition) {
        return [b, a];
    } else {
        return [a, b];
    }
}

export function range(n: number): number[] {
    return Array.from({ length: n }, (_, i) => i);
}