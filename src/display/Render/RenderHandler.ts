import * as pt from '../../utilities/Point';
import {DrawHandler} from "../Render/DrawHandler";
import { TransformHandler } from './TransformHandler';
import * as rhs from './RenderHandlerSettings';
import * as ah from './AnnotationHandler';

export type DiagramID = string;
export function fresh_uid(): DiagramID {
    return 'uid_' + Math.random().toString(36);
}

export abstract class DiagramElement {
    public diagram_id: DiagramID = fresh_uid();
    public transform: TransformHandler = new TransformHandler(this);
    public width: number | undefined;
    public height: number | undefined;
    public children: DiagramElement[] = [];
    constructor(
        public renderHandler: RenderHandler,
    ) {
        this.renderHandler.diagram_elements[this.diagram_id] = this;
    }
    post_placement(): void {
        this.children.forEach((child) => child.post_placement());
    }
    update(): void {
        this.children.forEach((child) => child.update());
    }
    rectangle(): pt.Rectangle {
        return this.renderHandler.rectangle(this);
    }
    location(): pt.Point | undefined {
        return this.renderHandler.location(this);
    }
    set_transform(): void {
        return this.renderHandler.set_transform(this);
    }
    remove_reference(): void {
        if (this.diagram_id in this.renderHandler.diagram_rendered) {
            throw new Error("Cannot remove reference to diagram element that is still rendered.");
        }
        this.children.forEach((child) => child.remove_reference());
        delete this.renderHandler.diagram_elements[this.diagram_id];
    }
    get dims(): pt.Point {
        const child_points = this.children.map((child) => child.dims);
        return {
            x: this.width ?? child_points.reduce((acc, chp) => acc + chp.x, 0),
            y: this.height ?? Math.max(0, ...child_points.map((chp) => chp.y))
        }
    }
    public aux: {borderColor?: string} = {};
    get draw(): DrawHandler<any> | undefined {
        return this.renderHandler.draw_handler;
    }
}

export class Vertical extends DiagramElement {
    constructor(
        public renderHandler: RenderHandler,
        public children: DiagramElement[],
    ) {
        super(renderHandler);
        this.children = children;
    }
    get dims(): pt.Point {
        const child_points = this.children.map((child) => child.dims);
        return {
            x: this.width ?? Math.max(0, ...child_points.map((chp) => chp.x)),
            y: this.height ?? child_points.reduce((acc, chp) => acc + chp.y, 0),
        }
    }
}

export class CoreElement extends DiagramElement {
    constructor(
        public renderHandler: RenderHandler,
        public _dims: Partial<pt.Point>,
        public children: DiagramElement[] = [],
    ) {
        super(renderHandler);
        this.width = _dims.x;
        this.height = _dims.y;
        this.children = children;
    }
}

// TODO:
// AnnotationElement renders in a unique way.
// It is not rendered as a Child.
// Rather, it is instructions for an update.
// Therefore, EventHandlers etc need to treat it in
// a unique manner.
// Nonetheless, as it is a rendered element,
// the DiagramElement class makes sense.
export interface AnnotationElementSettings {
    font_size: number;
    vertical_align: 'start' | 'center' | 'end';
    horizontal_align: 'left' | 'center' | 'right';
}

const defaultAnnotationSettings: AnnotationElementSettings = {
    font_size: 1,
    vertical_align: 'center',
    horizontal_align: 'center',
};

export class AnnotationElement extends DiagramElement {
    public annotationSettings: AnnotationElementSettings;
    constructor(
        public renderHandler: RenderHandler,
        public latex: string,
        _annotationSettings: Partial<AnnotationElementSettings> 
            = {},
    ) {
        super(renderHandler);
        this.annotationSettings = {
            ...defaultAnnotationSettings,
            ..._annotationSettings,
        }
    }
    text_rectangle(): pt.Rectangle {
        return this.renderHandler.text_rectangle(this);
    }
    place(rect: pt.Rectangle): void {
        this.renderHandler.remove_element(this);
        this.renderHandler.annotation_handler.addAnnotation(
            rect,
            this
        );
    }
    // update(): void {
    //     this.renderHandler.addAnnotation(this);
    // }
}

export abstract class RenderHandler<T=any> {
    public diagram_elements: Record<DiagramID, DiagramElement> = {};
    public diagram_rendered: Record<DiagramID, T> = {};
    public primary_children: DiagramElement[] = [];
    public draw_handler?: DrawHandler<T>;
    public event_handler?: EventHandler<T>;
    public abstract annotation_handler: ah.AnnotationHandler;
    public settings: rhs.RenderHandlerSettings = rhs.defaultRenderHandlerSettings;

    public element_to_rendered(target: DiagramElement): T {
        if (target.diagram_id in this.diagram_rendered) {
            return this.diagram_rendered[target.diagram_id];
        }
        return this._element_to_rendered(target);
    }

    protected abstract _element_to_rendered(target: DiagramElement): T;

    public abstract remove_element(target: DiagramElement): void;

    public get_rendered(target: DiagramElement): T {
        if (!(target.diagram_id in this.diagram_rendered)) {
            throw new Error("Target diagram element has not been rendered yet.");
        }
        return this.diagram_rendered[target.diagram_id];
    }

    public abstract location(target: DiagramElement): pt.Point | undefined;

    public abstract text_rectangle(target: AnnotationElement, relative?: boolean): pt.Rectangle;

    public abstract rectangle(target: DiagramElement, relative?: boolean): pt.Rectangle;

    public abstract set_transform(target: DiagramElement): void;

    public post_placement(): void {
        this.primary_children.forEach((child) => child.post_placement());
    }

    public update(): void {
        this.annotation_handler.update();
        this.draw_handler?.update();
        this.primary_children.forEach((child) => child.update());
    }

    public add_child(target: DiagramElement): void {
        this.primary_children.push(target);
        this._add_child(target);
    }
    protected abstract _add_child(target: DiagramElement): void;

    protected abstract applyAux(target: DiagramElement): void;

    public abstract wipe(): void
}

export abstract class EventHandler<T> {
    constructor(
        public renderHandler: RenderHandler<T>,
    ) {
        renderHandler.event_handler = this;
    }
}