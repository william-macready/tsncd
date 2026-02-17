import * as rh from '../Render/RenderHandler';
import * as cat from '../../data_structure/Category';
import * as fd from '../../data_structure/Term';
import {Separated} from '../../utilities/Separated';
import * as cr from './CategoryRenderer';
import * as crs from './CategoryRendererSettings';
import * as ut from '../../utilities/utilities';
import * as pt from '../../utilities/Point';
import * as nm from '../../data_structure/Numeric';

export function numeric_string(target: nm.Numeric): string | undefined {
    let name: string | undefined = undefined;
    if (target instanceof nm.Integer) {
        name = target._value.toString();
    } else if (target instanceof nm.FreeNumeric) {
        name = target.uid._name?.to_latex() || '';
    }
    return name;
}