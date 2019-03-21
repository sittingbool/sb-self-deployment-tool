import { suite, test } from 'mocha-typescript';
import {Runner, RunnerConfig} from "../runner";
import {loadJson} from "../util";
import path from 'path';
import should from 'should';
import {ReplacementTestProperties} from "./test.env";

class MockRunner extends Runner {
    checkUpdatesRan: boolean = false;
    get _config(): RunnerConfig {
        return this.config;
    }

    async checkUpdates(): Promise<void> {
        this.checkUpdatesRan = true;
    }
}

@suite
class TestRunner {

    @test('should replace evn: config params')
    async testEnvConfigReplacements() {
        Object.assign(process.env, ReplacementTestProperties);
        let runner = new MockRunner();
        let config = <RunnerConfig>await loadJson(path.join(__dirname, 'test-env-replace.config.json'));
        await runner.runFromConfig(config);
        config = runner._config;
        should(config.workDir).be.a.String().and.be.equal(ReplacementTestProperties['WORK_DIR']);
    }
}

