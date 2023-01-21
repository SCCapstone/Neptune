const { QApplication } = require('@nodegui/nodegui');


module.exports = async () => {
   // This is called when Jest starts up

   require('./JestSetup.js')(); // Call the primary setup file


   // For Windows we need the ResourceManager
   const ResourceManager = new (require("../src/ResourceManager.js"))();
   process.ResourceManager = ResourceManager;

   global.RunningTest = true;

   // We need qApp so we can close the application when finished
   global.qApp = QApplication.instance();
   qApp.setQuitOnLastWindowClosed(false);
};