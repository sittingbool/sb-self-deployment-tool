import { ScheduledTask } from 'node-cron';
import { HttpServer } from "./server";
export interface RunnerConfig {
    git?: {
        repository: string;
        branch: string;
    };
    trigger?: TriggerConfig;
    email?: {
        recipients: string[];
    };
    envVar?: string;
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
export declare class Runner {
    static cronTask: ScheduledTask;
    static httpServer: HttpServer;
    private config;
    private environment;
    private workDirPath;
    runFromConfig(config: string | RunnerConfig): Promise<void>;
    initTriggers(): void;
    runCron(schedule: string): void;
    runEndpoint(endpointPath: string, port?: number): void;
    validateGit(): void;
    checkUpdates(): Promise<void>;
}
