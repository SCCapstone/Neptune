## Neptune\Server


Server component. Receives notification data from clients (the Android app).

Written in Node.JS (targeting Node.JS 18 as that will become the main LTS version until \~2025).\
Node.JS can be downloaded [here](https://nodejs.org/en/download/current/) (be sure to grab version 18).


Install all dependencies (node_modules) by running `Install node modules.bat` or typing `npm i`\
To run, just open this directory in your command prompt of the month and type `npm start`\
Configuration options available in `./data/NeptuneConfig.json` (may be encrypted, disabled in debug mode.)


## Building
Building is not necessarily compiling, this is a scripting language after all, but does move everything needed to run Server into a single place.
This utilizes the nodegui-packer.

To build (as in the full executable), run: `npm run build`\
This will build the packed executable and other files, explorer will automatically open the deploy folder.



## Starting
To run: `npm start`

The project uses qode.exe to get NodeGUI working. qode is a special compilation of Node.JS and requires everything to be "packed" using webpack. For this reason, you cannot simply run `node index.js`. Using the following run command, `npm start`, will repack the files into one file (`./dist/index.js`) for qode to run.\
You _can_ technically run Server without packing things by running an already packed file by calling `qode ./dist/index.js`. But this requires you to have ran `npm start` at least once. Additionally, this **will not** apply any code changes you made in `./src/`.


To debug, run: `npm run debug`
This starts qode with `--inspector`, which opens the the Node.JS debugger (web socket). You can use tools such as Chrome, Visual Studio Code and Visual Studio to then debug the code.


## Testing
Testing utilizes Jest.
To run all tests: `npm run test`


To run only unit tests, run: `npm run test-code`

To run only behavioral (GUI) tests, run `npm run test-gui`

---


Since this is a Node.JS application, `npm` will be used as our package manager for modules.

To "package" our Node.JS server application into a "one-click" executable we will use PKG: https://www.npmjs.com/package/pkg

Packages:
    `@nodegui/nodegui`: The GUI we're using. NodeJS compatible version of Qt\
    `webpack`: For combining all our files and node_modules into one file.\
    `webpack-cli`: Command line utilities for webpack\
    `@type/node`: ??\
    `clean-webpack-plugin`: ??\
    `file-loader`: Required for webpack\
    `node-loader`: Required for webpack\
    `ts-loader`: Required for webpack\
    `typescript`: Required for webpack\
    -
    `express`: Web application framework, the "web server" portion of server that receives data from the client, hosts the REST API.\
    `multer`: For uploading files (used for notification icons in addition to general documents).\
    `ws`: For socket communications with the client app.\
    -
    `futoin-hkdf`: Used to generate a shared encryption key.\
    `keytar`: Interfacing with the OS keychain (Windows Credential Manager, MacOS Keychain)\
    `node-notifier`: For sending notifications to the server OS.