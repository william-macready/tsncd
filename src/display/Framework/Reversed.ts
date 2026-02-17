import * as rh from '../Render/RenderHandler';
import * as cat from '../../data_structure/Category';
import * as ut from '../../utilities/utilities';
import * as dhd from '../Render/DrawHandler';
import * as crs from './CategoryRendererSettings';
import * as cr from './CategoryRenderer';



export class ReversedAnchoredBox<A> extends cr.AnchoredBox<A> {
    constructor(
        public target: cr.AnchoredBox<A>,
    ) {
        super(target.renderHandler);
        this.left_anchors = target.right_anchors;
        this.right_anchors = target.left_anchors;
    }
}