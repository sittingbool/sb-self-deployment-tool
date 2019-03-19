import {Runner} from "./runner";

const runner = new Runner();
runner.runFromConfig('../config.template.json').catch(console.error);

export = Runner;
