import * as pt from '../../utilities/Point';
import * as rh from './RenderHandler';

export abstract class AnnotationHandler {
    constructor(
    ){}
    abstract update(): void;
    abstract addAnnotation(
        rectangle: pt.Rectangle,
        annotation: rh.AnnotationElement,
        // positioning?: pt.Point,
    ): void;
    abstract removeAnnotation(annotation: rh.AnnotationElement): void;
}