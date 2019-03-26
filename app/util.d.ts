export declare function loadJson(filePath: string): Promise<any>;
export declare function stringConfigFromEnv(name: string): string | undefined;
export declare function intConfigFromEnv(name: string): number | undefined;
export declare function floatConfigFromEnv(name: string): number | undefined;
export declare function boolConfigFromEnv(name: string): boolean | undefined;
export declare function detectTypeInString(value: string | undefined): 'int' | 'float' | 'boolean' | 'string' | string | undefined;
export declare function typeParsedValueFromString(value: string | undefined): number | boolean | string | undefined;
