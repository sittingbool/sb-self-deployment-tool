import path from 'path';
import * as childProcess from 'child_process';
import cron, {ScheduledTask} from 'node-cron';
import {EndPointHandler, HttpRouting, HttpServer} from "./server";
import simplegit from 'simple-git/promise';
import {loadJson} from "./util";
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

export interface RunnerConfig {
    workDir?: string;
    git?: GitConfig;
    trigger?: TriggerConfig;
    email?: EmailConfig;
    envVar?: string;
    buildCmd?: string;
    deployCmd?: string;
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

export class Runner {

    private static cronTask: ScheduledTask;
    private static httpServer: HttpServer;
    private config: RunnerConfig = {};
    private environment: string = 'unspecified';
    private workDirPath: string = process.cwd();
    private mailTransport: nodemailer.Transporter = nodemailer.createTransport(defaultTransport);
    private usingMNonConfigMailTransport: boolean = false;

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
        if (mapIsEmpty(config) && stringIsEmpty(<string>config)) {
            console.error('Invalid config given');
        }
        let configFileName: string = 'config.json';
        if (!stringIsEmpty(<string>config)) {
            configFileName = <string>config;
            this.workDirPath = configFileName.substring(0, configFileName.lastIndexOf("/"));
            this.config = await loadJson(path.join(process.cwd(), configFileName));
        } else if (!mapIsEmpty(config)) {
            this.config = <RunnerConfig>config;
        } else {
            console.error('Invalid config given');
        }
        this.setupMailTransport();
        if (!stringIsEmpty(this.config.envVar)) {
            this.environment = process.env[<string>this.config.envVar] || this.environment;
        }
        if (!stringIsEmpty(this.config.workDir)) {
            this.workDirPath = path.join(this.workDirPath, <string>this.config.workDir);
        }
        const absolutePath = path.isAbsolute(this.workDirPath) ? this.workDirPath : path.join(process.cwd(), this.workDirPath);
        console.log((new Date()) + ': Started auto deploy runner for directory: ' + absolutePath);
        git = simplegit(absolutePath);
        try {
            await this.initRunner();
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

    private runCron(schedule: string) {
        Runner.cronTask = cron.schedule(schedule, () => {
            console.log(new Date() + ': Running from cron trigger');
            this.checkUpdates().catch(err => {
                console.error(err);
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
        this.sendSuccessMail();
        console.log((new Date()) + ': Done deploying for ' + branchName);
    }

    private async runOnShell(cmd: string): Promise<string> {
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

    private sendSuccessMail() {
        const gitConfig = <GitConfig>this.config.git || { repository: 'unknown', branch: 'unknown'};
        const repository = gitConfig.repository || 'unknown';
        const branch = gitConfig.branch || 'unknown';
        const msg = 'For\n' +
            'Repository: ' + repository + '\n' +
            'Branch: ' + branch + '\n' +
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
            'Branch: ' + branch + '\n' +
            '\n\nThe following error occurred:\n\n' +
            msg;
        let subject = 'Error on auto deployment on environment: ' + this.environment;

        this.sendMail({subject: subject, text: msg});
    }

    private sendMail(data: {subject: string, text: string}) {
        if (mapIsEmpty(this.config.email)) {
            return console.error('No email config given to send result');
        }
        let emailConfig = <EmailConfig>this.config.email;
        const msg = Object.assign({
            to: emailConfig.recipients.join(', '),
            from: emailConfig.sender
        }, data);
        this.mailTransport.sendMail(msg)
            .then(() => { console.log('-- email sent --'); })
            .catch(console.error);
    }
}
