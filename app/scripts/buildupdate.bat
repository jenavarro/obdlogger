@REM Run this from app home folder
CALL scripts\build.bat
%ANDROID_HOME%\platform-tools\adb install -r .\platforms\android\app\build\outputs\apk\debug\app-debug.apk
