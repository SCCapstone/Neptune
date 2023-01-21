module.exports = async () => {
   // This is called when Jest finishes.
   
   if (global.qApp != undefined) {
     process.ResourceManager = undefined;
     global.qApp.quit();
     process.exit(0);
   }
};