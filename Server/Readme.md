## Neptune\Server

Server component. Receives notification data from clients (the Android app).\
Written in Node.JS (targeting Node.JS 18 as that will become the main LTS version until \~2025).\

In order to properly take advantage of Windows Toast notifications, NeptuneRunner is required to run Neptune. NeptuneRunner is a special program just for Windows that enables notification support.\
More information about NeptuneRunner is here: [doc.md#neptunerunner](doc.md#neptunerunner)


## Setup
You'll need Node.JS (version >=18) and Visual C++ Redistributable >=2019 (you likely have this). The node modules in the package file.


Dependencies:

1) Node.JS can be downloaded [here](https://nodejs.org/en/download/current/) (be sure to grab version 18 under the LTS tab). 
2) NodeGUI requires at least the 2019 version of Visual C++. You'll likely already have this installed on your computer as it is an incredibly common dependency. It can be downloaded [here](https://learn.microsoft.com/en-us/cpp/windows/latest-supported-vc-redist?view=msvc-170).


Node modules:\
Install all dependencies (node_modules) by running `Install node modules.bat` or typing `npm i`\


First run:\
After installing NodeJS, Visual C++, and the dependencies, do a first time run of Neptune using the command `npm run debug`.\
This _does not_ use NeptuneRunner, so notifications will **not** work as expected! NeptuneRunner is required for notifications to work. To start the server using NeptuneRunner, just type `npm start`.\
This is how you will start Neptune normally, `npm start`.\
To start Neptune _without_ proper notification support, run `npx qode ./src/index.js`. Again, this **will not** have properly functioning notifications, but it does start up a bit faster.

Configuration options available in `./data/NeptuneConfig.json` (may be encrypted, disabled in debug mode.)


## Building
Building is not necessarily compiling, this is a scripting language after all, but does move everything needed to run Server into a single place.\
This utilizes the nodegui-packer.

Before your first build you **must** run: `npx nodegui-packer --init NeptuneServer`\
Then to build (as in the full executable), run: `npm run build`\
This will build the packed executable and other files, explorer will automatically open the deploy folder (which will look like the image below):
<img src="https://user-images.githubusercontent.com/55852895/215352720-9e2eceec-5175-415a-acca-b11022312798.png" alt="Resulting build files" width="850px" />




## Starting
To run: `npm start`

The project uses qode.exe to get NodeGUI working. qode is a special compilation of Node.JS and requires everything to be "packed" using webpack. For this reason, you cannot simply run `node index.js`. Using the following run command, `npm start`, will repack the files into one file (`./dist/index.js`) for qode to run.\
You _can_ technically run Server without packing things by running an already packed file by calling `qode ./dist/index.js`. But this requires you to have ran `npm start` at least once. Additionally, this **will not** apply any code changes you made in `./src/`.


To debug, run: `npm run debug`
This starts qode with `--inspector`, which opens the the Node.JS debugger (web socket). You can use tools such as Chrome, Visual Studio Code and Visual Studio to then debug the code.




## Testing
Testing utilizes Jest.\
To run all tests, run: `npm run test`\
<img src="https://user-images.githubusercontent.com/55852895/215353063-f863a5b7-42f2-4844-a7bc-511fe26d02b2.png" alt="Tests results" width="550px" />


_To run only unit tests (no GUI), run: `npm run test-code`_

_To run only behavioral (GUI) tests, run `npm run test-gui`_


Tests are stored inside the directory named `./tests/`\
Behavioral/GUI tests end in `.guitest.js` and regular tests end in `.test.js`.\
`JestSetup-GUI.js` and `JestSetup.js` are called before tests are ran, and `JestTeardown.js` is ran after all tests complete.


---


Since this is a Node.JS application, `npm` will be used as our package manager for modules.

To "package" our Node.JS server application into a "one-click" executable we will use nodegui-packer.

Packages:\
    `@nodegui/nodegui`: The GUI we're using. NodeJS compatible version of Qt\
    `webpack`: For combining all our files and node_modules into one file.\
    `webpack-cli`: Command line utilities for webpack\
    `@type/node`: ??\
    `clean-webpack-plugin`: ??\
    `file-loader`: Required for webpack\
    `node-loader`: Required for webpack\
    `ts-loader`: Required for webpack\
    `typescript`: Required for webpack\
    -\
    `express`: Web application framework, the "web server" portion of server that receives data from the client, hosts the REST API.\
    `multer`: For uploading files (used for notification icons in addition to general documents).\
    `ws`: For socket communications with the client app.\
    -\
    `futoin-hkdf`: Used to generate a shared encryption key.\
    `keytar`: Interfacing with the OS keychain (Windows Credential Manager, MacOS Keychain)\
    `node-notifier`: For sending notifications to the server OS.