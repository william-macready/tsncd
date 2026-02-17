import * as cat from '../data_structure/Category';
import * as fd from '../data_structure/Term';
import * as nm from '../data_structure/Numeric';
import * as ops from '../data_structure/Operators';

export function string_export_rows(
    target: fd.Term,
    depth: number = 0,
): string[] {
    const indent = '  '.repeat(depth);
    if ('content' in target.dict()) {
        return [
            `${indent}${target.constructor.name}: [`,
            ...Array.from((target as unknown as {content: Iterable<fd.Term>}).content).flatMap(
                (item: fd.Term) =>
                string_export_rows(item, depth + 1)
            ),
            `${indent}],`
        ]
    }
    return [`${indent}${target.constructor.name},`];
}