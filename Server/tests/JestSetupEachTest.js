// This is called before each test

const { LogMan } = require('../src/Classes/LogMan.js');
const Version = require('../src/Classes/Version.js');
const fs = require("node:fs");
const path = require("node:path")

Neptune = {
    version: new Version(0, 0, 0, "debug", "JestUnitTesting"),
    logMan: new LogMan("NeptuneTest", "./tests/logs/", {
        outputToConsole: false,
        cleanLog: false,
        consoleMessageCharacterLimit: (1250),
        fileMessageCharacterLimit: (7500),
    }),
}
global.Neptune = Neptune;

const testFilename = path.basename(expect.getState().testPath);
global.jestLogger = Neptune.logMan.getLogger(`Jest-${testFilename}`, false);
beforeEach(() => {
    global.failed = false;
    global.jestLogger.info(` ==== STARTING TEST: ${expect.getState().currentTestName} ==== `);
});
afterEach(() => {
    jest.clearAllTimers();
    jestLogger.info(` ==== FINISHED TEST: ${expect.getState().currentTestName} ==== `);
    // if (!global.failed) {
    //     jestLogger.info(` ==== PASSED TEST: ${expect.getState().currentTestName} ==== `);
    // } else {
    //     jestLogger.warn(` ==== FAILED TEST: ${expect.getState().currentTestName} ==== `);
    // }
});




if (!fs.existsSync('./tests/data/')) {
    fs.mkdirSync('./tests/data');
}
if (!fs.existsSync("./tests/data/clients/")) {
    fs.mkdirSync("./tests/data/clients/");
}


Neptune.setupConfigurations = function() {
    let NeptuneConfig = require('../src/Classes/NeptuneConfig.js');
    let ConfigurationManager = require('../src/Classes/ConfigurationManager.js');

    Neptune.configurationManager = new ConfigurationManager("./tests/data/");
    Neptune.config = global.Neptune.configurationManager.loadConfig("./tests/data/NeptuneTestConfig.json", true, NeptuneConfig);
    Neptune.config.save();
}

Neptune.tearDownConfigurations = function() {
    if (Neptune) {
        if (Neptune.configurationManager !== undefined) {
            Neptune.configurationManager.destroy();
        }
    } else {
        console.warn("Neptune not defined");
    }
}