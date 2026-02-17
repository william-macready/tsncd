import * as cat from './data_structure/Category';
import * as transfer from './data_transfer/json';
import * as basic_text from './display/basic_text';

import * as html_render from './display/HTMLRender/HTMLRenderHandler';
import * as broadcasted_box from './display/Framework/BroadcastedCategoryRenderer';
import * as addops from './display/Framework/Operations/additionalOperationBoxes';

import * as wst from './data_transfer/websockets_transfer';
import * as mlc from './display/Framework/Multiline';
console.log(addops);
class DiagramContainer {
}

// export class StdRenderUpdate {
//   constructor(
//     private broadcast_renderer: bb.BroadcastedRenderer<any, any>,
//     private render_handler: rh.RenderHandler
//   ) {}

//   termPass(term: cat.BroadcastedCategory<any, any>): void {
//     this.render_handler.wipe();
//     const diagram_element = this.broadcast_renderer.display_category(term);
//     this.render_handler.add_child(diagram_element);
//     this.render_handler.post_placement();
//     this.render_handler.update();
//   }
// }

document.addEventListener('DOMContentLoaded', async () => {
    cat.establish();
    // Additional initialization code can go here
    const json_term = await transfer.TermJSONConverter.import_from_file('/json_files/output.json');
    // Get the text layout
    console.log(basic_text.string_export_rows(json_term).join('\n'));

    const container = document.getElementById('diagram') as HTMLElement;
    const html_renderer = new html_render.HTMLRenderHandler(container);

    const bc_renderer = new broadcasted_box.BroadcastedRenderer(html_renderer);

    function termPass(term: cat.BroadcastedCategory<any, any>): void {
        html_renderer.wipe();
        const diagram_element = new mlc.MultilineComposedBox(
            bc_renderer,
            term,
            600,
        );
        html_renderer.add_child(diagram_element);
        html_renderer.post_placement();
        html_renderer.update();
    }

    termPass(json_term);

    const client = new wst.WebSocketClient(
        'ws://localhost:8765',
        termPass,
    );
    console.log(client);
});