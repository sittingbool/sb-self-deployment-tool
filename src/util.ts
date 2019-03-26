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
    if ((strVal || '').toLowerCase() === 'true') {
        return true;
    } else if ((strVal || '').toLowerCase() === 'false') {
        return false;
    }
    return !!parseInt(<string>strVal);
}

function isNumeric(n: string) {
    let val = parseFloat(n);
    return !isNaN(val) && isFinite(val);
}

export function detectTypeInString(value: string | undefined): 'int' | 'float' | 'boolean' | 'string' | string | undefined {
    if (stringIsEmpty(value)) return value;

    let val = (<string>value).trim().toLowerCase();

    if (val.indexOf('true') > -1 || val.indexOf('false') > -1) {
        return 'boolean';
    }

    if (isNumeric(val)) {
        if (val.indexOf('.') > -1) {
            return 'float';
        }
        return 'int';
    }

    return 'string';
}

export function typeParsedValueFromString(value: string | undefined): number | boolean | string | undefined {
    let type = detectTypeInString(value);
    switch (type) {
        case 'boolean':
            return (<string>value).trim().toLowerCase() === 'true';
        case 'int':
            return parseInt((<string>value).trim());
        case 'float':
            return parseFloat((<string>value).trim());
        default:
            return value;
    }
}
