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

## Testing
### Android Testing

Before you test, ensure that you have no servers created on your client. The client app should open directly to the MainActivity, which should display no servers connected.

Follow these steps to test the Android Client app.
1) Open our project's code in Android Studio.
2) Run the app to ensure that all permissions are enabled prior to testing (shown in Final Client Testing Video in the Issue Labeled "Final Testing Video")).
3) Stop the app's execution. You are ready to test.
4) Go to the Project tab on the left side of the screen and locate the `com (androidTest)` and `com (test)` folders. Open both and go to the `neptune.app` folder. The `androidTest` folder holds the Behavior Tests and the `test` folder holds the Unit Tests.
5) To run an entire folder's group of tests, do the following:
    1) Right click the `neptune.app` folder for the desired test group. This also works for subfolders within the `neptune.app` folder.
    2) Click `Run Tests in com.neptune...`
    3) Wait for the tests to finish running. Look at the bottom of the window to see information regarding the tests that ran.
6) To run a single test file, do the following:
    1) Right click the desired test.
    2) Click `Run [Insert Test Name Here]`.
    3) Wait for the tests to finish running. Look at the bottom of the window to see information regarding the tests that ran.

---

## Authors
Will Amos\
Ridge Johnson\
Cody Newberry\
Matthew Sprinkle
