import * as dt_json from './json';
import * as rh from '../display/Render/RenderHandler';
import * as cat from '../data_structure/Category';
import * as bb from '../display/Framework/BroadcastedCategoryRenderer';

const HandshakeMessage = {
    msgType: 'identify',
    clientType: 'DiagramClient',
    clientVersion: `ts_client_001`,
    clientID: `${Math.random().toString(36).substring(2, 6)}`,
}

export class StdRenderUpdate {
  constructor(
    private broadcast_renderer: bb.BroadcastedRenderer<any, any>,
    private render_handler: rh.RenderHandler
  ) {}

  termPass(term: cat.BroadcastedCategory<any, any>): void {
    this.render_handler.wipe();
    const diagram_element = this.broadcast_renderer.display_category(term);
    this.render_handler.add_child(diagram_element);
    this.render_handler.update();
  }
}

export class WebSocketClient {
  private socket: WebSocket;

  constructor(
    url: string,
    // broadcast_renderer: bb.BroadcastedRenderer<any, any>,
    // render_handler: rh.RenderHandler,
    private termPass: (term: cat.BroadcastedCategory<any, any>) => void,
  ) {
    this.socket = new WebSocket(url);

    this.socket.onopen = () => {
      console.log('Connected');
      this.send(JSON.stringify(HandshakeMessage));
    };

    this.socket.onmessage = async (event: MessageEvent) => {
      console.log('Received:', JSON.parse(event.data));
      const data = JSON.parse(event.data);
      console.log(data['msgType']);
      if (data['msgType'] === 'dataUpdate') {
        // render_handler.wipe();
        const term = await dt_json.TermJSONConverter.import(
          JSON.parse(data['data']));
        this.termPass(term as cat.BroadcastedCategory<any, any>);
        // const diagram_element = broadcast_renderer.display_category(term);
        // render_handler.add_child(diagram_element);
        // render_handler.update();
      }
    };

    this.socket.onclose = (event: CloseEvent) => {
      console.log('Disconnected', event.code, event.reason);
    };

    this.socket.onerror = (error: Event) => {
      console.error('Error:', error);
    };
  }

  send(message: string): void {
    if (this.socket.readyState === WebSocket.OPEN) {
      this.socket.send(message);
    }
  }

  close(): void {
    this.socket.close();
  }
}

//export const client = new WebSocketClient('ws://localhost:8765');