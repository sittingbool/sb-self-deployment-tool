import path from 'path';
import * as childProcess from 'child_process';
import cron, {ScheduledTask} from 'node-cron';
import {EndPointHandler, HttpRouting, HttpServer} from "./server";
import simplegit from 'simple-git/promise';
import {boolConfigFromEnv, floatConfigFromEnv, intConfigFromEnv, loadJson, stringConfigFromEnv} from "./util";
import {arrayIsEmpty, mapIsEmpty, stringIsEmpty} from "sb-util-ts";
import {ExecException} from "child_process";
import * as nodemailer from 'nodemailer';

let git = simplegit(process.cwd());
const defaultTransport = {
    host: "smtp.ethereal.email",
    port: 587,
    secure: false, // true for 465, false for other ports
    auth: {
        user: 'account.user', // generated ethereal user
        pass: 'account.pass' // generated ethereal password
    }
};

const ConfigParamTypes: {[key: string]: string} =
    {
        workDir: 'string', git: 'config', trigger: 'config', email: 'config', envVar: 'string',
        buildCmd: 'string', deployCmd: 'string', successCmd: 'string', errorCmd: 'string',
        repository: 'string', branch: 'string', sender: 'string', recipients: 'string-array',
        transport: 'config', host: 'string', port: 'int', secure: 'boolean', auth: 'config',
        user: 'string', pass: 'string', cron: 'string', webInterface: 'config', endpoint: 'config',
        excludeEnvironments: 'string-array'
    };

export interface RunnerConfig {
    workDir?: string;
    git?: GitConfig;
    trigger?: TriggerConfig;
    email?: EmailConfig;
    envVar?: string;
    buildCmd?: string;
    deployCmd?: string;
    successCmd?: string;
    errorCmd?: string;
}

export interface GitConfig {
    repository: string;
    branch: string;
}

export interface EmailConfig {
    sender: string;
    recipients: string[];
    transport?: nodemailer.Transport;
}

export interface TriggerConfig {
    cron?: string;
    webInterface?: WebInterfaceConfig;
}

export interface WebInterfaceConfig {
    port?: number;
    endpoint: string;
    excludeEnvironments: string[];
}

// if dirPath is absolute then it will be returned otherwise it will be the relative path combined with baseDir
function absoluteOrRelativePath(baseDir: string, dirPath: string): string {
    return path.isAbsolute(dirPath) ? dirPath : path.join(baseDir, dirPath);
}

function undiscloseBasicAuth(value: string): string {
    return value.replace(/[\w\d]+:[\w\d]+@/ig, '<undisclosed-credentials>@');
}

export class Runner {

    protected static cronTask: ScheduledTask;
    protected static httpServer: HttpServer;
    protected config: RunnerConfig = {};
    protected environment: string = 'unspecified';
    protected workDirPath: string = process.cwd();
    protected mailTransport: nodemailer.Transporter = nodemailer.createTransport(defaultTransport);
    protected usingMNonConfigMailTransport: boolean = false;

    setupMailTransport(transport?: nodemailer.Transport) {
        if (this.usingMNonConfigMailTransport && mapIsEmpty(transport)) {
            return;
        }
        if (mapIsEmpty(this.config.email)) {
            return console.error('No email config given to send result');
        }
        if (transport) {
            this.usingMNonConfigMailTransport = true;
        }
        let emailConfig = <EmailConfig>this.config.email;
        transport = transport || emailConfig.transport;
        this.mailTransport = nodemailer.createTransport(transport);
    }

    async runFromConfig(config: string | RunnerConfig) {
        console.log((new Date()) + ': Running from cwd: ' + process.cwd());
        if (mapIsEmpty(config) && stringIsEmpty(<string>config)) {
            console.error('Invalid config given');
        }
        let configFileName: string = 'config.json';
        if (!stringIsEmpty(<string>config)) {
            configFileName = <string>config;
            console.log((new Date()) + ': Running with given config path: ' + configFileName);
            this.workDirPath = configFileName.substring(0, configFileName.lastIndexOf("/"));
            let configPath = absoluteOrRelativePath(process.cwd(), configFileName);
            console.log((new Date()) + ': Loading config from ' + configPath);
            this.config = await loadJson(configPath);
        } else if (!mapIsEmpty(config)) {
            this.config = <RunnerConfig>config;
        } else {
            console.error('Invalid config given');
        }
        this.replaceConfigByEnvVars();
        this.setupMailTransport();
        if (!stringIsEmpty(this.config.envVar)) {
            this.environment = process.env[<string>this.config.envVar] || this.environment;
        }
        if (!stringIsEmpty(this.config.workDir)) {
            this.workDirPath = path.join(this.workDirPath, <string>this.config.workDir);
        }
        const absolutePath = absoluteOrRelativePath(process.cwd(), this.workDirPath);
        console.log((new Date()) + ': Started auto deploy runner for working directory: ' + absolutePath);
        git = simplegit(absolutePath);
        try {
            await this.initRunner();
            this.sendStartedMail();
        } catch (e) {
            this.sendErrorMail(e);
        }
    }

    private async initRunner() {
        await this.validateGit();
        this.initTriggers();
        let gitConfig = <GitConfig>this.config.git;
        console.log((new Date()) + `: Initialized auto deploy runner for branch: ${gitConfig.branch} in repository ${gitConfig.repository} using environment: ${this.environment}`);
    }

    private initTriggers() {
        const triggers: TriggerConfig = this.config.trigger || {};
        if (!stringIsEmpty(triggers.cron)) {
            this.runCron(<string>triggers.cron);
        }
        if (!mapIsEmpty(triggers.webInterface)) {
            const webInterface: WebInterfaceConfig = <WebInterfaceConfig>triggers.webInterface;
            if (!arrayIsEmpty(webInterface.excludeEnvironments) && webInterface.excludeEnvironments.indexOf(this.environment) > -1) {
                return;
            }
            this.runEndpoint(webInterface.endpoint, webInterface.port);
        }
    }

    protected replaceConfigByEnvVars(input?: any): any {
        let config: any = input || this.config;
        for(const key in config) {
            let entry: any = (<any>config)[key];
            let type: string = ConfigParamTypes[key];
            if (!entry) continue;
            switch (type) {
                case 'config':
                    if (!Array.isArray(entry)) {
                        config[key] = this.replaceConfigByEnvVars(entry);
                    }
                    break;
                case 'string':
                    config[key] = stringConfigFromEnv(entry);
                    break;
                case 'string-array':
                    let value: string | string[] = stringConfigFromEnv(entry) || entry;
                    if (typeof value === 'string') {
                        value = value.split(',');
                    }
                    config[key] = value;
                    break;
                case 'int':
                    config[key] = intConfigFromEnv(entry) || entry;
                    break;
                case 'float':
                    config[key] = floatConfigFromEnv(entry) || entry;
                    break;
                case 'boolean':
                    config[key] = boolConfigFromEnv(entry) || entry;
                    break;
                default:
                    break;
            }
        }
        return input;
    }

    private runCron(schedule: string) {
        Runner.cronTask = cron.schedule(schedule, () => {
            console.log(new Date() + ': Running from cron trigger');
            this.checkUpdates().catch(err => {
                console.error(err);
                this.runErrorCommand(this.config.errorCmd, err).catch(this.sendErrorMail);
                this.sendErrorMail(err);
            });
        });
    }

    private runEndpoint(endpointPath: string, port?: number) {
        const handler: EndPointHandler = (request, response) => {
            console.log(new Date() + ': Running from http trigger');
            this.checkUpdates().then(() => {
                HttpServer.sendResponse(response, 'Ok', 200);
            }).catch(err => {
                console.error(err);
                this.runErrorCommand(this.config.errorCmd, err).catch(this.sendErrorMail);
                this.sendErrorMail(err);
                HttpServer.sendResponse(response, 'Something went wrong:\n\n' + err, 200);
            });
        };
        let routing: HttpRouting = {};
        routing[endpointPath] = handler;
        Runner.httpServer = new HttpServer(routing, port);
    }

    async validateGit() {
        if (mapIsEmpty(this.config.git)) {
            throw 'No git config given';
        }
        let result = <string>await git.remote(['show', 'origin']);
        let gitConfig = <GitConfig>this.config.git;
        if( result.indexOf(`Fetch URL: ${gitConfig.repository}`) < 0 ) {
            throw 'This is not the proclaimed repository: ' +  gitConfig.repository + '. Please check again using command: git remote show origin.';
        }
    }

    async checkUpdates(): Promise<void> {
        if (mapIsEmpty(this.config.git)) {
            throw 'No git config given';
        }
        let gitConfig = <GitConfig>this.config.git;
        console.log((new Date()) + ': Checking for changes on branch ' + gitConfig.branch);
        await git.updateServerInfo();
        await git.checkout(gitConfig.branch);
        let current = await git.revparse(['HEAD']);
        current = current.trim();

        let output = await git.listRemote(['--heads']);
        let rows = output.split(/\r?\n/);
        let filtered: string[] = rows.filter((val) => { return val.indexOf('refs/heads/' + gitConfig.branch) > -1; });

        if (arrayIsEmpty(filtered)) throw 'Could not find remote changes for ' + gitConfig.branch;

        if (filtered.length > 1) throw 'Conflict: found multiple remote changes for ' + gitConfig.branch;

        let remote = filtered[0].replace('refs/heads/' + gitConfig.branch, '').trim();
        if (current === remote) {
            return console.log((new Date()) + ': No changes on branch ' + gitConfig.branch);
        }
        await this.performDeployment(gitConfig.branch);
    }

    private async performDeployment(branchName: string) {
        console.log((new Date()) + ': Found changes on branch ' + branchName + ', performing deployment');
        console.log((new Date()) + ': Pulling branch ' + branchName + ', performing deployment');
        await git.pull();
        console.log((new Date()) + ': Successfully pulled branch ' + branchName);
        if (!stringIsEmpty(this.config.buildCmd)) {
            console.log((new Date()) + ': Running build command ' + this.config.buildCmd);
            await this.runOnShell(<string>this.config.buildCmd);
        }
        if (!stringIsEmpty(this.config.deployCmd)) {
            console.log((new Date()) + ': Running deploy command ' + this.config.deployCmd);
            await this.runOnShell(<string>this.config.deployCmd);
        }
        await this.runSuccessCommand(this.config.successCmd);
        this.sendSuccessMail();
        console.log((new Date()) + ': Done deploying for ' + branchName);
    }

    protected async runOnShell(cmd: string): Promise<string> {
        return new Promise<string>((resolve, reject) => {
            childProcess.exec(cmd, (error: ExecException | null, stdout: string, stderr: string) => {
                if (error) {
                    return reject(error.message);
                }
                if (!stringIsEmpty(stderr)) {
                    return reject(stderr);
                }
                if (!stringIsEmpty(stdout)) {
                    console.log(stdout);
                }
                resolve(stdout);
            });
        });
    }

    private sendStartedMail() {
        const gitConfig = <GitConfig>this.config.git || { repository: 'unknown', branch: 'unknown'};
        const repository = gitConfig.repository || 'unknown';
        const branch = gitConfig.branch || 'unknown';
        const msg = 'For\n' +
            'Repository: ' + repository + '\n' +
            'Branch: ' + undiscloseBasicAuth(branch) + '\n' +
            '\n\nThe deployment succeeded at ' + new Date();
        let subject = 'Started auto deployment on environment: ' + this.environment;

        this.sendMail({subject: subject, text: msg});
    }

    private sendSuccessMail() {
        const gitConfig = <GitConfig>this.config.git || { repository: 'unknown', branch: 'unknown'};
        const repository = gitConfig.repository || 'unknown';
        const branch = gitConfig.branch || 'unknown';
        const msg = 'For\n' +
            'Repository: ' + repository + '\n' +
            'Branch: ' + undiscloseBasicAuth(branch) + '\n' +
            '\n\nThe deployment succeeded at ' + new Date();
        let subject = 'Successful auto deployment on environment: ' + this.environment;

        this.sendMail({subject: subject, text: msg});
    }

    private sendErrorMail(error: string | Error) {
        let msg = 'unknown or not parsable Error';
        if (typeof error === 'object') {
            try {
                msg = (<any>error).hasOwnProperty('message') ? error.message : JSON.stringify(error);
            } catch (e) {
                console. error(e);
            }
        }
        const gitConfig = <GitConfig>this.config.git || { repository: 'unknown', branch: 'unknown'};
        const repository = gitConfig.repository || 'unknown';
        const branch = gitConfig.branch || 'unknown';
        msg = 'For\n' +
            'Repository: ' + repository + '\n' +
            'Branch: ' + undiscloseBasicAuth(branch) + '\n' +
            '\n\nThe following error occurred:\n\n' +
            msg;
        let subject = 'Error on auto deployment on environment: ' + this.environment;

        this.sendMail({subject: subject, text: msg});
    }

    private sendMail(data: {subject: string, text: string}) {
        if (mapIsEmpty(this.config.email)) {
            return console.warn('No email config given to send result');
        }
        let emailConfig = <EmailConfig>this.config.email;
        let recipients = typeof emailConfig.recipients === 'string' ? stringConfigFromEnv('' + emailConfig.recipients) : emailConfig.recipients.join(', ');
        const msg = Object.assign({
            to: recipients,
            from: emailConfig.sender
        }, data);
        this.mailTransport.sendMail(msg)
            .then(() => { console.log('-- email sent --'); })
            .catch(console.error);
    }

    protected async runSuccessCommand(cmd: string | undefined) {
        if (stringIsEmpty(cmd)) return;
        return this.runOnShell(<string>cmd);
    }

    protected async runErrorCommand(cmd: string | undefined, error: Error | string) {
        if (stringIsEmpty(cmd)) return;
        let message;
        if (typeof error === 'string') {
            message = <string>error;
        } else {
            message = (<Error>error).message;
        }
        return this.runOnShell((<string>cmd).replace('[error]', message));
    }
}
