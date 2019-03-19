"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : new P(function (resolve) { resolve(result.value); }).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const path_1 = __importDefault(require("path"));
const node_cron_1 = __importDefault(require("node-cron"));
const server_1 = require("./server");
const promise_1 = __importDefault(require("simple-git/promise"));
const util_1 = require("./util");
const sb_util_ts_1 = require("sb-util-ts");
const git = promise_1.default(process.cwd());
class Runner {
    constructor() {
        this.config = {};
        this.environment = 'unspecified';
        this.workDirPath = process.cwd();
    }
    runFromConfig(config) {
        return __awaiter(this, void 0, void 0, function* () {
            if (sb_util_ts_1.mapIsEmpty(config) && sb_util_ts_1.stringIsEmpty(config)) {
                throw 'Invalid config given';
            }
            let configFileName = 'config.json';
            if (!sb_util_ts_1.stringIsEmpty(config)) {
                configFileName = config;
                this.workDirPath = configFileName.substring(0, configFileName.lastIndexOf("/"));
                this.config = yield util_1.loadJson(path_1.default.join(process.cwd(), configFileName));
            }
            else if (!sb_util_ts_1.mapIsEmpty(config)) {
                this.config = config;
            }
            else {
                throw 'Invalid config given';
            }
            if (!sb_util_ts_1.stringIsEmpty(this.config.envVar)) {
                this.environment = process.env[this.config.envVar] || this.environment;
            }
            this.initTriggers();
        });
    }
    initTriggers() {
        const triggers = this.config.trigger || {};
        if (!sb_util_ts_1.stringIsEmpty(triggers.cron)) {
            //this.runCron(<string>triggers.cron);
        }
        if (!sb_util_ts_1.mapIsEmpty(triggers.webInterface)) {
            const webInterface = triggers.webInterface;
            if (!sb_util_ts_1.arrayIsEmpty(webInterface.excludeEnvironments) && webInterface.excludeEnvironments.indexOf(this.environment) > -1) {
                return;
            }
            this.runEndpoint(webInterface.endpoint, webInterface.port);
        }
    }
    runCron(schedule) {
        Runner.cronTask = node_cron_1.default.schedule(schedule, () => {
            this.checkUpdates().then(() => {
            }).catch(err => {
                console.error(err);
            });
            console.log('hello');
        });
    }
    runEndpoint(endpointPath, port) {
        const handler = (request, response) => {
            this.checkUpdates().then(() => {
                server_1.HttpServer.sendResponse(response, 'Ok', 200);
            }).catch(err => {
                console.error(err);
                server_1.HttpServer.sendResponse(response, 'Something went wrong:\n\n' + err, 200);
            });
        };
        let routing = {};
        routing[endpointPath] = handler;
        Runner.httpServer = new server_1.HttpServer(routing, port);
    }
    validateGit() { }
    checkUpdates() {
        return __awaiter(this, void 0, void 0, function* () {
            if (sb_util_ts_1.mapIsEmpty(this.config.git)) {
                throw 'No git config given';
            }
            let gitConfig = this.config.git;
            let output = yield git.listRemote(['--heads']);
            let rows = output.split(/\r?\n/);
            let filtered = rows.filter((val) => { return val.indexOf('refs/heads/' + gitConfig.branch) > -1; });
        });
    }
}
exports.Runner = Runner;
//# sourceMappingURL=runner.js.map