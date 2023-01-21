const Version = require('../src/Classes/Version.js');

module.exports = async () => {
   // This is called when Jest starts up

   global.Neptune = {
      version: new Version(0, 0, 0, "debug", "JestUnitTesting"),
   }
};