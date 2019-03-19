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
    private runCron;
    private runEndpoint;
    validateGit(): Promise<void>;
    checkUpdates(): Promise<void>;
    private performDeployment;
    private runOnShell;
    private sendSuccessMail;
    private sendErrorMail;
    private sendMail;
}
