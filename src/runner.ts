import path from 'path';
import cron, {ScheduledTask} from 'node-cron';
import {EndPointHandler, HttpRouting, HttpServer} from "./server";
import simplegit, { SimpleGit } from 'simple-git/promise';
import {loadJson} from "./util";
import {arrayIsEmpty, mapIsEmpty, stringIsEmpty} from "sb-util-ts";

const git = simplegit(process.cwd());

export interface RunnerConfig {
    git?: {
        repository: string,
        branch: string
    },
    trigger?: TriggerConfig;
    email?: {
        recipients: string[]
    },
    envVar?: string
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

    static cronTask: ScheduledTask;
    static httpServer: HttpServer;
    private config: RunnerConfig = {};
    private environment: string = 'unspecified';
    private workDirPath: string = process.cwd();

    async runFromConfig(config: string | RunnerConfig) {
        if (mapIsEmpty(config) && stringIsEmpty(<string>config)) {
            throw 'Invalid config given';
        }
        let configFileName: string = 'config.json';
        if (!stringIsEmpty(<string>config)) {
            configFileName = <string>config;
            this.workDirPath = configFileName.substring(0, configFileName.lastIndexOf("/"));
            this.config = await loadJson(path.join(process.cwd(), configFileName));
        } else if (!mapIsEmpty(config)) {
            this.config = <RunnerConfig>config;
        } else {
            throw 'Invalid config given';
        }
        if (!stringIsEmpty(this.config.envVar)) {
            this.environment = process.env[<string>this.config.envVar] || this.environment;
        }
        this.initTriggers();
    }

    initTriggers() {
        const triggers: TriggerConfig = this.config.trigger || {};
        if (!stringIsEmpty(triggers.cron)) {
            //this.runCron(<string>triggers.cron);
        }
        if (!mapIsEmpty(triggers.webInterface)) {
            const webInterface: WebInterfaceConfig = <WebInterfaceConfig>triggers.webInterface;
            if (!arrayIsEmpty(webInterface.excludeEnvironments) && webInterface.excludeEnvironments.indexOf(this.environment) > -1) {
                return;
            }
            this.runEndpoint(webInterface.endpoint, webInterface.port);
        }
    }

    runCron(schedule: string) {
        Runner.cronTask = cron.schedule(schedule, () => {
            this.checkUpdates().then(() => {
            }).catch(err => {
                console.error(err);
            });
            console.log('hello');
        });
    }

    runEndpoint(endpointPath: string, port?: number) {
        const handler: EndPointHandler = (request, response) => {
            this.checkUpdates().then(() => {
                HttpServer.sendResponse(response, 'Ok', 200);
            }).catch(err => {
                console.error(err);
                HttpServer.sendResponse(response, 'Something went wrong:\n\n' + err, 200);
            });
        };
        let routing: HttpRouting = {};
        routing[endpointPath] = handler;
        Runner.httpServer = new HttpServer(routing, port);
    }

    validateGit() {}

    async checkUpdates(): Promise<void> {
        let output = await git.listRemote(['--heads']);
        console.log(output);
    }
}
