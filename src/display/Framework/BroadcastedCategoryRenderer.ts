import * as rh from '../Render/RenderHandler';
import * as cr from './CategoryRenderer';
//import * as bm from './BroadcastedMeridian';
import * as ut from '../../utilities/utilities';
import * as cat from '../../data_structure/Category';
import * as ops from '../../data_structure/Operators';
import { Separated } from '../../utilities/Separated';
import * as crs from './CategoryRendererSettings';
import * as pt from '../../utilities/Point';
import * as utcr from '../../utilities/ConstructorRegistry';
import * as tu from '../../data_structure_processing/term_utilities';
import * as tu_rc from '../../data_structure_processing/ReversedCategory';
import * as scr from './StrideCategoryRenderer';
import * as Curve from '../draw_helper/Curve';
// There are three main modes of displaying Broadcasted morphisms:
// 1. WEAVE: One output, and all reindexings are remappings.
// 2. NODE: All the reindexings are the same.
// 3. JOIN: General case. The degrees join. Reindexings on the left.

//import * as addops from './Operations/additionalOperationBoxes'
//console.log(addops);

export const opsRegistry = new utcr.ConstructorRegistry<
    cat.Operator,
    OperationBox<any, any, any>,
    [BroadcastedRenderer<any, any>,
    cat.Broadcasted<any, any, any>
]>(); 

// TODO: Magic Numbers
const DATATYPE_ANCHOR_TRIANGLE_X = 7;
const DATATYPE_ANCHOR_TRIANGLE_Y = 4;
export class DatatypeAnchor<B extends cat.Datatype> extends cr.Anchor<B> {
    private annotation?: rh.AnnotationElement;
    constructor(
        public categoryRenderer: BroadcastedRenderer<B, any>,
        public target: B,
    ) {
        super(categoryRenderer);
        this.aux.borderColor = 'lime';
        this.curve_attributes = {
            ...this.curve_attributes,
            'stroke-width': '2px',
        }
    }
    update(): void {
        if (this.skipped()) {
            return;
        }
        const triangle_delta_coords = [
            {x: -DATATYPE_ANCHOR_TRIANGLE_X,    y:-DATATYPE_ANCHOR_TRIANGLE_Y},
            {x:  DATATYPE_ANCHOR_TRIANGLE_X / 3,y: DATATYPE_ANCHOR_TRIANGLE_Y},
            {x: -DATATYPE_ANCHOR_TRIANGLE_X / 3,y: DATATYPE_ANCHOR_TRIANGLE_Y},
        ]
        for (const next of this.next_terminal()) {
            const [p0, p1] = [this.location()!, next.location()!];
            this.draw?.curve(
                [p0, p1],
                {...this.curve_attributes}
            );
            const curve = Curve.flatCurve(p0, p1);
            const midpoint_x = p0.x / 2 + p1.x / 2;
            const midpoint = curve.y(midpoint_x);
            const angle = curve.angle(midpoint_x);
            this.draw?.deltaPolygon(
                [midpoint, ...pt.Point.rotate(triangle_delta_coords, angle)],
                {stroke: 'none', fill: this.curve_attributes.stroke}
            );
        }
    }
    public getAnnotation(): rh.AnnotationElement {
        const target_latex = this.target.to_latex();
        if (!this.annotation) {
            this.annotation = new rh.AnnotationElement(
                this.renderHandler,
                target_latex || '',
                {font_size: 0.7}
            )
        }
        return this.annotation!;
    }
    
}

export class ArrayMeridian<B extends cat.Datatype, A extends cat.Axis> extends cr.Meridian<A | B> {
    public axes_anchors: cr.ProdObjectMeridian<A>;
    public datatype_anchor?: DatatypeAnchor<B>;
    constructor(
        public categoryRenderer: BroadcastedRenderer<B, A>,
        public target: cat.Array<B, A>,
    ) {
        super(categoryRenderer);
        this.axes_anchors = categoryRenderer.strideRenderer.display_prod_object(
            this.target.shape()
        );
        if (this.target.datatype instanceof cat.Natural) {
            this.datatype_anchor = new DatatypeAnchor(
                categoryRenderer, 
                this.target.datatype);
        }
        this.children = 
            this.datatype_anchor
            ? [new rh.Vertical(
                this.renderHandler,
                [this.axes_anchors,
                this.datatype_anchor],
            )] : [this.axes_anchors];
        this.anchors = [
            ...this.axes_anchors.anchors,
            ...(this.datatype_anchor ? [this.datatype_anchor] : [])
        ];
    }
    public kept_axes(weave: cat.Weave<B, A>): cr.Meridian<A> {
        return new cr.ConcatMeridian<A>(
            this.categoryRenderer,
            weave.select_target(this.axes_anchors.anchors)
        );
    }
    public kept_mask(weave: cat.Weave<B, A>): boolean[] {
        return [
            ...weave._shape.map(
                (s) => s instanceof cat.Axis
            ),
            ...(this.datatype_anchor ? [true] : [])
        ]
    }
    public enableAnnotation(): void {
        this.axes_anchors.enableAnnotation();
    }
}

export class BroadcastedRenderer<
    B extends cat.Datatype, 
    A extends cat.Axis> 
    extends cr.CategoryRenderer<cat.Array<B, A>, cat.Broadcasted<B, A>, A | B> {
        
    public settings: crs.BroadcastedRendererSettings<B, A>;
    constructor(
        public renderHandler: rh.RenderHandler,
        public strideRenderer: scr.StrideRenderer<A> = new scr.StrideRenderer<A>(renderHandler),
        _settings: Partial<crs.BroadcastedRendererSettings<B, A>> = {},
    ) {
        super(renderHandler, _settings);
        this.settings = {
            ...crs.DefaultBroadcastedRendererSettings,
            // @ts-ignore: ts(2855)
            ...super.settings
        };
    }

    public display_lone(target: cat.Array<B, A>): ArrayMeridian<B, A> {
        return new ArrayMeridian(this, target);
    }
    public display_prod_object(target: cat.ProdObject<cat.Array<B, A>>): cr.ProdObjectMeridian<cat.Array<B, A>, A | B> {
        return new cr.ProdObjectMeridian(this, target);
    }
    public display_morphism(
        target: cat.Broadcasted<B, A>
    ): cr.MorphismBox<cat.Array<B, A>, cat.Broadcasted<B, A>, A | B> {
        return display_broadcasted(this, target);
    }
}

export function display_broadcasted<B extends cat.Datatype, A extends cat.Axis>(
    categoryRenderer: BroadcastedRenderer<B, A>,
    target: cat.Broadcasted<B, A>,
) {
    const mode = find_broadcast_display_type(target);
    return new BroadcastedBox(categoryRenderer, target);
}

enum BroadcastDisplayType {
    WEAVE = 'WEAVE',
    NODE = 'NODE',
    JOIN = 'JOIN',
}

function find_broadcast_display_type(
    target: cat.Broadcasted<any, any>,
): BroadcastDisplayType {
    const reindexings = target.reindexings;
    if (target.output_weaves.length === 1 && reindexings.every((r) => tu.is_mappable(r))) {
        return BroadcastDisplayType.WEAVE;
    }
    const unified = ut.iallequals(reindexings, undefined);
    if (unified) {
        return BroadcastDisplayType.NODE;
    }
    return BroadcastDisplayType.JOIN;
}

function label_kept<B extends cat.Datatype, A extends cat.Axis>(
    anchors: cr.ProdObjectMeridian<cat.Array<B, A>, B | A>,
    weaves: cat.Weave<B, A>[],
): boolean[] {
    const array_anchors = anchors.lone_elements as ArrayMeridian<B, A>[];
    const flat_weave = ut.zip(array_anchors, weaves).map(
        ([array_anchor, weave]) => array_anchor.kept_mask(weave)
    );
    if (anchors.separated) {
        return ut.join(
            () => [true],
            flat_weave
        ).flat();
    }
    return flat_weave.flat();
}

export class BroadcastedBox<B extends cat.Datatype, A extends cat.Axis, Op extends cat.Operator = any>
    extends cr.MorphismBox<cat.Array<B, A>, cat.Broadcasted<B, A>, A | B> {
        // The basic set up is the following:
        // BroadcastedBox
        // - Left Anchors
        // - Core
        //   - Node Box (reindexing)
        //   - Base Box (operation)
        // - Right Anchors
    get settings(): crs.BroadcastedRendererSettings<B, A> {
        return this.categoryRenderer.settings;
    }
    
    public left_anchors: cr.ProdObjectMeridian<cat.Array<B, A>, B | A>;
    public right_anchors: cr.ProdObjectMeridian<cat.Array<B, A>, B | A>;

    public left_kept_labels: boolean[];
    public right_kept_labels: boolean[];

    public left_kept_anchors: cr.ConcatMeridian<B | A>;
    public right_kept_anchors: cr.ConcatMeridian<B | A>;

    private core: rh.DiagramElement;
    private display_type: BroadcastDisplayType;
    private node_box?: cr.AnchoredBox<A | B>;
    private base_box: OperationBox<B, A, Op>;

    constructor(
        public categoryRenderer: BroadcastedRenderer<B, A>,
        public target: cat.Broadcasted<B, A, Op>,
    ) {
        super(categoryRenderer, target);
        // Setup anchors
        this.left_anchors = this.categoryRenderer.display_prod_object(
            this.target.dom());
        this.right_anchors = this.categoryRenderer.display_prod_object(
            this.target.cod());

        this.left_kept_labels = label_kept(this.left_anchors, this.target.input_weaves);
        this.right_kept_labels = label_kept(this.right_anchors, this.target.output_weaves);

        this.left_kept_anchors = new cr.ConcatMeridian(this.categoryRenderer,
            ut.mask(this.left_kept_labels, this.left_anchors.anchors));
        this.right_kept_anchors = new cr.ConcatMeridian(this.categoryRenderer,
            ut.mask(this.right_kept_labels, this.right_anchors.anchors));

        // Setup base box - Represents the underlying operation.
        this.base_box = opsRegistry.getConstructor(this.target.operator)(this.categoryRenderer, this.target);
        this.left_kept_anchors.link(this.base_box.left_anchors);
        this.base_box.right_anchors.link(this.right_kept_anchors);
        
        this.display_type = find_broadcast_display_type(this.target);
    
        // WEAVE FORM
        if (this.display_type === BroadcastDisplayType.WEAVE) {
            this.link_weaves();
            // this.base_box.transform.offset = {
            //     x: this.settings.broadcast_offset_x,
            //     y: this.settings.anchor_height * this.get_axis_midpoint()
            // };
            //this.apply_translation();
            //this.base_box.transform.positioning = {y: -0.5};
            this.aux.borderColor = 'cyan';
        }
        // NODE FORM
        else if (this.display_type === BroadcastDisplayType.NODE) {
            this.node_box = this.categoryRenderer.strideRenderer.display_category(
                this.target.reindexings[0],
                true
            );
            cr.Meridian.generic_link(
                ut.mask(
                    this.left_kept_labels.map((x)=>!x),
                    this.left_anchors.anchors),
                this.node_box.left_anchors,
            );
            cr.Meridian.generic_link(
                this.node_box.right_anchors,
                ut.mask(
                    this.right_kept_labels.map((x)=>!x),
                    this.right_anchors.anchors),
            );
            this.aux.borderColor = 'grey';
        }
        
        // Setup core
        const core_width = Math.max(
            this.base_box.dims.x, this.node_box?.dims.x ?? 0
        ) + 2 * (
            this.base_box.parent_gap ??
            this.categoryRenderer.settings.broadcast_offset_x
        );
        const height = Math.max(
            this.left_anchors.dims.y,
            this.right_anchors.dims.y
        )
        
        if (this.node_box) {
            this.core = new rh.Vertical(
                this.renderHandler, 
                [this.node_box, this.base_box]);
            this.core.width = core_width;
            this.core.height = height;
        } else {
            this.core = new rh.CoreElement(
                this.renderHandler, 
                {x: core_width, y: height}, 
                [this.base_box]
            )
        }

        this.children = [
            this.left_anchors,
            this.core,
            this.right_anchors,
        ]
             
    }
    private link_weaves(): void {
        const degree = this.target.output_weaves[0].select_degree(
            (this.right_anchors.lone_elements[0] as ArrayMeridian<B, A>).axes_anchors.anchors
        );
        for (const [input_anchors, input_weave, reindexing] of ut.zip(
            this.left_anchors.lone_elements, this.target.input_weaves, this.target.reindexings
        )) {
            const degree_out = input_weave.select_degree(
                (input_anchors as ArrayMeridian<B, A>)
                .axes_anchors.anchors);
            const mapping = tu.get_mapping(reindexing as tu.Mappable);
            degree_out.forEach((a, i) => {
                a.link(degree[mapping[i]])
            });
        }
    }
    post_placement(): void {
        this.apply_translation_update();
        super.post_placement();
    }
    update(): void {
        super.update();
    }
    protected apply_translation_update(): void {
        const kept_anchors = [
            ...this.left_kept_anchors.anchors,
            ...this.right_kept_anchors.anchors];
        const locations = kept_anchors.map(
            (a) => a.rectangle()?.getLocation({x:0, y:0.5}).y!
        );
        const avg_y = ut.sum(locations) / locations.length;
        const height = this.rectangle()?.getLocation({x:0, y:0}).y!;
        this.base_box.transform.offset = {
            x: this.base_box.parent_gap ??
            this.settings.broadcast_offset_x,
            y: avg_y - height,
        }
        this.base_box.transform.positioning = {y: -0.5};
    }
    protected get_axis_midpoint(): number {
        // const summation = this.left_kept.reduce((acc, kept, i) => 
        //     kept ? acc + i + 0.5 : acc, 0);
        // const numerator = this.left_kept.reduce((acc, kept) => 
        //     kept ? acc + 1 : acc, 0);
        const locations = ut.join(
            () => [cat.WeaveMode.TILED],
            this.target.input_weaves.map((weave) => weave._shape)
        ).flatMap((x, i) => x);
        const locations_index: [cat.Axis | cat.WeaveMode, number][] = locations.map((x, i) => ([x, i]));
        const summation = locations_index.reduce((acc, [x, i]) => 
            x instanceof cat.Axis ? acc + i + 0.5 : acc, 0);
        if (summation === 0) {
            return 0;
        }
        const numerator = locations_index.reduce((acc, [x, i]) =>
            x instanceof cat.Axis ? acc + 1 : acc, 0);
        return summation / numerator;
    }
}

@opsRegistry.registerDefaultClass
export class OperationBox<B extends cat.Datatype, A extends cat.Axis, Op extends cat.Operator = any>
    extends cr.MorphismBox<cat.Array<B, A>, cat.Broadcasted<B, A, Op>, A | B> {
    public left_anchors: cr.ProdObjectMeridian<cat.Array<B, A>, B | A>;
    public right_anchors: cr.ProdObjectMeridian<cat.Array<B, A>, B | A>;
    public core: rh.DiagramElement;
    public parent_gap?: number;
    constructor(
        public categoryRenderer: BroadcastedRenderer<B, A>,
        public target: cat.Broadcasted<B, A, Op>,
        public core_dims: pt.Point = categoryRenderer.settings.operation_core_dims,
    ) {
        super(categoryRenderer, target);
        this.left_anchors = this.categoryRenderer.display_prod_object(
            new cat.ProdObject(this.target.input_weaves.map((x)=>x.target())));
        this.right_anchors = this.categoryRenderer.display_prod_object(
            new cat.ProdObject(this.target.output_weaves.map((x)=>x.target())));
        this.core = new rh.CoreElement(
            this.renderHandler,
            this.core_dims,
        )
        this.children = [
            this.left_anchors,
            this.core,
            this.right_anchors,
        ];
        this.aux.borderColor = 'magenta';
    }
    get settings(): crs.BroadcastedRendererSettings<B, A> {
        return this.categoryRenderer.settings;
    }
}