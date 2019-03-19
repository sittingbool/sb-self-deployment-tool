import * as fs from 'fs';
import {promisify} from 'util';

const readFile = promisify(fs.readFile);

export async function loadJson(filePath: string): Promise<any> {
    let content = await readFile(filePath, 'utf8');
    return JSON.parse(content);
}
