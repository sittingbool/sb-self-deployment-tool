"use strict";
const runner_1 = require("./runner");
const runner = new runner_1.Runner();
runner.runFromConfig('../config.template.json').catch(console.error);
module.exports = runner_1.Runner;
//# sourceMappingURL=index.js.map