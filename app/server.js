"use strict";
var __importStar = (this && this.__importStar) || function (mod) {
    if (mod && mod.__esModule) return mod;
    var result = {};
    if (mod != null) for (var k in mod) if (Object.hasOwnProperty.call(mod, k)) result[k] = mod[k];
    result["default"] = mod;
    return result;
};
Object.defineProperty(exports, "__esModule", { value: true });
const http = __importStar(require("http"));
const url = __importStar(require("url"));
class HttpServer {
    constructor(endpoints = {}, port = 3000) {
        this.endpoints = endpoints;
        this.port = port;
        this.server = http.createServer(this.handle.bind(this));
        this.server.listen(this.port);
    }
    handle(request, response) {
        const parts = url.parse(request.url || '');
        const route = this.endpoints[parts.pathname || ''];
        if (route) {
            route(request, response);
        }
        else {
            HttpServer.sendResponse(response, "Not found", 404);
        }
    }
    static sendResponse(response, data, statusCode, headers) {
        response.writeHead(statusCode, headers);
        response.end(data);
    }
}
exports.HttpServer = HttpServer;
//# sourceMappingURL=server.js.map