// This is called once before Jest sets up
const fs = require("node:fs");

module.exports = () => {
    if (!fs.existsSync('./tests/logs/')) {
        fs.mkdirSync('./tests/logs/');
    } else {
        if (fs.existsSync('./tests/logs/NeptuneTest.log')) {
            fs.unlinkSync('./tests/logs/NeptuneTest.log');
        }
    }


    if (!fs.existsSync('./tests/data/')) {
        fs.mkdirSync('./tests/data');
    }
    if (!fs.existsSync("./tests/data/clients/")) {
        fs.mkdirSync("./tests/data/clients/");
    }
}