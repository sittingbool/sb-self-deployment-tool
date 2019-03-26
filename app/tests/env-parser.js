"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const sb_util_ts_1 = require("sb-util-ts");
const util_1 = require("../util");
class EnvParser {
    static replaceInObject(object) {
        if (sb_util_ts_1.mapIsEmpty(object))
            return object;
        for (const key in object) {
            let value = object[key];
            switch (typeof value) {
                case 'object':
                    object[key] = this.replaceInObject(object[key]);
                    break;
                case 'string':
                    if (value.toLowerCase().startsWith('env:')) {
                        let envVar = value.replace(/env:/i, '');
                        let val = process.env[envVar];
                        object[key] = util_1.typeParsedValueFromString(val) || envVar;
                    }
                    break;
                default:
                    break;
            }
        }
        return object;
    }
}
exports.EnvParser = EnvParser;
//# sourceMappingURL=env-parser.js.map