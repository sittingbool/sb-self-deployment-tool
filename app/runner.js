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
var __importStar = (this && this.__importStar) || function (mod) {
    if (mod && mod.__esModule) return mod;
    var result = {};
    if (mod != null) for (var k in mod) if (Object.hasOwnProperty.call(mod, k)) result[k] = mod[k];
    result["default"] = mod;
    return result;
};
Object.defineProperty(exports, "__esModule", { value: true });
const path_1 = __importDefault(require("path"));
const childProcess = __importStar(require("child_process"));
const node_cron_1 = __importDefault(require("node-cron"));
const server_1 = require("./server");
const promise_1 = __importDefault(require("simple-git/promise"));
const util_1 = require("./util");
const sb_util_ts_1 = require("sb-util-ts");
const nodemailer = __importStar(require("nodemailer"));
const git = promise_1.default(process.cwd());
const defaultTransport = {
    host: "smtp.ethereal.email",
    port: 587,
    secure: false,
    auth: {
        user: 'account.user',
        pass: 'account.pass' // generated ethereal password
    }
};
class Runner {
    constructor() {
        this.config = {};
        this.environment = 'unspecified';
        this.workDirPath = process.cwd();
        this.mailTransport = nodemailer.createTransport(defaultTransport);
        this.usingMNonConfigMailTransport = false;
    }
    setupMailTransport(transport) {
        if (this.usingMNonConfigMailTransport && sb_util_ts_1.mapIsEmpty(transport)) {
            return;
        }
        if (sb_util_ts_1.mapIsEmpty(this.config.email)) {
            return console.error('No email config given to send result');
        }
        if (transport) {
            this.usingMNonConfigMailTransport = true;
        }
        let emailConfig = this.config.email;
        transport = transport || emailConfig.transport;
        this.mailTransport = nodemailer.createTransport(transport);
    }
    runFromConfig(config) {
        return __awaiter(this, void 0, void 0, function* () {
            if (sb_util_ts_1.mapIsEmpty(config) && sb_util_ts_1.stringIsEmpty(config)) {
                console.error('Invalid config given');
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
                console.error('Invalid config given');
            }
            this.setupMailTransport();
            if (!sb_util_ts_1.stringIsEmpty(this.config.envVar)) {
                this.environment = process.env[this.config.envVar] || this.environment;
            }
            if (!sb_util_ts_1.stringIsEmpty(this.config.workDir)) {
                this.workDirPath = path_1.default.join(this.workDirPath, this.config.workDir);
            }
            const absolutePath = path_1.default.isAbsolute(this.workDirPath) ? this.workDirPath : path_1.default.join(process.cwd(), this.workDirPath);
            console.log((new Date()) + ': Started auto deploy runner for directory: ' + absolutePath);
            try {
                yield this.initRunner();
            }
            catch (e) {
                this.sendErrorMail(e);
            }
        });
    }
    initRunner() {
        return __awaiter(this, void 0, void 0, function* () {
            yield this.validateGit();
            this.initTriggers();
            let gitConfig = this.config.git;
            console.log((new Date()) + `: Initialized auto deploy runner for branch: ${gitConfig.branch} in repository ${gitConfig.repository} using environment: ${this.environment}`);
        });
    }
    initTriggers() {
        const triggers = this.config.trigger || {};
        if (!sb_util_ts_1.stringIsEmpty(triggers.cron)) {
            this.runCron(triggers.cron);
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
            console.log(new Date() + ': Running from cron trigger');
            this.checkUpdates().catch(err => {
                console.error(err);
                this.sendErrorMail(err);
            });
        });
    }
    runEndpoint(endpointPath, port) {
        const handler = (request, response) => {
            console.log(new Date() + ': Running from http trigger');
            this.checkUpdates().then(() => {
                server_1.HttpServer.sendResponse(response, 'Ok', 200);
            }).catch(err => {
                console.error(err);
                this.sendErrorMail(err);
                server_1.HttpServer.sendResponse(response, 'Something went wrong:\n\n' + err, 200);
            });
        };
        let routing = {};
        routing[endpointPath] = handler;
        Runner.httpServer = new server_1.HttpServer(routing, port);
    }
    validateGit() {
        return __awaiter(this, void 0, void 0, function* () {
            if (sb_util_ts_1.mapIsEmpty(this.config.git)) {
                throw 'No git config given';
            }
            let result = yield git.remote(['show', 'origin']);
            let gitConfig = this.config.git;
            if (result.indexOf(`Fetch URL: ${gitConfig.repository}`) < 0) {
                throw 'This is not the proclaimed repository: ' + gitConfig.repository + '. Please check again using command: git remote show origin.';
            }
        });
    }
    checkUpdates() {
        return __awaiter(this, void 0, void 0, function* () {
            if (sb_util_ts_1.mapIsEmpty(this.config.git)) {
                throw 'No git config given';
            }
            let gitConfig = this.config.git;
            console.log((new Date()) + ': Checking for changes on branch ' + gitConfig.branch);
            yield git.updateServerInfo();
            yield git.checkout(gitConfig.branch);
            let current = yield git.revparse(['HEAD']);
            current = current.trim();
            let output = yield git.listRemote(['--heads']);
            let rows = output.split(/\r?\n/);
            let filtered = rows.filter((val) => { return val.indexOf('refs/heads/' + gitConfig.branch) > -1; });
            if (sb_util_ts_1.arrayIsEmpty(filtered))
                throw 'Could not find remote changes for ' + gitConfig.branch;
            if (filtered.length > 1)
                throw 'Conflict: found multiple remote changes for ' + gitConfig.branch;
            let remote = filtered[0].replace('refs/heads/' + gitConfig.branch, '').trim();
            if (current === remote) {
                return console.log((new Date()) + ': No changes on branch ' + gitConfig.branch);
            }
            yield this.performDeployment(gitConfig.branch);
        });
    }
    performDeployment(branchName) {
        return __awaiter(this, void 0, void 0, function* () {
            console.log((new Date()) + ': Found changes on branch ' + branchName + ', performing deployment');
            console.log((new Date()) + ': Pulling branch ' + branchName + ', performing deployment');
            yield git.pull();
            console.log((new Date()) + ': Successfully pulled branch ' + branchName);
            if (!sb_util_ts_1.stringIsEmpty(this.config.buildCmd)) {
                console.log((new Date()) + ': Running build command ' + this.config.buildCmd);
                yield this.runOnShell(this.config.buildCmd);
            }
            if (!sb_util_ts_1.stringIsEmpty(this.config.deployCmd)) {
                console.log((new Date()) + ': Running deploy command ' + this.config.deployCmd);
                yield this.runOnShell(this.config.deployCmd);
            }
            this.sendSuccessMail();
            console.log((new Date()) + ': Done deploying for ' + branchName);
        });
    }
    runOnShell(cmd) {
        return __awaiter(this, void 0, void 0, function* () {
            return new Promise((resolve, reject) => {
                childProcess.exec(cmd, (error, stdout, stderr) => {
                    if (error) {
                        return reject(error.message);
                    }
                    if (!sb_util_ts_1.stringIsEmpty(stderr)) {
                        return reject(stderr);
                    }
                    if (!sb_util_ts_1.stringIsEmpty(stdout)) {
                        console.log(stdout);
                    }
                    resolve(stdout);
                });
            });
        });
    }
    sendSuccessMail() {
        const gitConfig = this.config.git || { repository: 'unknown', branch: 'unknown' };
        const repository = gitConfig.repository || 'unknown';
        const branch = gitConfig.branch || 'unknown';
        const msg = 'For\n' +
            `Repository: ${repository}\n` +
            `Branch: ${branch}\n` +
            '\n\nThe deployment succeeded at ' + new Date();
        let subject = 'Successful auto deployment on environment: ' + this.environment;
        this.sendMail({ subject: subject, text: msg });
    }
    sendErrorMail(error) {
        let msg = 'unknown or not parsable Error';
        if (typeof error === 'object') {
            try {
                msg = error.hasOwnProperty('message') ? error.message : JSON.stringify(error);
            }
            catch (e) {
                console.error(e);
            }
        }
        const gitConfig = this.config.git || { repository: 'unknown', branch: 'unknown' };
        const repository = gitConfig.repository || 'unknown';
        const branch = gitConfig.branch || 'unknown';
        msg = 'For\n' +
            `Repository: ${repository}\n` +
            `Branch: ${branch}\n` +
            '\n\nThe following error occurred:\n\n' +
            msg;
        let subject = 'Error on auto deployment on environment: ' + this.environment;
        this.sendMail({ subject: subject, text: msg });
    }
    sendMail(data) {
        if (sb_util_ts_1.mapIsEmpty(this.config.email)) {
            return console.error('No email config given to send result');
        }
        let emailConfig = this.config.email;
        const msg = Object.assign({
            to: emailConfig.recipients.join(', '),
            from: emailConfig.sender
        }, data);
        this.mailTransport.sendMail(msg)
            .then(() => { console.log('-- email sent --'); })
            .catch(console.error);
    }
}
exports.Runner = Runner;
//# sourceMappingURL=runner.js.map