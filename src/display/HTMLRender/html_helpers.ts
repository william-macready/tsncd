
import * as pt from '../../utilities/Point';

export function bound_to_rect(
    target:    HTMLElement,
    relative?: HTMLElement): pt.Rectangle {
    const rect = target.getBoundingClientRect();
    const absolute_rect = new pt.Rectangle(
        new pt.Point(rect.left, rect.top),
        new pt.Point(rect.width, rect.height)
    )
    if (!relative) {
        return absolute_rect;
    }
    return absolute_rect.relative(
        bound_to_rect(relative).top_left
    );
}