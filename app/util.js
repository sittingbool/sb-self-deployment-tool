"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : new P(function (resolve) { resolve(result.value); }).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
var __importStar = (this && this.__importStar) || function (mod) {
    if (mod && mod.__esModule) return mod;
    var result = {};
    if (mod != null) for (var k in mod) if (Object.hasOwnProperty.call(mod, k)) result[k] = mod[k];
    result["default"] = mod;
    return result;
};
Object.defineProperty(exports, "__esModule", { value: true });
const fs = __importStar(require("fs"));
const util_1 = require("util");
const sb_util_ts_1 = require("sb-util-ts");
const readFile = util_1.promisify(fs.readFile);
function loadJson(filePath) {
    return __awaiter(this, void 0, void 0, function* () {
        let content = yield readFile(filePath, 'utf8');
        return JSON.parse(content);
    });
}
exports.loadJson = loadJson;
function configEnvForName(name) {
    if (sb_util_ts_1.stringIsEmpty(name) || !name.trim().startsWith('env:')) {
        return undefined;
    }
    return name.replace('env:', '').trim();
}
function stringConfigFromEnv(name) {
    const envVar = configEnvForName(name);
    if (sb_util_ts_1.stringIsEmpty(envVar)) {
        return name;
    }
    return process.env[envVar];
}
exports.stringConfigFromEnv = stringConfigFromEnv;
function intConfigFromEnv(name) {
    const strVal = stringConfigFromEnv(name);
    if (sb_util_ts_1.stringIsEmpty(strVal))
        return undefined;
    return parseInt(strVal);
}
exports.intConfigFromEnv = intConfigFromEnv;
function floatConfigFromEnv(name) {
    const strVal = stringConfigFromEnv(name);
    if (sb_util_ts_1.stringIsEmpty(strVal))
        return undefined;
    return parseFloat(strVal);
}
exports.floatConfigFromEnv = floatConfigFromEnv;
function boolConfigFromEnv(name) {
    const strVal = stringConfigFromEnv(name);
    if (sb_util_ts_1.stringIsEmpty(strVal))
        return undefined;
    return !!parseInt(strVal);
}
exports.boolConfigFromEnv = boolConfigFromEnv;
//# sourceMappingURL=util.js.map