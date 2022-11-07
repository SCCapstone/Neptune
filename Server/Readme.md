## Neptune\Server


Server component. Receives notification data from clients (the Android app).

Written in Node.JS (targeting Node.JS 18 as that will become the main LTS version until \~2025).\
Node.JS can be downloaded [here](https://nodejs.org/en/download/current/) (be sure to grab version 18).

Install all dependencies (node_modules) by running `Install node modules.bat` or typing `npm i`\
To run, just open this directory in your command prompt of the month and type `npm start`\
Configuration options available in `./dist/data/config.json` (probably)


Since this is a Node.JS application, `npm` will be used as our package manager for modules.

To "package" our Node.JS server application into a "one-click" executable we will use PKG: https://www.npmjs.com/package/pkg

Packages:
    `express`: Web application framework, the "web server" portion of server that receives data from the client, hosts the REST API.\
    `socket.io`: For socket communications with the client app.\
    `futoin-hkdf`: Used to generate a shared encryption key\
    `nodegui`: Creating the GUI for the server application\
    `node-notifier`: For sending notifications to the server OS.\
    `PKG`: See above, used to package our server into a one-click application.