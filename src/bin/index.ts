import path from 'path';
import fs from 'fs';
import util from 'util';
import program = require('commander');
import {Runner} from "../runner";
import {loadJson} from "../util";

program
    .version(process.version)
    .option('-c, --config [type]', 'Specify the config file to be used [config]', 'config.json')
    .option('-i, --init', 'Creates an example config file')
    .parse(process.argv);

function initConfig() {
    const writeFile = util.promisify(fs.writeFile);
    loadJson(path.join(__dirname, '..', '..', 'config.template.json'))
        .then(data => {
            return writeFile('config.json', JSON.stringify(data, null, 2), 'utf8');
        })
        .then(() => {
            console.log('Created config in ./config.json');
        })
        .catch(console.error)
    ;
}

if(program.init) {
    initConfig();
} else {
    const runner = new Runner();
    runner.runFromConfig(program.config).catch(console.error);
}
