import * as rh from '../Render/RenderHandler';

export class HTMLEventHandler extends rh.EventHandler<HTMLElement> {
    addHover(
        target: rh.DiagramElement,
        funcIn: (...args: any[]) => void,
        funcOut: (...args: any[]) => void
    ): void {
        const element = this.renderHandler.element_to_rendered(target);
        element.addEventListener('mouseenter', funcIn);
        element.addEventListener('mouseleave', funcOut);
    }
}