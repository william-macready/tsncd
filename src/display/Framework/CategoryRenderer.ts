import * as rh from '../Render/RenderHandler';
import * as cat from '../../data_structure/Category';
import * as ut from '../../utilities/utilities';
import * as dhd from '../Render/DrawHandler';
import * as crs from './CategoryRendererSettings';
import * as pt from '../../utilities/Point';
import * as nm from '../../data_structure/Numeric'
import * as nmr from './NumericRenderer';
import { Separated } from '../../utilities/Separated';

// The settings are:
// - L (the long objects of the category)
// - M (the base morphism of the category)
// - A (the anchor type of the category, defaults to L)

// OBJECTS
export abstract class Meridian<A> extends rh.DiagramElement {
    public anchors: Anchor<A>[] = [];
    constructor(
        public categoryRenderer: CategoryRenderer<any, any, A>,
    ) {
        super(categoryRenderer.renderHandler);
    }
    get settings() {
        return this.categoryRenderer.settings;
    }
    public link(next: Meridian<A>): void {
        ut.zip(
            this.anchors, next.anchors).map(
            ([a1, a2]) => a1.anchor_link(a2)
        );
    }
    static generic_link<A>(left: Meridian<A> | Anchor<A>[], right: Meridian<A> | Anchor<A>[]): void {
        const left_anchors = left instanceof Meridian ? left.anchors : left;
        const right_anchors = right instanceof Meridian ? right.anchors : right;
        ut.zip(
            left_anchors, right_anchors).map(
            ([a1, a2]) => a1.anchor_link(a2)
        );
    }
    public enableAnnotation(): void {}
}
export abstract class Anchor<A> extends Meridian<A> {
    public further: Anchor<A>[] = [];
    protected prior: Anchor<A>[] = [];
    public skip: boolean = false;
    protected curve_attributes: Partial<dhd.LineAttrs> = {}; 
    constructor(
        public categoryRenderer: CategoryRenderer<any, any, A>,
    ){
        super(categoryRenderer);
        this.children = [new rh.CoreElement(
            this.renderHandler, 
            {x: 0, y: this.settings.anchor_height})];
        this.anchors = [this];
    }
    public anchor_link(target: Anchor<A>): void {
        this.further.push(target);
        target.prior.push(this);
    }
    update(): void {
        if (this.skipped()) {
            return;
        }
        for (const next of this.next_terminal()) {
            this.renderHandler.draw_handler!.curve(
                [this.location()!, next.location()!],
                {...this.curve_attributes}
            )
        }
    }
    public skipped(): boolean {
        return this.skip && this.prior.length > 0
    }

    public next_terminal_poll(): Anchor<A>[] {
        if (this.skip && this.further.length > 0) {
            return this.further.flatMap((a) => a.next_terminal_poll());
        }
        return [this];
    }
    public next_terminal(): Anchor<A>[] {
        return this.further.flatMap(
            (a) => a.next_terminal_poll()
        );
    }

    public prior_terminal_poll(): Anchor<A>[] {
        if (this.skip && this.prior.length > 0) {
            return this.prior.flatMap((a) => a.prior_terminal_poll());
        }
        return [this];
    }
    public prior_terminal(): Anchor<A>[] {
        return this.prior.flatMap(
            (a) => a.prior_terminal_poll()
        );
    }

    public getAnnotation(): rh.AnnotationElement | undefined {
        return undefined;
    }
}
export class SeparatorAnchor<A> extends Anchor<A> {
    constructor(
        public categoryRenderer: CategoryRenderer<any, any, A>,
    ) {
        super(categoryRenderer);
        this.curve_attributes = this.settings.separator_settings?.separator_curve_attributes || {};
        this.aux.borderColor = 'red';
    }
}

export class ConcatMeridian<A> extends Meridian<A> {
    constructor(
        public categoryRenderer: CategoryRenderer<any, any, A>,
        public content: Meridian<A>[],
    ) {
        super(categoryRenderer);
        this.anchors = this.content.flatMap((x) => x.anchors);
    }
}

export class ProdObjectMeridian<L, A=L> extends Meridian<A> {
    public lone_elements: Meridian<A>[];
    public separated?: Separated<Meridian<A>, SeparatorAnchor<A>>;
    constructor(
        public categoryRenderer: CategoryRenderer<L, any, A>,
        public target: cat.ProdObject<L> | Meridian<A>[],
        public no_separator: boolean = false,
    ) {
        super(categoryRenderer);
        if (target instanceof cat.ProdObject) {
            this.lone_elements = target.map(
                (l) => this.categoryRenderer.display_lone(l)
            );
        } else {
            this.lone_elements = target;
        }
        let content: Meridian<A>[];
        if (!this.no_separator && this.settings.separator_settings) {
            this.separated = new Separated(
                this.lone_elements,
                () => new SeparatorAnchor<A>(this.categoryRenderer),
            );
            content = this.separated.content;
        } else {
            content = this.lone_elements;
        }
        this.children = [new rh.Vertical(this.renderHandler, content)];
        this.anchors = content.flatMap((x) => x.anchors);
    }
    public enableAnnotation(): void {
        this.lone_elements.forEach((el) => el.enableAnnotation());
    }
}

/*
    MORPHISMS
*/
export abstract class AnchoredBox<A> extends rh.DiagramElement {
    public left_anchors!: Meridian<A>;
    public right_anchors!: Meridian<A>;
    constructor(
        public categoryRenderer: CategoryRenderer<any, any, A>,
    ) {
        super(categoryRenderer.renderHandler);
    }
    get settings() {
        return this.categoryRenderer.settings;
    }
    public swap_anchors(): void {
        if (this.settings.reversed) {
            [this.left_anchors, this.right_anchors] = [this.right_anchors, this.left_anchors];
        }
    }
}
export abstract class MorphismBox<L, M extends cat.Morphism<L>, A=L> extends AnchoredBox<A> {
    public left_anchors!: ProdObjectMeridian<L, A>;
    public right_anchors!: ProdObjectMeridian<L, A>;
    constructor(
        public categoryRenderer: CategoryRenderer<L, M, A>,
        public target: cat.ProdCategory<L, M>,
        public build: boolean = true,
    ) {
        super(categoryRenderer);
    }
    get settings() {
        return this.categoryRenderer.settings;
    }
}

// Placeholder for Morphisms
class DefaultMorphismBox<L, M extends cat.Morphism<L>, A=L> extends MorphismBox<L, M, A> {
    protected construct() {
        this.left_anchors = this.categoryRenderer.display_prod_object(this.target.dom());
        this.right_anchors = this.categoryRenderer.display_prod_object(this.target.cod());
        if (this.settings.reversed) {
            console.log('reverse!');
            const placeholder = this.left_anchors;
            this.left_anchors = this.right_anchors;
            this.right_anchors = placeholder;
        }
        this.children = [
            this.left_anchors,
            new rh.CoreElement(this.renderHandler, {x:50,y:50}),
            this.right_anchors,
        ];
        this.aux.borderColor = 'black';
    }
}

export class BlockBox<L, M extends cat.Morphism<L>, A=L> extends MorphismBox<L, M, A> {
    private outer_box: rh.DiagramElement;
    private inner_box: MorphismBox<L, cat.ProdCategory<L, M>, A>;
    private iteration_annotation?: rh.AnnotationElement;
    constructor(
        public categoryRenderer: CategoryRenderer<L, M, A>,
        public target: cat.Block<L, cat.ProdCategory<L, M>>,
        public capped: boolean = true,
        _inner_box?: MorphismBox<L, cat.ProdCategory<L, M>, A>,
    ) {
        super(categoryRenderer, target);
        this.inner_box = _inner_box ?? this.categoryRenderer.display_category(
            target.body, capped);
        this.left_anchors = this.inner_box.left_anchors;
        this.right_anchors = this.inner_box.right_anchors;
        this.outer_box = new rh.CoreElement(
            this.renderHandler,
            {
                x: this.inner_box.dims.x + this.settings.block_padding.x,
                y: this.inner_box.dims.y + this.settings.block_padding.y,
            },
            [this.inner_box]
        );
        this.inner_box.transform.offset = {
            x: this.settings.block_padding.x / 2, 
            y: this.settings.block_padding.y / 2};
        this.children = [this.outer_box];

        // this.children = [
        //     new rh.Vertical(
        //         this.renderHandler,
        //         [new rh.CoreElement(
        //             this.renderHandler,
        //             {x: 20, y: 20}
        //         ),
        //         this.inner_box,
        //         new rh.CoreElement()]
        //     )
        // ];
        this.aux.borderColor = 'red';
    }

    protected draw_core(): void {
        if (!this.target.aesthetics) {
            return;
        }
        if (this.target.aesthetics.title) {
            this.renderHandler.annotation_handler.addAnnotation(
                this.rectangle(),
                new rh.AnnotationElement(
                    this.renderHandler,
                    `\\text{${this.target.aesthetics.title || ''}}`,
                    {font_size: 0.5,
                    vertical_align: 'start',
                    horizontal_align: 'center'
                    }
                )
            );
        }
        this.draw?.drawRectangle(
            this.rectangle(),
            {
                fill: this.target.aesthetics.fill_color || 'none',
                stroke: 'none'
            },
            {dropShadow: true},
            'background'
        );
    }

    protected draw_left_bracket(): void {
        const rect = this.rectangle();
        const bracket_depth: number = 5;
        this.iteration_annotation = this.iteration_annotation ??
            new rh.AnnotationElement(
                this.renderHandler,
                nmr.numeric_string(this.target.repetition) || '',
                {font_size: 1, vertical_align: 'center', horizontal_align: 'center'}
            );
        this.iteration_annotation?.place(
            new pt.Rectangle(
                {x: rect.left - 20, y: rect.top},
                {x: 20, y: 20}
            )
        );
        this.draw?.polyline(
            [
                {x: rect.left + bracket_depth, y: rect.top},
                {x: rect.left, y: rect.top + bracket_depth},
                {x: rect.left, y: rect.bottom - bracket_depth},
                {x: rect.left + bracket_depth, y: rect.bottom},
            ],
            {stroke: 'black', 'stroke-width': '3px'},
            'main'
        )
    }
    protected draw_right_bracket(): void {
        const rect = this.rectangle();
        const bracket_depth: number = 5;
        this.draw?.polyline(
            [
                {x: rect.right - bracket_depth, y: rect.top},
                {x: rect.right, y: rect.top + bracket_depth},
                {x: rect.right, y: rect.bottom - bracket_depth},
                {x: rect.right - bracket_depth, y: rect.bottom}
            ],
            {stroke: 'black', 'stroke-width': '3px'},
            'main'
        )
    }
    super_update(): void {
        super.update();
    }
    update(): void {
        if (!this.target.aesthetics) {
            super.update();
            return;
        }
        this.draw_core();
        super.update();
        if (!(this.target.repetition instanceof nm.Integer)
            || this.target.repetition._value === 1) {
            return;
        }
        this.draw_left_bracket();
        this.draw_right_bracket();
    }
}

/*
    COMPOSED RENDERING
*/
class ComposedGap<L, A=L> extends AnchoredBox<A> {
    constructor(
        public categoryRenderer: CategoryRenderer<L, any, A>,
        public dom: Meridian<A>,
        public cod: Meridian<A>,
        target_width?: number,
        public annotated: boolean = true,
    ) {
        super(categoryRenderer);
        this.left_anchors = dom;
        this.right_anchors = cod;
        this.left_anchors.link(this.right_anchors);
        // TODO: Magic numbers
        const dims = {
            x: target_width ?? this.settings.composed_gap_dims.x,
            y: this.settings.composed_gap_dims.y,
        }
        this.children = [new rh.CoreElement(
            this.renderHandler, 
            dims
        )];
        this.height = Math.max(
            this.settings.anchor_height * this.left_anchors.anchors.length,
            this.settings.anchor_height * this.right_anchors.anchors.length);

        this.aux.borderColor = 'blue';
    }

    update(): void {
        super.update();
        if (this.annotated) {
            this.update_anchor_annotations();
        }
    }

    protected update_anchor_annotations(): void {
        const this_rect = this.rectangle();
        // let top_left = pt.Point.mulsum(
        //     this_rect.top_left,
        //     {x: 0, y: -this.settings.anchor_height / 4}
        // );
        for (
            let i = 0; i < this.right_anchors.anchors.length; i++
        ) {
            const left_anchor = this.left_anchors.anchors[i];
            const right_anchor = this.right_anchors.anchors[i];
            const left_align = !left_anchor.skip;
            const top_left = 
                left_align
                ? left_anchor.rectangle().top_left
                : pt.Point.mulsum(
                    right_anchor.rectangle().top_left,
                    [-1, {x: this_rect.width, y: 0}]
                )
            const dims = {
                x: this_rect.width,
                y: this.settings.anchor_height,
            }
            const annotation_rect = new pt.Rectangle(
                {x: top_left.x + 3*(left_align ? 0 : -1), 
                 y: top_left.y-7},
                dims
            )
            const annotation = 
                   left_anchor.getAnnotation() 
                ?? right_anchor.getAnnotation();
            if (annotation?.annotationSettings) {
                annotation.annotationSettings.horizontal_align = 
                    left_align ? 'left' : 'right';
            }
            if (annotation) {
                this.renderHandler.annotation_handler.addAnnotation(
                    annotation_rect,
                    annotation,
                )
            }
        }
    }

    static loose_link<L, A=L>(
        categoryRenderer: CategoryRenderer<L, any, A>,
        left: AnchoredBox<A>,
        right: AnchoredBox<A>,
    ): ComposedGap<L, A> {
        const dom = left.right_anchors;
        const cod = right.left_anchors;
        const left_height = left.dims.y ?? 0;
        const right_height = right.dims.y ?? 0;
        if (left_height < right_height) {
            dom.anchors.forEach(
                (a) => {
                    a.skip = true;
                    a.aux.borderColor = 'pink';
                }

            );
        } else if (right_height < left_height) {
            cod.anchors.forEach(
                (a) => {
                    a.skip = true;
                    a.aux.borderColor = 'pink';
                }
            );
        }
        return new ComposedGap(
            categoryRenderer,
            dom,
            cod,
        )
    }
}
export class ComposedBox<L, M extends cat.Morphism<L>, A=L> extends MorphismBox<L, M, A> {
    private content: MorphismBox<L, M, A>[];
    private separated_content: Separated<MorphismBox<L, M, A>, ComposedGap<L, A>>;
    constructor(
        public categoryRenderer: CategoryRenderer<L, M, A>,
        public target: cat.Composed<L, cat.ProdCategory<L, M>>,
        public capped: boolean = true,
        _content?: MorphismBox<L, M, A>[],
    ) {
        super(categoryRenderer, target);

        this.content = _content ?? target.content.map(
            (item) => categoryRenderer.display_category(
                item, false)
        );
        if (this.settings.reversed) {
            this.content.reverse();
        }
        let caps: undefined | [ComposedGap<L, A>, ComposedGap<L, A>] = undefined;
        if (this.capped) {
            this.left_anchors = categoryRenderer.display_prod_object(
                target.dom()
            );
            this.right_anchors = categoryRenderer.display_prod_object(
                target.cod()
            );
            this.swap_anchors();
            caps = [
                new ComposedGap(
                    categoryRenderer, 
                    this.left_anchors, 
                    this.content[0].left_anchors),
                new ComposedGap(
                    categoryRenderer, 
                    this.content[this.content.length - 1].right_anchors, 
                    this.right_anchors)
                ];
        }
        else {
            this.left_anchors = this.content[0].left_anchors;
            this.right_anchors = this.content[this.content.length - 1].right_anchors;
        }

        this.separated_content = new Separated(
            this.content,
            (i?: number) => ComposedGap.loose_link(
                this.categoryRenderer,
                this.content[i!],
                this.content[i!+1]
            ),
            caps,
        );
        this.children = [
            ...(this.capped ? [this.left_anchors] : []),
            ...this.separated_content.content,
            ...(this.capped ? [this.right_anchors] : []),
        ];
        this.aux.borderColor = 'yellow';
    }
}

/*
 PRODUCT RENDERING
*/
class ProductGap<L, A=L> extends AnchoredBox<A> {
    constructor(
        public categoryRenderer: CategoryRenderer<L, any, A>,
        public width: number = categoryRenderer.settings.product_gap_width ?? 20,
    ) {
        super(categoryRenderer);
        this.left_anchors =  new SeparatorAnchor<A>(categoryRenderer);
        this.right_anchors = new SeparatorAnchor<A>(categoryRenderer);
        this.left_anchors.link(this.right_anchors);
        this.children = [
            this.left_anchors,
            new rh.CoreElement(this.renderHandler, 
                {x:width,
                y:undefined}),
            this.right_anchors,
        ];
        this.aux.borderColor = 'green';
    }
}

export class SpreadBox<L, M extends cat.Morphism<L>, A=L> extends MorphismBox<L, M, A> {
    public left_cap: ComposedGap<L, A>;
    public right_cap: ComposedGap<L, A>;
    constructor(
        public categoryRenderer: CategoryRenderer<L, M, A>,
        public target: cat.ProdCategory<L, M>,
        public body: MorphismBox<L, M, A>,
        public target_width: number | undefined,
        public annotated: boolean = false,
    ) {
        super(categoryRenderer, target);
        const cap_width = 
            this.target_width 
            ? (this.target_width - this.body.dims.x!) / 2
            : this.settings.composed_gap_dims.x;
        this.left_anchors = categoryRenderer.display_prod_object(
            this.target.dom()
        );
        this.right_anchors = categoryRenderer.display_prod_object(
            this.target.cod()
        );
        this.swap_anchors();
        this.left_cap = new ComposedGap(
            categoryRenderer,
            this.left_anchors,
            this.body.left_anchors,
            cap_width,
            annotated,
        );
        this.right_cap = new ComposedGap(
            categoryRenderer,
            this.body.right_anchors,
            this.right_anchors,
            cap_width,
            annotated,
        )
        this.children = [
            this.left_anchors,
            this.left_cap,
            this.body,
            this.right_cap,
            this.right_anchors,
        ]
    }
}

export class ProductBox<L, M extends cat.Morphism<L>, A=L> extends MorphismBox<L, M, A> {
    constructor(
        public categoryRenderer: CategoryRenderer<L, M, A>,
        public target: cat.ProductOfMorphisms<L, cat.ProdCategory<L,M>>,
        capped: boolean = true,
        _morphisms?: MorphismBox<L, M, A>[],
    ) {
        super(categoryRenderer, target);
        let morphisms = _morphisms ?? this.target.content.map(
            (item) => categoryRenderer.display_category(
                item, 
                capped && this.settings.cap_products)
        );
        const target_width = Math.max(
            ...morphisms.map((m) => m.dims.x ?? 0)
        ) - 35;
        morphisms = morphisms.map(
            (m) => (m.dims.x >= target_width) ?
                m :
                new SpreadBox(
                    this.categoryRenderer,
                    m.target,
                    m,
                    target_width
                )
        )
        let content: AnchoredBox<A>[];
        if (this.categoryRenderer.settings.separator_settings !== undefined) {
            // const width = Math.max(
            //     ...morphisms.map((m) => m.dims.x ?? 0)) * 3/4;
            content = new Separated(
                morphisms, 
                () => new ProductGap<L, A>(
                    this.categoryRenderer, 
                    target_width)
            ).content;
        }
        else {
            content = morphisms;
        }
        this.left_anchors = new ProdObjectMeridian(
            this.categoryRenderer, content.map((x) => x.left_anchors), true);
        this.right_anchors = new ProdObjectMeridian(
            this.categoryRenderer, content.map((x) => x.right_anchors), true);
        this.children = [new rh.Vertical(
            this.renderHandler, content)];
    }
}

/*
    REARRANGEMENT RENDERING
*/

class RearrangementBox<L, A=L> extends MorphismBox<L, any, A> {
    public core: rh.CoreElement;
    constructor(
        public categoryRenderer: CategoryRenderer<L, any, A>,
        public target: cat.Rearrangement<L>,
    ) {
        super(categoryRenderer, target);
        this.left_anchors =  categoryRenderer.display_prod_object(target.dom());
        this.right_anchors = categoryRenderer.display_prod_object(target.cod());
        this.setup_links();
        this.swap_anchors();
        this.core = new rh.CoreElement(
            this.renderHandler, {x:this.settings.rearrangement_width}
        );
        this.children = [this.left_anchors, this.core, this.right_anchors];
        this.aux.borderColor = 'orange';
    }
    setup_links(): void {
        const doms = this.left_anchors.lone_elements;
        const cods = this.right_anchors.lone_elements;
        const dom_cod_pairs = cods.map(
            (cod, i) => 
                [doms[this.target.mapping[i]],
                 cod]
        )
        dom_cod_pairs.forEach(
            ([dom, cod]) => this.settings.reversed ?
                cod.link(dom) : dom.link(cod)
        )
    }
}

export type CatBox<L, M extends cat.Morphism<L>, A=L> = MorphismBox<L, cat.ProdCategory<L, M>, A>;

export abstract class CategoryRenderer<
    L, 
    M extends cat.Morphism<L>,
    A = L> {

    public settings: crs.CategoryRendererSettings<L, M, A>;
    constructor(
        public renderHandler: rh.RenderHandler,
        _settings: Partial<crs.CategoryRendererSettings<L, M, A>> = {},
    ) {
        this.settings = {
            ...crs.DefaultCategoryRendererSettings,
            ..._settings,
        };
        console.log("CategoryRenderer settings:", this.settings);
    }

    public abstract display_lone(target: L): Meridian<A>;
    public display_morphism(target: M): MorphismBox<L, M, A> {
        return new DefaultMorphismBox(this, target);
    }
    public abstract display_prod_object(target: cat.ProdObject<L>): ProdObjectMeridian<L, A>;
    public display_category(
        target: cat.ProdCategory<L, M>, 
        capped: boolean = true): MorphismBox<L, M, A> {
        if (target instanceof cat.Composed) {
            return new ComposedBox(this, target, capped);
        }
        if (target instanceof cat.ProductOfMorphisms) {
            return new ProductBox(this, target, capped);
        }
        if (target instanceof cat.Block) {
            return new BlockBox(this, target, capped);
        }
        if (capped) {
            return new ComposedBox(
                this, 
                new cat.Composed([target]),
            );
        }
        if (target instanceof cat.Rearrangement) {
            return new RearrangementBox(this, target);
        }
        return this.display_morphism(target);
    }
}