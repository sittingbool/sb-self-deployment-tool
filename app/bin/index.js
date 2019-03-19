"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const path_1 = __importDefault(require("path"));
const fs_1 = __importDefault(require("fs"));
const util_1 = __importDefault(require("util"));
const program = require("commander");
const runner_1 = require("../runner");
const util_2 = require("../util");
program
    .version(process.version)
    .option('-c, --config [type]', 'Specify the config file to be used [config]', 'config.json')
    .option('-i, --init', 'Creates an example config file')
    .parse(process.argv);
function initConfig() {
    const writeFile = util_1.default.promisify(fs_1.default.writeFile);
    util_2.loadJson(path_1.default.join(__dirname, '..', '..', 'config.template.json'))
        .then(data => {
        return writeFile('config.json', JSON.stringify(data, null, 2), 'utf8');
    })
        .then(() => {
        console.log('Created config in ./config.json');
    })
        .catch(console.error);
}
if (program.init) {
    initConfig();
}
else {
    const runner = new runner_1.Runner();
    runner.runFromConfig(program.config).catch(console.error);
}
//# sourceMappingURL=index.js.map