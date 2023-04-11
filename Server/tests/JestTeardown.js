const fs = require("node:fs");

module.exports = () => {
    // This is called when Jest finishes.
   
    if (global.qApp != undefined) {
        process.ResourceManager = undefined;
        global.qApp.quit();
        process.exit(0);
    }

    try {
        if (fs.existsSync("./tests/data/")) {
            fs.rmSync("./tests/data/", { recursive: true, maxRetries: 3, retryDelay: 10, force: true });
        }
    } catch (e) {
        console.warn(e);
    }
};