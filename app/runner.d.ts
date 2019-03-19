import * as nodemailer from 'nodemailer';
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
export declare class Runner {
    private static cronTask;
    private static httpServer;
    private config;
    private environment;
    private workDirPath;
    private mailTransport;
    private usingMNonConfigMailTransport;
    setupMailTransport(transport?: nodemailer.Transport): void;
    runFromConfig(config: string | RunnerConfig): Promise<void>;
    private initRunner;
    private initTriggers;
    runCron(schedule: string): void;
    runEndpoint(endpointPath: string, port?: number): void;
    validateGit(): Promise<void>;
    checkUpdates(): Promise<void>;
    private performDeployment;
    private runOnShell;
    sendSuccessMail(): void;
    sendErrorMail(error: string | Error): void;
    private sendMail;
}
