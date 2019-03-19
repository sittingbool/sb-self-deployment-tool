import * as http from 'http';
import {IncomingMessage, Server, ServerResponse} from "http";
import * as url from 'url';

export type EndPointHandler = (request: IncomingMessage, response: ServerResponse) => void;
export interface HttpRouting {[path: string]: EndPointHandler}

export class HttpServer {
    private server: Server;

    constructor(private endpoints: HttpRouting = {}, private port: number = 3000) {
        this.server = http.createServer(this.handle.bind(this));
        this.server.listen(this.port);
    }

    handle(request: IncomingMessage, response: ServerResponse) {
        const parts = url.parse(request.url || '');
        const route = this.endpoints[parts.pathname || ''];

        if (route) {
            route(request, response);
        } else {
            HttpServer.sendResponse(response, "Not found", 404);
        }
    }

    public static sendResponse(response: ServerResponse, data: string, statusCode: number, headers?: string) {
        response.writeHead(statusCode, headers);
        response.end(data);
    }
}
