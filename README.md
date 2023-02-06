# \|\\\|eptune




UofSC|CSCE490: Capstone project for receiving and interacting with phone (Android) notifications on your computer.


## Prerequisites
Node.JS (V18 - for Server)\
Android Studio (Android app/Client)



## Building/Running
Each application has application specific instructions for building/running.

View the Server instructions [here](./Server/Readme.md)\
View the Android Client instructions [here](./Client/Android/Readme.md)

_The basics:_\
For the **Android Client**, open the project folder (./Client/Android/) in Android Studio. From their you can click "run" to run the app or "build" to build.


For the **Server**, things a little more complex, but still easy. It is important to note that server has only been tested on Windows. While in theory it could work on other OSes, your millage may vary.\
_Up to date instructions are in the ./Server/ folder._\
Before anything:
1) Download [Node.JS version 18 (LTS)](https://nodejs.org/en/download/)
2) Install all dependencies running `Install node modules.bat` (do this as administrator)

Then to run: `npm run start`

To build, run `npx nodegui-packer --init NeptuneServer` at least once, then `npm run build` every time you wish to build the full executable.


---


## Authors
Will Amos\
Ridge Johnson\
Cody Newberry\
Matthew Sprinkle
