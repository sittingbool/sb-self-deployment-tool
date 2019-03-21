"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : new P(function (resolve) { resolve(result.value); }).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const mocha_typescript_1 = require("mocha-typescript");
const runner_1 = require("../runner");
const util_1 = require("../util");
const path_1 = __importDefault(require("path"));
const should_1 = __importDefault(require("should"));
const test_env_1 = require("./test.env");
class MockRunner extends runner_1.Runner {
    constructor() {
        super(...arguments);
        this.checkUpdatesRan = false;
    }
    get _config() {
        return this.config;
    }
    checkUpdates() {
        return __awaiter(this, void 0, void 0, function* () {
            this.checkUpdatesRan = true;
        });
    }
}
let TestRunner = class TestRunner {
    testEnvConfigReplacements() {
        return __awaiter(this, void 0, void 0, function* () {
            Object.assign(process.env, test_env_1.ReplacementTestProperties);
            let runner = new MockRunner();
            let config = yield util_1.loadJson(path_1.default.join(__dirname, 'test-env-replace.config.json'));
            yield runner.runFromConfig(config);
            config = runner._config;
            should_1.default(config.workDir).be.a.String().and.be.equal(test_env_1.ReplacementTestProperties['WORK_DIR']);
        });
    }
};
__decorate([
    mocha_typescript_1.test('should replace evn: config params'),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", []),
    __metadata("design:returntype", Promise)
], TestRunner.prototype, "testEnvConfigReplacements", null);
TestRunner = __decorate([
    mocha_typescript_1.suite
], TestRunner);
//# sourceMappingURL=runner.test.js.map