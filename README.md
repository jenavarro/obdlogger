OBD Logger Sample App
==========================================

See [LICENSE.md](<LICENSE.md>) for license terms and conditions.

Project Details
---------------

This is an HTML5 Cordova app that runs in iOS and Android (so far tested only in Android). 
The app connects via Bluetooth to an ELM327C OBD Connector plugged in the OBD port in any car.
The app will collect live metrics from the car on-board diagnostic computer -RPM, speed, fuel consumption, etc.- and save locally to a sqlite database. It will export to CSV file or an InfluxDB time-series database.

This app is more a proof-of-concept than a stable, feature rich application.

This software is heavily based on the npm module [bluetooth-obd](https://www.npmjs.com/package/bluetooth-obd) authored by Eric Smekens and licensed as Apache License 2.0

### Main Features
* Data Capturing
    * Allow capturing live metrics reported by the car engine
    * Can select one of available Bluetooth devices
    * Displays number of metrics stored since connected
    * Displays number of metrics to be uploaded
* Data export
    * Allows exporting data locally to a CSV file
    * Allows exporting data to an influxDB (time-series) database
        Note: HTTPS api for InfluxDB needs to be configured
* Environment detection
    * Keeping bluetooth enabled while capturing data will make the device to never go to sleep.
    * As soon connectivity is lost it will allow again the phone to go to sleep
    * If there is no wifi, it will not attempt to send data to InfluxDB - to avoid incurring in cell data plan costs. Will attempt to send data once wifi connectivity is detected

Refer to this [wiki](https://github.com/jenavarro/OBDLogger/wiki) page on GitHub for additional information.
Refer to this [wiki](https://github.com/jenavarro/obdlogger/wiki/Configuring-Data-upload) for data upload configuration.

### Main and Configuration panels

<img src="https://user-images.githubusercontent.com/7155108/88468428-dd94a780-ceb9-11ea-8485-c4a6bc96e525.jpg" data-canonical-src="https://user-images.githubusercontent.com/7155108/88468428-dd94a780-ceb9-11ea-8485-c4a6bc96e525.jpg" width="200" height="400" />
<img src="https://user-images.githubusercontent.com/7155108/88468430-e4231f00-ceb9-11ea-97c2-451091a3fa76.jpg" data-canonical-src="https://user-images.githubusercontent.com/7155108/88468430-e4231f00-ceb9-11ea-97c2-451091a3fa76.jpg" width="200" height="400" />
<img src="https://user-images.githubusercontent.com/7155108/88468431-e4bbb580-ceb9-11ea-9be3-9f8919566bb4.jpg" data-canonical-src="https://user-images.githubusercontent.com/7155108/88468431-e4bbb580-ceb9-11ea-9be3-9f8919566bb4.jpg" width="200" height="400" />

### Technologies used
* [Ionic Framework](http://ionicframework.com/)
* [Visual Studio Code] (https://code.visualstudio.com)

## Build & Install
Generated .apk is available in Releases tab. In case you want to build from source:

1. Download and install Android studio.
2. `npm install`
3. `cd app`
4. `scripts\build.bat`

## Hardware
Running the app requires a OBD bluetooth connector plugged in the OBD-CAN connector of the car. ELM 327 is the model tested with this version of the app, it costs USD 10-15 in [Amazon] (https://www.amazon.com/Bluetooth-Scanner-Adapter-Diagnostic-Android/dp/B019SURWYO).

## Configuration
1. Plug the OBD connector.
1. Search Bluetooth devices, connect from the mobile phone to it (follow instructions from manufacturer).
1. Run the OBD Logger app, in "Configuration" select the Bluetooth device from the drop-down combo and select the metrics to read, e.g. RPM, Speed, etc.
1. Select the Main screen, wait until the message showing connection was OK.
1. The metrics will start to show up, updated every second.

## Testing with a simulator

If a OBD reader device is not available, it can be simulated using a special simulator [ObdSim] (https://icculus.org/obdgpslogger/obdsim.html):
For Linux/Mac, follow instructions on the [website] (https://icculus.org/obdgpslogger/obdsim.html).
For Windows:

1. Download .zip from [here] (https://icculus.org/obdgpslogger/downloads/obdsimwindows-latest.zip)
2. Unzip to any folder
3. Open Bluetooth Settings, click on "COM Ports"
4. Click "Add...", then "Inbound"
5. Open a command line window, go to folder where obdsim was unzipped
6. `odbsim -w COMx`   Replace x with the specific COM port created in previous step.
7. A window is opened showing 5 dials that can be changed manually, those will be the values offered to the device
8. On the mobile device, pair the Bluetooth connection to the Windows PC where the simulator is running.
9. Configure the OBD Logger app to use this alternate Bluetooth Connector, select metrics
10. Play with the dials and see how the values change in the OBD logger app.

## Usage: Uploading data to InfluxDB
Select InfluxDB in the target option. Provide an InfluxDB host and port 

## Usage: Uploading data to CSV
Select CSV in the target option. Data will be saved to data/android/obdlogger/data folder in the phone. A single .csv per day will be created and data for that day will be appended

### PIDs read from the OBD
* HTML5 Cordova app authored in the Intel XDK IDE
* PIDs supported 00-20
* Monitor status since DTCs cleared
* Fuel system 1 and 2 status
* Engine Coolant Temperature
* Short Term Fuel Trim - Bank 1,3
* Long Term Fuel Trim - Bank 1,3
* Short Term Fuel Trim - Bank 2,4
* Long Term Fuel Trim - Bank 2,4
* Fuel Pressure
* Intake Manifold Absolute Pressure
* Engine RPM
* Vehicle Speed Sensor
* Ignition Timing Advance for #1 Cylinder
* Intake Air Temperature
* Air Flow Rate from Mass Air Flow Sensor
* Absolute Throttle Position
* Commanded Secondary Air Status
* Location of Oxygen Sensors
* Bank 1 - Sensor 1/Bank 1 - Sensor 1 Oxygen Sensor Output Voltage / Short Term Fuel Trim
* Bank 1 - Sensor 2/Bank 1 - Sensor 2 Oxygen Sensor Output Voltage / Short Term Fuel Trim
* Bank 1 - Sensor 3/Bank 2 - Sensor 1 Oxygen Sensor Output Voltage / Short Term Fuel Trim
* Bank 1 - Sensor 4/Bank 2 - Sensor 2 Oxygen Sensor Output Voltage / Short Term Fuel Trim
* Bank 2 - Sensor 1/Bank 3 - Sensor 1 Oxygen Sensor Output Voltage / Short Term Fuel Trim
* Bank 2 - Sensor 2/Bank 3 - Sensor 2 Oxygen Sensor Output Voltage / Short Term Fuel Trim
* Bank 2 - Sensor 3/Bank 4 - Sensor 1 Oxygen Sensor Output Voltage / Short Term Fuel Trim
* Bank 2 - Sensor 4/Bank 4 - Sensor 2 Oxygen Sensor Output Voltage / Short Term Fuel Trim
* OBD requirements to which vehicle is designed
* Location of oxygen sensors
* Auxiliary Input Status
* Time Since Engine Start
* PIDs supported 21-40
* Distance Travelled While MIL is Activated
* Fuel Rail Pressure relative to manifold vacuum
* Fuel Rail Pressure (diesel)
* Bank 1 - Sensor 1/Bank 1 - Sensor 1 (wide range O2S) Oxygen Sensors Equivalence Ratio (lambda) / Voltage
* Bank 1 - Sensor 2/Bank 1 - Sensor 2 (wide range O2S) Oxygen Sensors Equivalence Ratio (lambda) / Voltage
* Bank 1 - Sensor 3 /Bank 2 - Sensor 1(wide range O2S) Oxygen Sensors Equivalence Ratio (lambda) / Voltage
* Bank 1 - Sensor 4 /Bank 2 - Sensor 2(wide range O2S) Oxygen Sensors Equivalence Ratio (lambda) / Voltage
* Bank 2 - Sensor 1 /Bank 3 - Sensor 1(wide range O2S) Oxygen Sensors Equivalence Ratio (lambda) / Voltage
* Bank 2 - Sensor 2 /Bank 3 - Sensor 2(wide range O2S) Oxygen Sensors Equivalence Ratio (lambda) / Voltage
* Bank 2 - Sensor 3 /Bank 4 - Sensor 1(wide range O2S) Oxygen Sensors Equivalence Ratio (lambda) / Voltage
* Bank 2 - Sensor 4 /Bank 4 - Sensor 2(wide range O2S) Oxygen Sensors Equivalence Ratio (lambda) / Voltage
* Commanded EGR
* EGR Error
* Commanded Evaporative Purge
* Fuel Level Input
* Number of warm-ups since diagnostic trouble codes cleared
* Distance since diagnostic trouble codes cleared
* Evap System Vapour Pressure
* Barometric Pressure
* Bank 1 - Sensor 1/Bank 1 - Sensor 1 (wide range O2S) Oxygen Sensors Equivalence Ratio (lambda) / Current
* Bank 1 - Sensor 2/Bank 1 - Sensor 2 (wide range O2S) Oxygen Sensors Equivalence Ratio (lambda) / Current
* Bank 1 - Sensor 3/Bank 2 - Sensor 1 (wide range O2S) Oxygen Sensors Equivalence Ratio (lambda) / Current
* Bank 1 - Sensor 4/Bank 2 - Sensor 2 (wide range O2S) Oxygen Sensors Equivalence Ratio (lambda) / Current
* Bank 2 - Sensor 1/Bank 3 - Sensor 1 (wide range O2S) Oxygen Sensors Equivalence Ratio (lambda) / Current
* Bank 2 - Sensor 2/Bank 3 - Sensor 2 (wide range O2S) Oxygen Sensors Equivalence Ratio (lambda) / Current
* Bank 2 - Sensor 3/Bank 4 - Sensor 1 (wide range O2S) Oxygen Sensors Equivalence Ratio (lambda) / Current
* Bank 2 - Sensor 4/Bank 4 - Sensor 2 (wide range O2S) Oxygen Sensors Equivalence Ratio (lambda) / Current
* Catalyst Temperature Bank 1 /  Sensor 1
* Catalyst Temperature Bank 2 /  Sensor 1
* Catalyst Temperature Bank 1 /  Sensor 2
* Catalyst Temperature Bank 2 /  Sensor 2
* "PIDs supported 41-60
* Monitor status this driving cycle
* Control module voltage
* Absolute Load Value
* Fuel/air Commanded Equivalence Ratio
* Relative Throttle Position
* Ambient air temperature
* Absolute Throttle Position B
* Absolute Throttle Position C
* Accelerator Pedal Position D
* Accelerator Pedal Position E
* Accelerator Pedal Position F
* Commanded Throttle Actuator Control
* Time run by the engine while MIL activated
* Time since diagnostic trouble codes cleared
* External Test Equipment Configuration #1
* External Test Equipment Configuration #2
* Fuel Type
* Ethanol fuel %
* Absolute Evap system Vapor Pressure
* Evap system vapor pressure
* Short term secondary oxygen sensor trim bank 1 and bank 3
* Long term secondary oxygen sensor trim bank 1 and bank 3
* Short term secondary oxygen sensor trim bank 2 and bank 4
* Long term secondary oxygen sensor trim bank 2 and bank 4
* Fuel rail pressure (absolute)
* Relative accelerator pedal position
* Hybrid battery pack remaining life
* Engine oil temperature
* Fuel injection timing
* Engine fuel rate
* Emission requirements to which vehicle is designed
* Actual engine - percent torque
* Engine coolant temperature
* Exhaust gas recirculation temperature
* Fuel pressure control system
* Injection pressure control system
* Exhaust pressure
* Exhaust Gas temperature Bank 1

