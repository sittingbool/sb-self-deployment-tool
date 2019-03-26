import {mapIsEmpty} from "sb-util-ts";
import {typeParsedValueFromString} from "./util";

export class EnvParser {
    static replaceInObject(object: any): any {
        if (mapIsEmpty(object)) return object;
        for(const key in object) {
            let value = object[key];
            switch (typeof value) {
                case  'object':
                    object[key] = this.replaceInObject(object[key]);
                    break;
                case  'string':
                    if (value.toLowerCase().startsWith('env:')) {
                        let envVar = (<string>value).replace(/env:/i, '');
                        let val: any = process.env[envVar];
                        val = typeParsedValueFromString(val);
                        if (val === false ||val === null ) {
                            object[key] = val;
                        } else {
                            object[key] = typeParsedValueFromString(val) || value;
                        }
                    }
                    break;
                default:
                    break;
            }
        }
        return object;
    }

}
