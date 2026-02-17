import * as rh from '../Render/RenderHandler';
import * as cat from '../../data_structure/Category';
import * as ut from '../../utilities/utilities';
import * as dhd from '../Render/DrawHandler';
import * as crs from './CategoryRendererSettings';
import * as pt from '../../utilities/Point';
import * as nm from '../../data_structure/Numeric'
import { Separated } from '../../utilities/Separated';
import * as cr from './CategoryRenderer';

const CAPPED = false;

/*
A split returns:
    IF width <= max_width:
        - {box, target, <undefined>}
    IF width > max_width AND is splittable:
        - {box, target0, target1}
        - so that:
             box.dims.x <= max_width
             target == target0 @ target1
    IF width > max_width AND is NOT splittable AND gaurentee_single == false:
        - undefined
        (this indicates a new line should begin)
    IF width > max_width AND is NOT splittable AND gaurentee_single == true:
        - {box, target0, target1}
        - so that:
             target0 is as thin as possible
             target == target0 @ target1
*/

interface SplitResult<L, M extends cat.Morphism<L>, A=L> { // If undefined, nothing fits.
    box: cr.MorphismBox<L, M, A>;
    target0: cat.ProdCategory<L, M>;
    target1?: cat.ProdCategory<L, M>; // If undefined, everything fits.
    block_order?: number;
    block_position?: PartialBlockPosition;
}

function split_composed<L, M extends cat.Morphism<L>, A=L>(
    categoryRenderer: cr.CategoryRenderer<L, M, A>,
    target: cat.Composed<L, cat.ProdCategory<L, M>>,
    max_width: number,
    gaurentee_single: boolean,
): SplitResult<L, M, A> | undefined {
    const boxes: cr.MorphismBox<L, M, A>[] = [];
    const target0_content: cat.ProdCategory<L, M>[] = [];
    const target1_content = target.content.slice();
    let accumulated_width = -categoryRenderer.settings.composed_gap_dims.x;

    for (const m of target.content) {
        const m_split = split_category(
            categoryRenderer,
            m, 
            max_width 
            - accumulated_width
            - categoryRenderer.settings.composed_gap_dims.x,
            gaurentee_single && boxes.length === 0
        )
        // Nothing fits.
        if (m_split === undefined) {
            break;
        }
        // Else, add the first section.
        boxes.push(m_split.box);
        target0_content.push(m_split.target0);
        target1_content.shift();
        // There is a remainder.
        if (m_split.target1 !== undefined) {
            target1_content.unshift(m_split.target1);
            break;
        }
        accumulated_width += 
            categoryRenderer.settings.composed_gap_dims.x 
            + m_split.box.dims.x;
    }

    if (boxes.length === 0) {
        return undefined;
    }

    const target0: cat.Composed<L, cat.ProdCategory<L, M>> 
        = new cat.Composed(target0_content);
    const target1 = target1_content.length > 0
        ? new cat.Composed<L, cat.ProdCategory<L, M>>(target1_content)
        : undefined;
    const box = new cr.ComposedBox<L, M, A>(
        categoryRenderer,
        target0,
        CAPPED,
        boxes,
    )
    return {
        box: box,
        target0: target0,
        target1: target1,
    }
}

function split_product<L, M extends cat.Morphism<L>, A=L>(
    categoryRenderer: cr.CategoryRenderer<L, M, A>,
    target: cat.ProductOfMorphisms<L, cat.ProdCategory<L, M>>,
    max_width: number,
    gaurentee_single: boolean,
): SplitResult<L, M, A> | undefined {
    const segment_splits = target.content.map((m) =>
        split_category(
            categoryRenderer,
            m, max_width,
            gaurentee_single
        )
    );
    // Nothing fits
    if (segment_splits.every((s) => s === undefined)) {
        return undefined;
    }
    // Something fits
    const target0 = new cat.ProductOfMorphisms<L, cat.ProdCategory<L, M>>(
        segment_splits.map((s, i) =>
            s ? s.target0 : target.content[i].dom().identity()
        )
    );
    const boxes = segment_splits.map((s, i) =>
        s ? s.box : categoryRenderer.display_category(
            target.content[i].dom().identity(),
            false,
        ));

    // Everything fits
    const everything_fits = segment_splits.every((s) => 
        s !== undefined && s.target1 === undefined)
    const target1 = everything_fits
        ? undefined
        : new cat.ProductOfMorphisms
            <L, cat.ProdCategory<L, M>>(
            segment_splits.map((s, i) =>
                s?.target1 ?? target.content[i].cod().identity()
            )
        );

    return {
        box: new cr.ProductBox(
            categoryRenderer,
            target0,
            CAPPED,
            boxes,
        ),
        target0: target0,
        target1: target1,
    }
}

function split_block<L, M extends cat.Morphism<L>, A=L>(
    categoryRenderer: cr.CategoryRenderer<L, M, A>,
    target: cat.Block<L, cat.ProdCategory<L, M>>,
    max_width: number,
    gaurentee_single: boolean,
): SplitResult<L, M, A> | undefined {
    const body_split = split_category(
        categoryRenderer,
        target.body,
        max_width - categoryRenderer.settings.block_padding.x,
        gaurentee_single
    );
    // Nothing fits
    if (body_split === undefined) {
        return undefined;
    }
    // Something fits
    const block_order = target._display_order ?? 0;
    const target0 = new cat.Block
        <L, cat.ProdCategory<L, M>>(
        body_split.target0,
        target.block_tag,
        block_order,
    )
    const target1 = body_split.target1 ?
        new cat.Block
            <L, cat.ProdCategory<L, M>>(
            body_split.target1,
            target.block_tag,
            block_order + 1,
        ) : undefined;
    const block_position = (target1 === undefined)
        ? PartialBlockPosition.LAST
        : PartialBlockPosition.MIDDLE;
    const box = new PartialBlock(
        categoryRenderer,
        target0,
        CAPPED,
        body_split.box,
        block_order,
        block_position 
    );
    return {
        box: box,
        target0: target0,
        target1: target1,
        // block_order: block_order,
        // block_position: block_position
    }
}

function split_morphism<L, M extends cat.Morphism<L>, A=L>(
    categoryRenderer: cr.CategoryRenderer<L, M, A>,
    target: M | cat.Rearrangement<L>,
    max_width: number,
    gaurentee_single: boolean,
): SplitResult<L, M, A> | undefined {
    const box = categoryRenderer.display_category(
        target,
        false
    );
    if (box.dims.x <= max_width || gaurentee_single) {
        return {
            box: box,
            target0: target,
            target1: undefined,
        }
    }
    else {
        return undefined;
    }
}

function split_category<L, M extends cat.Morphism<L>, A=L>(
    categoryRenderer: cr.CategoryRenderer<L, M, A>,
    target: cat.ProdCategory<L, M>,
    max_width: number,
    gaurentee_single: boolean,
    block_order?: number,
): SplitResult<L, M, A> | undefined {
    if (target instanceof cat.ProductOfMorphisms) {
        return split_product(
            categoryRenderer,
            target,
            max_width,
            gaurentee_single
        );
    }
    if (target instanceof cat.Composed) {
        return split_composed(
            categoryRenderer,
            target,
            max_width,
            gaurentee_single
        );
    }
    if (target instanceof cat.Block) {
        return split_block(
            categoryRenderer,
            target,
            max_width,
            gaurentee_single,
        );
    }
    return split_morphism<L, M, A>(
        categoryRenderer,
        target,
        max_width,
        gaurentee_single
    );
}

export class MultilineComposedBox<L, M extends cat.Morphism<L>, A=L> 
    extends cr.MorphismBox<L, M, A> {
    private rows: cr.MorphismBox<L, M, A>[];
    constructor(
        public categoryRenderer: cr.CategoryRenderer<L, M, A>,
        public target: cat.ProdCategory<L, M>,
        public max_width: number,
    ) {
        super(categoryRenderer, target);

        this.rows = [];
        let current_target = this.target;
        let first_pass = true;
        let block_order = 0;
        while (true) {
            const split_info = split_category(
                this.categoryRenderer,
                current_target,
                this.max_width,
                true,
                block_order,
            )!;
            block_order = (split_info.block_order === undefined)
                ? 0
                : split_info.block_order;
            const thin_display = first_pass && split_info.target1 === undefined;
            const row = new cr.SpreadBox<L, M, A>(
                this.categoryRenderer,
                split_info.target0,
                split_info.box,
                thin_display ?
                    undefined 
                    : this.max_width + 2 * this.settings.composed_gap_dims.x,
                true,
            );
            this.rows.push(
                row
            );
            if (split_info.target1 === undefined) {
                break;
            }
            current_target = split_info.target1;
            first_pass = false;
        }
        this.children = [
            new rh.Vertical(
                this.renderHandler,
                this.rows,
            )
        ]
    }
}

enum PartialBlockPosition {
    MIDDLE,
    LAST,
}

export class PartialBlock<L, M extends cat.Morphism<L>, A=L>
    extends cr.BlockBox<L, M, A> {
    constructor(
        public categoryRenderer: cr.CategoryRenderer<L, M, A>,
        public target: cat.Block<L, cat.ProdCategory<L, M>>,
        public capped: boolean = true,
        _inner_box?: cr.MorphismBox<L, cat.ProdCategory<L, M>, A>,
        public order: number = 0,
        public position: PartialBlockPosition = PartialBlockPosition.LAST,
    ) {
        super(
            categoryRenderer, 
            target, 
            capped,
        _inner_box);
    }
    update(): void {
        if (!this.target.aesthetics) {
            super.super_update();
            return;
        }
        this.draw_core();
        super.super_update();
        if (!(this.target.repetition instanceof nm.Integer)
            || this.target.repetition._value === 1) {
            return;
        }
        if (this.order === 0) {
            this.draw_left_bracket();
        }
        if (this.position === PartialBlockPosition.LAST) {
            this.draw_right_bracket();
        }
    }
}