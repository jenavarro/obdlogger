OBD Logger Sample App
==========================================

See [LICENSE.md](<LICENSE.md>) for license terms and conditions.

Project Details
---------------

This is an HTML5 Cordova app that runs in iOS and Android (so far tested only in Android). 
The app connects via Bluetooth to an ELM327C OBD Connector plugged in the OBD port in any car.
The app will collect live metrics from the car on-board diagnostic computer -RPM, speed, fuel consumption, etc.- and save & upload them to Google Sheets for further processing.

This app is more a proof-of-concept than a stable, feature rich application.

### Technologies used
* HTML5 Cordova app authored in the Intel XDK IDE
* Bluetooth communication: cordova-plugin-bluetooth-serial
* Local data storage: cordova-plugin-file
* For detecting wifi-connectivity: cordova-plugin-network-information


Refer to the [wiki](https://github.com/jenavarro/OBDLogger/wiki) on GitHub for additional information.
