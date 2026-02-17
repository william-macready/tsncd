import * as rh from '../Render/RenderHandler';
import * as cat from '../../data_structure/Category';
import {Separated} from '../../utilities/Separated';
import * as cr from './CategoryRenderer';
import * as crs from './CategoryRendererSettings';
import * as ut from '../../utilities/utilities';
import * as pt from '../../utilities/Point';
import * as nm from '../../data_structure/Numeric';

export class AxisAnchor<A extends cat.Axis> extends cr.Anchor<A> {
    private annotation?: rh.AnnotationElement;

    constructor(
        public categoryRenderer: cr.CategoryRenderer<A, any, A>,
        public target: A,
    ) {
        super(categoryRenderer);
        this.aux.borderColor = 'green';
    }

    public getAnnotation(): rh.AnnotationElement {
        if (!this.annotation) {
            const name = this.target._size instanceof nm.Integer ?
                this.target._size._value.toString() :
                this.target.uid._name?.to_latex() || ''; 
            this.annotation = new rh.AnnotationElement(
                this.renderHandler,
                name,
                {font_size: 0.65},
            )
        }
        return this.annotation;
    }

    public update(): void {
        super.update();
        if (!this.skip && (this.prior_terminal().length > 1 || this.next_terminal().length > 1)) {
            this.draw?.circle(
                this.rectangle().midpoint(),
                {fill: 'black', radius: 2}
            )
        }
    }
}

export class NodeAnchor<A extends cat.Axis> extends cr.Anchor<A> {
    constructor(
        public categoryRenderer: StrideRenderer<A>,
    ) {
        super(categoryRenderer);
    }
}

class StrideMorphismBox<A extends cat.Axis> extends cr.MorphismBox<A, cat.StrideMorphism<A>, A> {
    public central_node: NodeAnchor<A>;
    public annotation?: rh.AnnotationElement;
    get settings(): crs.StrideRendererSettings<A> {
        return this.categoryRenderer.settings;
    }
    constructor(
        public categoryRenderer: StrideRenderer<A>,
        public target: cat.StrideMorphism<A>,
    ){
        super(categoryRenderer, target);
        this.left_anchors = this.categoryRenderer.display_prod_object(this.target.dom());
        this.right_anchors = this.categoryRenderer.display_prod_object(this.target.cod());
        this.swap_anchors();
        this.central_node = new NodeAnchor(this.categoryRenderer);
        this.left_anchors.anchors.forEach((anchor) => anchor.link(this.central_node));
        this.right_anchors.anchors.forEach((anchor) => this.central_node.link(anchor));
        
        if (target.name) {
            this.annotation = new rh.AnnotationElement(
                this.renderHandler,
                this.target.name?.to_latex() || '',
            );
        }
        this.children = [
            this.left_anchors,
            new rh.CoreElement(this.renderHandler, {x:this.settings.reindexing_width / 2,y:0}),
            this.central_node,
            new rh.CoreElement(this.renderHandler, {x:this.settings.reindexing_width / 2,y:0}),
            this.right_anchors,
        ];
        this.aux.borderColor = 'magenta';
    }
    update(): void {
        super.update();
        const rect = this.rectangle();
        const hexagon_height = this.settings.reindexing_hexagon_y;
        const hexagon_width = this.settings.reindexing_hexagon_x;
        this.renderHandler.draw_handler?.deltaPolygon(
            [
                rect.getLocation({x: 0, y: 0.5}),
                {x: hexagon_width, y: hexagon_height},
                {x: rect.width - 2 * hexagon_width, y: 0},
                {x: hexagon_width, y: -hexagon_height},
                {x: -hexagon_width, y: -hexagon_height},
                {x: 2*hexagon_width - rect.width, y: 0},
            ],
            {fill: 'red', stroke: 'black'},
            {dropShadow: true},
        );

        if (this.annotation) {
            this.renderHandler.annotation_handler.addAnnotation(
                rect,
                this.annotation,
            );
        }
    }
}

export class StrideRenderer<A extends cat.Axis> extends cr.CategoryRenderer<A, cat.StrideMorphism<A>> {
    public settings: crs.StrideRendererSettings<A>;
    constructor(
        public renderHandler: rh.RenderHandler,
        _settings: Partial<crs.StrideRendererSettings<A>> = {},
    ) {
        super(renderHandler, _settings);
        this.settings = {
            ...crs.DefaultStrideRendererSettings,
            // @ts-ignore: ts(2855)
            ...super.settings,
        }
    }

    public display_lone(target: A): AxisAnchor<A> {
        return new AxisAnchor(this, target);
    }
    public display_prod_object(target: cat.ProdObject<A>): cr.ProdObjectMeridian<A> {
        return new cr.ProdObjectMeridian(this, target);
    }
    public display_morphism(target: cat.StrideMorphism<A>): StrideMorphismBox<A> {
        return new StrideMorphismBox(this, target);
    }
}