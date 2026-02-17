import * as rh from '../Render/RenderHandler';
import * as pt from '../../utilities/Point';
import * as ah from '../Render/AnnotationHandler';
import * as dh from '../draw_helper/draw_helpers';
import * as html_helpers from './html_helpers';

import 'katex/dist/katex.min.css';
import katex from 'katex';
const RELATIVE: boolean = true

export function new_background(parent: HTMLElement): HTMLDivElement {
    const bg = dh.new_element('stack_annotations', parent);
    const rect = parent.getBoundingClientRect();

    bg.style.width = `${rect.width}px`;
    bg.style.height = `${rect.height}px`;
    parent.appendChild(bg);
    return bg;
}

export class HTMLAnnotationHandler extends ah.AnnotationHandler {
    private annotations: rh.AnnotationElement[] = [];
    private container?: HTMLDivElement;
    constructor(
        private renderHandler: rh.RenderHandler<HTMLElement>,
        private parent: HTMLDivElement,
    ) {
        super();
    }
    update(): void {
        if (this.container) {
            this.container.remove();
        }
        this.container = new_background(this.parent);
        console.log('updating annotations');
    }
    addAnnotation(rectangle: pt.Rectangle, annotation: rh.AnnotationElement): void {
        const element = dh.new_element('annotation_katex');
        element.style.left = `${rectangle.top_left.x}px`;
        element.style.top =  `${rectangle.top_left.y}px`;
        element.style.width =  `${rectangle.dims.x}px`;
        element.style.height = `${rectangle.dims.y}px`;
        element.style.fontSize = `${annotation.annotationSettings.font_size}em`;
        element.style.alignItems = annotation.annotationSettings.vertical_align || 'center';
        element.style.justifyContent = annotation.annotationSettings.horizontal_align || 'center';
        this.container?.appendChild(element);
        katex.render(
            annotation.latex,
            element,
            {
                throwOnError: false,
                output: 'html',
            }
        );
        this.renderHandler.diagram_rendered[annotation.diagram_id] = element;
    }
    removeAnnotation(annotation: rh.AnnotationElement): void {
        // const index = this.annotations.indexOf(annotation);
        // if (index === -1) {
        //     throw new Error("Annotation not found in handler.");
        // }
        // delete this.annotations[index];
        // this.renderHandler.remove_element(annotation);
    }
    text_rectangle(target: rh.AnnotationElement, relative: boolean = false): pt.Rectangle {
        const element = this.renderHandler.get_rendered(target);
        return html_helpers.bound_to_rect(
            element.children[0] as HTMLElement,
            this.parent
        );
    }
}