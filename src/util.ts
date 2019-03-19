import * as fs from 'fs';
import {promisify} from 'util';
import {stringIsEmpty} from "sb-util-ts";

const readFile = promisify(fs.readFile);

export async function loadJson(filePath: string): Promise<any> {
    let content = await readFile(filePath, 'utf8');
    return JSON.parse(content);
}

function configEnvForName(name: string): string | undefined {
    if(stringIsEmpty(name) || !name.trim().startsWith('env:')) {
        return undefined;
    }
    return name.replace('env:', '').trim();
}

export function stringConfigFromEnv(name: string): string | undefined {
    const envVar = configEnvForName(name);
    if(stringIsEmpty(envVar)) {
        return name;
    }
    return process.env[<string>envVar];
}

export function intConfigFromEnv(name: string): number | undefined {
    const strVal = stringConfigFromEnv(name);
    if (stringIsEmpty(strVal)) return undefined;
    return parseInt(<string>strVal);
}

export function floatConfigFromEnv(name: string): number | undefined {
    const strVal = stringConfigFromEnv(name);
    if (stringIsEmpty(strVal)) return undefined;
    return parseFloat(<string>strVal);
}

export function boolConfigFromEnv(name: string): boolean | undefined {
    const strVal = stringConfigFromEnv(name);
    if (stringIsEmpty(strVal)) return undefined;
    return !!parseInt(<string>strVal);
}
