## Neptune\Client.Android


Client application for Android. Sends notification data (your Android device's notifications) to a remote server (the Server application).

Written in Java.\
Use this as the root path for Android app development.\
https://developer.android.com/studio



Dependencies:
    https://github.com/patrickfav/hkdf 1.1 `implementation group: 'at.favre.lib', name: 'hkdf', version: '1.1.0'`\
    https://github.com/google/gson 2.10.1, Json library `implementation 'com.google.code.gson:gson:2.10.1'`\
    https://developer.android.com/jetpack/androidx/releases/constraintlayout 2.1.4 `implementation 'androidx.constraintlayout:constraintlayout:2.1.4'`\
    https://androidx.tech/artifacts/test.espresso/espresso-intents/ 3.5.1 `androidTestImplementation 'androidx.test.espresso:espresso-intents:3.5.1'`\
    https://developer.android.com/jetpack/androidx/releases/test#runner 1.5.2 `androidTestImplementation 'androidx.test:runner:1.5.2'`\
    https://developer.android.com/jetpack/androidx/releases/test#rules 1.5.0 `androidTestImplementation 'androidx.test:rules:1.5.0'`\
    https://androidx.tech/artifacts/test.ext/junit-ktx/ 1.1.5 `androidTestImplementation 'androidx.test.ext:junit-ktx:1.1.5'`


Java version: `1.8`\
Min SDK: `23`\
Target SDK: `32`\
Compile SDK: `32`



## Building
Open this folder in Android Studio.\
To run, use the toolbar in the upper right of Android Studio.
![Run toolbar in Android Studio](https://user-images.githubusercontent.com/55852895/215352099-f91de393-1ddc-4030-92d1-1a388fe3f01b.png)


To build, select the "Build" drop down menu -> "Build Bundle(s) / APK(s)" -> "Build APK(s)"
<img src="https://user-images.githubusercontent.com/55852895/215352214-52a691cf-22bb-4512-94ca-f6928e4ceac2.png" height="300px" alt="Build APK"/>


See Android's [build and run your app](https://developer.android.com/studio/run) for more information.


## Testing
Testing is done using Android Studio.\
1) Expand ./app/java/
2) Right click the green `com (androidTest)` folder
3) Click `Run 'Tests in 'com''` _this will run behavioral and unit tests inside an emulator or connected device_
<img src="https://user-images.githubusercontent.com/55852895/215351718-dc7958dd-c9b7-462a-98d4-66e7d3abaab2.png" height="450px" alt="Run requiring Android"/>
4) Right click the green `com (test)` folder
5) Click `Run 'Tests in 'com''` _this will run unit tests that are not require to run on Android_
<img src="https://user-images.githubusercontent.com/55852895/215351723-1bd9a09f-d42f-4a69-adf2-ed0d28fdac6c.png" height="525px" alt="Run tests NOT requiring Android"/>
