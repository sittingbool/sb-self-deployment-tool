import { IncomingMessage, ServerResponse } from "http";
export declare type EndPointHandler = (request: IncomingMessage, response: ServerResponse) => void;
export interface HttpRouting {
    [path: string]: EndPointHandler;
}
export declare class HttpServer {
    private endpoints;
    private port;
    private server;
    constructor(endpoints?: HttpRouting, port?: number);
    handle(request: IncomingMessage, response: ServerResponse): void;
    static sendResponse(response: ServerResponse, data: string, statusCode: number, headers?: string): void;
}
