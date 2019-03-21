import { ScheduledTask } from 'node-cron';
import { HttpServer } from "./server";
import * as nodemailer from 'nodemailer';
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
export declare class Runner {
    protected static cronTask: ScheduledTask;
    protected static httpServer: HttpServer;
    protected config: RunnerConfig;
    protected environment: string;
    protected workDirPath: string;
    protected mailTransport: nodemailer.Transporter;
    protected usingMNonConfigMailTransport: boolean;
    setupMailTransport(transport?: nodemailer.Transport): void;
    runFromConfig(config: string | RunnerConfig): Promise<void>;
    private initRunner;
    private initTriggers;
    protected replaceConfigByEnvVars(input?: any): any;
    private runCron;
    private runEndpoint;
    validateGit(): Promise<void>;
    checkUpdates(): Promise<void>;
    private performDeployment;
    protected runOnShell(cmd: string): Promise<string>;
    private sendSuccessMail;
    private sendErrorMail;
    private sendMail;
    protected runSuccessCommand(cmd: string | undefined): Promise<string | undefined>;
    protected runErrorCommand(cmd: string | undefined, error: Error | string): Promise<string | undefined>;
}
