import * as rh from '../../Render/RenderHandler';
import * as cr from '../CategoryRenderer';
//import * as bm from '../BroadcastedMeridian';
import * as ut from '../../../utilities/utilities';
import * as cat from '../../../data_structure/Category';
import * as ops from '../../../data_structure/Operators';
import { Separated } from '../../../utilities/Separated';
//import * as cr from '../StandardCategoryRenderer';
import * as crs from '../CategoryRendererSettings';
import * as pt from '../../../utilities/Point';
import * as utcr from '../../../utilities/ConstructorRegistry';
import * as bb from '../BroadcastedCategoryRenderer';
import * as tu from '../../../data_structure_processing/term_utilities';

@bb.opsRegistry.registerClass(ops.Einops)
export class EinopsBox<B extends cat.Datatype, A extends cat.Axis>
    extends bb.OperationBox<B, A, ops.Einops> {
    private cups: cr.Anchor<A>[][];
    constructor(
        public categoryRenderer: bb.BroadcastedRenderer<B, A>,
        public target: cat.Broadcasted<B, A, ops.Einops>,
    ) {
        super(categoryRenderer, target);
        this.cups = this.setup_cups();
    }
    private setup_cups(): cr.Anchor<A>[][] {
        const operator = this.target.operator as ops.Einops;
        const cups = [
            ...new Set(operator.signature.flatMap((x)=>x))
        ].map((x) => [] as cr.Anchor<A>[]);
        ut.zip(
            this.left_anchors.lone_elements,
            operator.signature,
        ).forEach(
            ([segment_anchors, segment_signature]) =>
                ut.zip(
                    segment_anchors.anchors,
                    segment_signature,
                ).forEach(
                    ([anchor, sig]) => cups[sig].push(anchor)
                )
        );
        return cups;
    }
    update(): void {
        super.update();
        for (const cup of this.cups) {
            const start = cup[0].location()!;
            const end = cup[cup.length - 1].location()!;
            this.renderHandler.draw_handler?.arcCurve(
                start,
                end,
                (start.y-end.y)/2,
                false,
                {fill: 'none'}
            );
        }
    }
}
@bb.opsRegistry.registerClass(ops.SoftMax)
class SoftMaxBox<B extends cat.Datatype, A extends cat.Axis>
    extends bb.OperationBox<B, A, ops.SoftMax> {
    constructor(
        public categoryRenderer: bb.BroadcastedRenderer<B, A>,
        public target: cat.Broadcasted<B, A, ops.SoftMax>,
    ) {
        super(
            categoryRenderer, 
            target, 
            categoryRenderer.settings.operation_softmax_dims);
    }
    update(): void {
        super.update();
        const rectangle: pt.Rectangle = this.rectangle();
        this.renderHandler.draw_handler?.deltaPolygon(
            [this.rectangle().getLocation({x:0,y:0.5}),
                {x:rectangle.width, y:rectangle.height*2/3},
                {x:0, y: -rectangle.height*4/3}
            ],
            {fill: 'white'},
            {dropShadow: true}
        );
    }
}
@bb.opsRegistry.registerClass(ops.Linear)
class LinearBox<B extends cat.Datatype, A extends cat.Axis>    
    extends bb.OperationBox<B, A, ops.Linear> {
    private annotation: rh.AnnotationElement;
    constructor(
        public categoryRenderer: bb.BroadcastedRenderer<B, A>,
        public target: cat.Broadcasted<B, A, ops.Linear>,
    ) {
        const width = 40;// + target.operator.name.length * 5;
        super(categoryRenderer, target, {x: width, y: 30});
        this.annotation = new rh.AnnotationElement(
            this.renderHandler,
            target.operator.name?.to_latex() ?? 'L',
            {font_size: 1.2},
        );
    }
    update(): void {
        super.update();
        const rect = this.rectangle();
        const biteSize = this.settings.operation_multilinear_bite;
        this.renderHandler.draw_handler?.deltaPolygon(
            [rect.top_left,
            {x:rect.dims.x, y: 0},
            {x:0, y:rect.dims.y},
            {x:-rect.dims.x+biteSize, y:0},
            {x:-biteSize, y:-biteSize}],
            {fill: '#E8EEEB', stroke: 'none'},
            {dropShadow: true}
        );
        this.renderHandler.annotation_handler.addAnnotation(
            rect,
            this.annotation,
        )
    }
}

@bb.opsRegistry.registerClass(ops.Identity)
class IdentityBox<B extends cat.Datatype, A extends cat.Axis>
    extends bb.OperationBox<B, A, ops.Identity> {
    constructor(
        public categoryRenderer: bb.BroadcastedRenderer<B, A>,
        public target: cat.Broadcasted<B, A, ops.Identity>,
    ) {
        super(categoryRenderer, target, {x: 0, y: 0});
    }
}

@bb.opsRegistry.registerClass(ops.AdditionOp)
class AdditionOpBox<B extends cat.Datatype, A extends cat.Axis>
    extends bb.OperationBox<B, A, ops.AdditionOp> {
    public annotation: rh.AnnotationElement;
    constructor(
        public categoryRenderer: bb.BroadcastedRenderer<B, A>,
        public target: cat.Broadcasted<B, A, ops.AdditionOp>,
    ) {
        super(categoryRenderer, target, {
            x: 30, y: 30
        });
        this.annotation = new rh.AnnotationElement(
            this.renderHandler,
            `\\pmb{${target.operator.name?.to_latex() ?? '+'}}`,
            {
                font_size: 1.2,
                horizontal_align: 'left',
            },
        );
    }
    update(): void {
        super.update();
        const rect = this.rectangle();
        this.renderHandler.annotation_handler.addAnnotation(
            rect,
            this.annotation,
        )
    }
}

@bb.opsRegistry.registerClass(ops.Elementwise)
class ElementwiseBox<B extends cat.Datatype, A extends cat.Axis>
    extends bb.OperationBox<B, A, ops.Elementwise> {
    public annotation: rh.AnnotationElement;
    constructor(
        public categoryRenderer: bb.BroadcastedRenderer<B, A>,
        public target: cat.Broadcasted<B, A, ops.Elementwise>,
    ) {
        super(categoryRenderer, target, {
            x: 30, y: 10
        });
        this.parent_gap = 0;
        this.aux.borderColor = '#E8EEEB';
        this.annotation = new rh.AnnotationElement(
            this.renderHandler,
            `${target.operator.name?.to_latex()}`
        );
    }
    update(): void {
        super.update();
        const rect = this.rectangle();
        this.annotation.place(rect);
        const top_left = {
            x: this.annotation.text_rectangle().left - 10,
            y: this.rectangle().top_left.y,
        }
        const top_right = {
            x: this.annotation.text_rectangle().right,
            y: this.rectangle().top_left.y,
        }
        const triangle = [
            {x: 10, y: 5},
            {x: -10, y: 5},
            {x: 3, y: -5}
        ]
        this.draw?.deltaPolygon(
            [top_left, ...triangle],
            {fill: 'black', stroke: 'none'}
        );
        this.draw?.deltaPolygon(
            [top_right, ...triangle],
            {fill: 'black', stroke: 'none'}
        );
    }
}

@bb.opsRegistry.registerClass(ops.Normalize)
class NormalizeBox<B extends cat.Datatype, A extends cat.Axis>
    extends bb.OperationBox<B, A, ops.Normalize> {
    constructor(
        public categoryRenderer: bb.BroadcastedRenderer<B, A>,
        public target: cat.Broadcasted<B, A, ops.Normalize>,
    ) {
        super(categoryRenderer, target);
    }
    update(): void {
        super.update();
        const rect = this.rectangle();
        this.draw?.circle(
            rect.midpoint(),
            {radius: rect.height/2, 'stroke-width': '2', fill: '#F1FCFC'},
            {dropShadow: true}
        );
        this.draw?.polyline(
            rect.getLocations(
                [
                    {x: 0.1, y: 0.2},
                    {x: 0.5, y: 1},
                    {x: 0.9, y: 0.2}
                ]
            ),
            {stroke: 'black', 'stroke-width': '1'},
            'main',
        );
    }
}

@bb.opsRegistry.registerClass(ops.WeightedTriangularLower)
class WeightedTriangularLowerBox<B extends cat.Datatype, A extends cat.Axis>
    extends bb.OperationBox<B, A, ops.WeightedTriangularLower> {
    constructor(
        public categoryRenderer: bb.BroadcastedRenderer<B, A>,
        public target: cat.Broadcasted<B, A, ops.WeightedTriangularLower>,
    ) {
        super(categoryRenderer, target);
    }
    update(): void {
        super.update();
        const rect = this.rectangle();
        const gap = rect.height - rect.width;
        const core_rect = new pt.Rectangle(
            {x: rect.left, y: rect.top + gap * 0.5},
            {x: rect.width, y: rect.width}
        );
        this.draw?.drawRectangle(
            core_rect,
            {fill: '#F9CBDF', stroke: 'none'},
            {dropShadow: true}
        );
        this.draw?.deltaPolygon(
            [core_rect.top_left,
            {x: core_rect.width, y: 0},
            {x: 0, y: core_rect.height}],
            {fill: '#808080', stroke: 'none'},
        );
        this.draw?.drawRectangle(
            core_rect,
            {fill: 'none', stroke: 'black', 'stroke-width': '1'},
        );

    }
}

@bb.opsRegistry.registerClass(ops.Embedding)
class EmbeddingBox<B extends cat.Datatype, A extends cat.Axis>
    extends bb.OperationBox<B, A, ops.Embedding> {
    private annotation: rh.AnnotationElement;
    constructor(
        public categoryRenderer: bb.BroadcastedRenderer<B, A>,
        public target: cat.Broadcasted<B, A, ops.Embedding>,
    ) {
        super(categoryRenderer, target, {x: 30, y: 30});
        this.annotation = new rh.AnnotationElement(
            this.renderHandler,
            target.operator.name?.to_latex() ?? 'L',
            {font_size: 1.2},
        );
    }
    update(): void {
        super.update();
        const rect = this.rectangle();
        const biteSize = this.settings.operation_multilinear_bite;
        this.renderHandler.draw_handler?.deltaPolygon(
            [rect.top_left,
            {x:rect.dims.x, y: 0},
            {x:0, y:rect.dims.y},
            {x:-rect.dims.x+biteSize, y:0},
            {x:-biteSize, y:-biteSize}],
            {fill: '#E8EEEB', stroke: 'none'},
            {dropShadow: true}
        );
        this.renderHandler.annotation_handler.addAnnotation(
            rect,
            this.annotation,
        )
    }
}