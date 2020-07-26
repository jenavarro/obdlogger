/*
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 * http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 *
 * (C) Copyright 2013, TNO
 * Author: Eric Smekens
 */
'use strict';

import { ModuleKind } from "typescript";

/*global console */

//module.exports = {obdinfo};

export class obdinfo {

    static modeRealTime :string= '01';
    static modeRequestDTC:string = "03";
    static modeClearDTC :string= "04";
    static modeVin :string= "09";
   
    static PIDS=[
        //Realtime data
        {mode: obdinfo.modeRealTime, pid: "00", bytes: 4, name: "pidsupp0",     description: "PIDs supported 00-20", min: 0, max: 0, unit: "Bit Encoded", convertToUseful4: obdinfo.convertPIDSupported, isDefault:false},
        {mode: obdinfo.modeRealTime, pid: "01", bytes: 4, name: "dtc_cnt",      description: "Monitor status since DTCs cleared", min: 0, max: 0, unit: "Bit Encoded", convertToUseful4: obdinfo.convertDTCCheck, isDefault:false},
        {mode: obdinfo.modeRealTime, pid: "02", bytes: 2, name: "dtcfrzf",      description: "DTC that caused required freeze frame data storage", min: 0, max: 0, unit: "Bit Encoded", convertToUseful2: obdinfo.bitDecoder, isDefault:false},
        {mode: obdinfo.modeRealTime, pid: "03", bytes: 2, name: "fuelsys",      description: "Fuel system 1 and 2 status", min: 0, max: 0, unit: "Bit Encoded", convertToUseful2: obdinfo.convertFuelSystem, isDefault:false},
        {mode: obdinfo.modeRealTime, pid: "04", bytes: 1, name: "load_pct",     description: "Calculated LOAD Value", min: 0, max: 100, unit: "%", convertToUseful: obdinfo.convertLoad, isDefault:false},
        {mode: obdinfo.modeRealTime, pid: "05", bytes: 1, name: "temp",         description: "Engine Coolant Temperature", min: -40, max: 215, unit: "°C", convertToUseful: obdinfo.convertTemp, isDefault:true},
        {mode: obdinfo.modeRealTime, pid: "06", bytes: 1, name: "shrtft13",     description: "Short Term Fuel Trim - Bank 1,3", min: -100, max: 99.22, unit: "%", convertToUseful: obdinfo.convertFuelTrim, isDefault:false},
        {mode: obdinfo.modeRealTime, pid: "07", bytes: 1, name: "longft13",     description: "Long Term Fuel Trim - Bank 1,3", min: -100, max: 99.22, unit: "%", convertToUseful: obdinfo.convertFuelTrim, isDefault:false},
        {mode: obdinfo.modeRealTime, pid: "08", bytes: 1, name: "shrtft24",     description: "Short Term Fuel Trim - Bank 2,4", min: -100, max: 99.22, unit: "%", convertToUseful: obdinfo.convertFuelTrim, isDefault:false},
        {mode: obdinfo.modeRealTime, pid: "09", bytes: 1, name: "longft24",     description: "Long Term Fuel Trim - Bank 2,4", min: -100, max: 99.22, unit: "%", convertToUseful: obdinfo.convertFuelTrim, isDefault:false},
        {mode: obdinfo.modeRealTime, pid: "0A", bytes: 1, name: "frp",          description: "Fuel Pressure", min: 0, max: 765, unit: "kPa", convertToUseful: obdinfo.convertFuelRailPressure, isDefault:false},
        {mode: obdinfo.modeRealTime, pid: "0B", bytes: 1, name: "map",          description: "Intake Manifold Absolute Pressure", min: 0, max: 255, unit: "kPa", convertToUseful: obdinfo.convertIntakePressure, isDefault:false},
        {mode: obdinfo.modeRealTime, pid: "0C", bytes: 2, name: "rpm",          description: "Engine RPM", min: 0, max: 16383.75, unit: "RPM", convertToUseful2: obdinfo.convertRPM, isDefault:true},
        {mode: obdinfo.modeRealTime, pid: "0D", bytes: 1, name: "vss",          description: "Vehicle Speed Sensor", min: 0, max: 255, unit: "km/h", convertToUseful: obdinfo.convertSpeed, isDefault:true},
        {mode: obdinfo.modeRealTime, pid: "0E", bytes: 1, name: "sparkadv",     description: "Ignition Timing Advance for #1 Cylinder", min: -64, max: 63.5, unit: "degrees relative to #1 cylinder",  convertToUseful: obdinfo.convertSparkAdvance, isDefault:false},
        {mode: obdinfo.modeRealTime, pid: "0F", bytes: 1, name: "iat",          description: "Intake Air Temperature", min: -40, max: 215, unit: "°C", convertToUseful: obdinfo.convertTemp, isDefault:false},
        {mode: obdinfo.modeRealTime, pid: "10", bytes: 2, name: "maf",          description: "Air Flow Rate from Mass Air Flow Sensor", min: 0, max: 655.35, unit: "g/s", convertToUseful2: obdinfo.convertAirFlowRate, isDefault:false},
        {mode: obdinfo.modeRealTime, pid: "11", bytes: 1, name: "throttlepos",  description: "Absolute Throttle Position", min: 1, max: 100, unit: "%", convertToUseful: obdinfo.convertThrottlePos, isDefault:true},
        {mode: obdinfo.modeRealTime, pid: "12", bytes: 1, name: "air_stat",     description: "Commanded Secondary Air Status", min: 0, max: 0, unit: "Bit Encoded", convertToUseful: obdinfo.bitDecoder, isDefault:false},
        {mode: obdinfo.modeRealTime, pid: "13", bytes: 1, name: "o2sloc",       description: "Location of Oxygen Sensors", min: 0, max: 0, unit: "Bit Encoded", convertToUseful: obdinfo.bitDecoder, isDefault:false},
        {mode: obdinfo.modeRealTime, pid: "14", bytes: 2, name: "o2s11",        description: "Bank 1 - Sensor 1/Bank 1 - Sensor 1 Oxygen Sensor Output Voltage / Short Term Fuel Trim", min: 0, max: 1.275, unit: "V", convertToUseful2: obdinfo.convertOxygenSensorOutput, isDefault:false},
        {mode: obdinfo.modeRealTime, pid: "15", bytes: 2, name: "o2s12",        description: "Bank 1 - Sensor 2/Bank 1 - Sensor 2 Oxygen Sensor Output Voltage / Short Term Fuel Trim", min: 0, max: 1.275, unit: "V", convertToUseful2: obdinfo.convertOxygenSensorOutput, isDefault:false},
        {mode: obdinfo.modeRealTime, pid: "16", bytes: 2, name: "o2s13",        description: "Bank 1 - Sensor 3/Bank 2 - Sensor 1 Oxygen Sensor Output Voltage / Short Term Fuel Trim", min: 0, max: 1.275, unit: "V", convertToUseful2: obdinfo.convertOxygenSensorOutput, isDefault:false},
        {mode: obdinfo.modeRealTime, pid: "17", bytes: 2, name: "o2s14",        description: "Bank 1 - Sensor 4/Bank 2 - Sensor 2 Oxygen Sensor Output Voltage / Short Term Fuel Trim", min: 0, max: 1.275, unit: "V", convertToUseful2: obdinfo.convertOxygenSensorOutput, isDefault:false},
        {mode: obdinfo.modeRealTime, pid: "18", bytes: 2, name: "o2s21",        description: "Bank 2 - Sensor 1/Bank 3 - Sensor 1 Oxygen Sensor Output Voltage / Short Term Fuel Trim", min: 0, max: 1.275, unit: "V", convertToUseful2: obdinfo.convertOxygenSensorOutput, isDefault:false},
        {mode: obdinfo.modeRealTime, pid: "19", bytes: 2, name: "o2s22",        description: "Bank 2 - Sensor 2/Bank 3 - Sensor 2 Oxygen Sensor Output Voltage / Short Term Fuel Trim", min: 0, max: 1.275, unit: "V", convertToUseful2: obdinfo.convertOxygenSensorOutput, isDefault:false},
        {mode: obdinfo.modeRealTime, pid: "1A", bytes: 2, name: "o2s23",        description: "Bank 2 - Sensor 3/Bank 4 - Sensor 1 Oxygen Sensor Output Voltage / Short Term Fuel Trim", min: 0, max: 1.275, unit: "V", convertToUseful2: obdinfo.convertOxygenSensorOutput, isDefault:false},
        {mode: obdinfo.modeRealTime, pid: "1B", bytes: 2, name: "o2s24",        description: "Bank 2 - Sensor 4/Bank 4 - Sensor 2 Oxygen Sensor Output Voltage / Short Term Fuel Trim", min: 0, max: 1.275, unit: "V", convertToUseful2: obdinfo.convertOxygenSensorOutput, isDefault:false},
        {mode: obdinfo.modeRealTime, pid: "1C", bytes: 1, name: "obdsup",       description: "OBD requirements to which vehicle is designed", min: 0, max: 0, unit: "Bit Encoded", convertToUseful: obdinfo.bitDecoder, isDefault:false},
        {mode: obdinfo.modeRealTime, pid: "1D", bytes: 1, name: "o2sloc2",      description: "Location of oxygen sensors", min: 0, max: 0, unit: "Bit Encoded", convertToUseful: obdinfo.bitDecoder, isDefault:false},
        {mode: obdinfo.modeRealTime, pid: "1E", bytes: 1, name: "pto_stat",     description: "Auxiliary Input Status", min: 0, max: 0, unit: "Bit Encoded", convertToUseful: obdinfo.bitDecoder, isDefault:false},
        {mode: obdinfo.modeRealTime, pid: "1F", bytes: 2, name: "runtm",        description: "Time Since Engine Start", min: 0, max: 65535, unit: "sec.", convertToUseful2: obdinfo.convertRuntime, isDefault:true},
        {mode: obdinfo.modeRealTime, pid: "20", bytes: 4, name: "piddsupp2",    description: "PIDs supported 21-40", min: 0, max: 0, unit: "Bit Encoded", convertToUseful4: obdinfo.convertPIDSupported, isDefault:false},
        {mode: obdinfo.modeRealTime, pid: "21", bytes: 2, name: "mil_dist",     description: "Distance Travelled While MIL is Activated", min: 0, max: 65535, unit: "km", convertToUseful2: obdinfo.convertRuntime, isDefault:false},
        {mode: obdinfo.modeRealTime, pid: "22", bytes: 2, name: "frpm",         description: "Fuel Rail Pressure relative to manifold vacuum", min: 0, max: 5177.265, unit: "kPa", convertToUseful2: obdinfo.convertfrpm, isDefault:false},
        {mode: obdinfo.modeRealTime, pid: "23", bytes: 2, name: "frpd",         description: "Fuel Rail Pressure (diesel)", min: 0, max: 655350, unit: "kPa", convertToUseful2: obdinfo.convertfrpd, isDefault:false},
        {mode: obdinfo.modeRealTime, pid: "24", bytes: 4, name: "lambda11",     description: "Bank 1 - Sensor 1/Bank 1 - Sensor 1 (wide range O2S) Oxygen Sensors Equivalence Ratio (lambda) / Voltage", min: 0, max: 2, unit: "(ratio)", convertToUseful4: obdinfo.convertLambda, isDefault:false},
        {mode: obdinfo.modeRealTime, pid: "25", bytes: 4, name: "lambda12",     description: "Bank 1 - Sensor 2/Bank 1 - Sensor 2 (wide range O2S) Oxygen Sensors Equivalence Ratio (lambda) / Voltage", min: 0, max: 2, unit: "(ratio)", convertToUseful4: obdinfo.convertLambda, isDefault:false},
        {mode: obdinfo.modeRealTime, pid: "26", bytes: 4, name: "lambda13",     description: "Bank 1 - Sensor 3 /Bank 2 - Sensor 1(wide range O2S) Oxygen Sensors Equivalence Ratio (lambda) / Voltage", min: 0, max: 2, unit: "(ratio)", convertToUseful4: obdinfo.convertLambda, isDefault:false},
        {mode: obdinfo.modeRealTime, pid: "27", bytes: 4, name: "lambda14",     description: "Bank 1 - Sensor 4 /Bank 2 - Sensor 2(wide range O2S) Oxygen Sensors Equivalence Ratio (lambda) / Voltage", min: 0, max: 2, unit: "(ratio)", convertToUseful4: obdinfo.convertLambda, isDefault:false},
        {mode: obdinfo.modeRealTime, pid: "28", bytes: 4, name: "lambda21",     description: "Bank 2 - Sensor 1 /Bank 3 - Sensor 1(wide range O2S) Oxygen Sensors Equivalence Ratio (lambda) / Voltage", min: 0, max: 2, unit: "(ratio)", convertToUseful4: obdinfo.convertLambda, isDefault:false},
        {mode: obdinfo.modeRealTime, pid: "29", bytes: 4, name: "lambda22",     description: "Bank 2 - Sensor 2 /Bank 3 - Sensor 2(wide range O2S) Oxygen Sensors Equivalence Ratio (lambda) / Voltage", min: 0, max: 2, unit: "(ratio)", convertToUseful4: obdinfo.convertLambda, isDefault:false},
        {mode: obdinfo.modeRealTime, pid: "2A", bytes: 4, name: "lambda23",     description: "Bank 2 - Sensor 3 /Bank 4 - Sensor 1(wide range O2S) Oxygen Sensors Equivalence Ratio (lambda) / Voltage", min: 0, max: 2, unit: "(ratio)", convertToUseful4: obdinfo.convertLambda, isDefault:false},
        {mode: obdinfo.modeRealTime, pid: "2B", bytes: 4, name: "lambda24",     description: "Bank 2 - Sensor 4 /Bank 4 - Sensor 2(wide range O2S) Oxygen Sensors Equivalence Ratio (lambda) / Voltage", min: 0, max: 2, unit: "(ratio)", convertToUseful4: obdinfo.convertLambda, isDefault:false},
        {mode: obdinfo.modeRealTime, pid: "2C", bytes: 1, name: "egr_pct",      description: "Commanded EGR", min: 0, max: 100, unit: "%", convertToUseful: obdinfo.convertPercentA, isDefault:false},
        {mode: obdinfo.modeRealTime, pid: "2D", bytes: 1, name: "egr_err",      description: "EGR Error", min: -100, max: 99.22, unit: "%", convertToUseful: obdinfo.convertPercentB, isDefault:false},
        {mode: obdinfo.modeRealTime, pid: "2E", bytes: 1, name: "evap_pct",     description: "Commanded Evaporative Purge", min: 0, max: 100, unit: "%", convertToUseful: obdinfo.convertPercentA, isDefault:false},
        {mode: obdinfo.modeRealTime, pid: "2F", bytes: 1, name: "fli",          description: "Fuel Level Input", min: 0, max: 100, unit: "%", convertToUseful: obdinfo.convertPercentA, isDefault:true},
        {mode: obdinfo.modeRealTime, pid: "30", bytes: 1, name: "warm_ups",     description: "Number of warm-ups since diagnostic trouble codes cleared", min: 0, max: 255, unit: "", convertToUseful: obdinfo.bitDecoder, isDefault:false},
        {mode: obdinfo.modeRealTime, pid: "31", bytes: 2, name: "clr_dist",     description: "Distance since diagnostic trouble codes cleared", min: 0, max: 65535, unit: "km", convertToUseful2: obdinfo.convertDistanceSinceCodesCleared, isDefault:false},
        // <-- pending
        {mode: obdinfo.modeRealTime, pid: "32", bytes: 2, name: "evap_vp",      description: "Evap System Vapour Pressure", min: -8192, max: 8192, unit: "Pa", convertToUseful2: obdinfo.bitDecoder, isDefault:false},
        // pending -->
        {mode: obdinfo.modeRealTime, pid: "33", bytes: 1, name: "baro",         description: "Barometric Pressure", min: 0, max: 255, unit: "kPa", convertToUseful: obdinfo.bitDecoder, isDefault:false},
        {mode: obdinfo.modeRealTime, pid: "34", bytes: 4, name: "lambdac11",    description: "Bank 1 - Sensor 1/Bank 1 - Sensor 1 (wide range O2S) Oxygen Sensors Equivalence Ratio (lambda) / Current", min: 0, max: 2, unit: "(ratio)", convertToUseful4: obdinfo.convertLambda2, isDefault:false},
        {mode: obdinfo.modeRealTime, pid: "35", bytes: 4, name: "lambdac12",    description: "Bank 1 - Sensor 2/Bank 1 - Sensor 2 (wide range O2S) Oxygen Sensors Equivalence Ratio (lambda) / Current", min: 0, max: 2, unit: "(ratio)", convertToUseful4: obdinfo.convertLambda2, isDefault:false},
        {mode: obdinfo.modeRealTime, pid: "36", bytes: 4, name: "lambdac13",    description: "Bank 1 - Sensor 3/Bank 2 - Sensor 1 (wide range O2S) Oxygen Sensors Equivalence Ratio (lambda) / Current", min: 0, max: 2, unit: "(ratio)", convertToUseful4: obdinfo.convertLambda2, isDefault:false},
        {mode: obdinfo.modeRealTime, pid: "37", bytes: 4, name: "lambdac14",    description: "Bank 1 - Sensor 4/Bank 2 - Sensor 2 (wide range O2S) Oxygen Sensors Equivalence Ratio (lambda) / Current", min: 0, max: 2, unit: "(ratio)", convertToUseful4: obdinfo.convertLambda2, isDefault:false},
        {mode: obdinfo.modeRealTime, pid: "38", bytes: 4, name: "lambdac21",    description: "Bank 2 - Sensor 1/Bank 3 - Sensor 1 (wide range O2S) Oxygen Sensors Equivalence Ratio (lambda) / Current", min: 0, max: 2, unit: "(ratio)", convertToUseful4: obdinfo.convertLambda2, isDefault:false},
        {mode: obdinfo.modeRealTime, pid: "39", bytes: 4, name: "lambdac22",    description: "Bank 2 - Sensor 2/Bank 3 - Sensor 2 (wide range O2S) Oxygen Sensors Equivalence Ratio (lambda) / Current", min: 0, max: 2, unit: "(ratio)", convertToUseful4: obdinfo.convertLambda2, isDefault:false},
        {mode: obdinfo.modeRealTime, pid: "3A", bytes: 4, name: "lambdac23",    description: "Bank 2 - Sensor 3/Bank 4 - Sensor 1 (wide range O2S) Oxygen Sensors Equivalence Ratio (lambda) / Current", min: 0, max: 2, unit: "(ratio)", convertToUseful4: obdinfo.convertLambda2, isDefault:false},
        {mode: obdinfo.modeRealTime, pid: "3B", bytes: 4, name: "lambdac24",    description: "Bank 2 - Sensor 4/Bank 4 - Sensor 2 (wide range O2S) Oxygen Sensors Equivalence Ratio (lambda) / Current", min: 0, max: 2, unit: "(ratio)", convertToUseful4: obdinfo.convertLambda2, isDefault:false},
        {mode: obdinfo.modeRealTime, pid: "3C", bytes: 2, name: "catemp11",     description: "Catalyst Temperature Bank 1 /  Sensor 1", min: -40, max: 6513.5, unit: "°C", convertToUseful2: obdinfo.convertCatalystTemperature, isDefault:false},
        {mode: obdinfo.modeRealTime, pid: "3D", bytes: 2, name: "catemp21",     description: "Catalyst Temperature Bank 2 /  Sensor 1", min: -40, max: 6513.5, unit: "°C", convertToUseful2: obdinfo.convertCatalystTemperature, isDefault:false},
        {mode: obdinfo.modeRealTime, pid: "3E", bytes: 2, name: "catemp12",     description: "Catalyst Temperature Bank 1 /  Sensor 2", min: -40, max: 6513.5, unit: "°C", convertToUseful2: obdinfo.convertCatalystTemperature, isDefault:false},
        {mode: obdinfo.modeRealTime, pid: "3F", bytes: 2, name: "catemp22",     description: "Catalyst Temperature Bank 2 /  Sensor 2", min: -40, max: 6513.5, unit: "°C", convertToUseful2: obdinfo.convertCatalystTemperature, isDefault:false},
    
        {mode: obdinfo.modeRealTime, pid: "40", bytes: 4, name: "piddsupp4",    description: "PIDs supported 41-60", min: 0, max: 0, unit: "Bit Encoded", convertToUseful4: obdinfo.convertPIDSupported, isDefault:false},
        // <-- pending
        {mode: obdinfo.modeRealTime, pid: "41", bytes: 4, name: "monitorstat",  description: "Monitor status this driving cycle", min: 0, max: 0, unit: "Bit Encoded", convertToUseful: obdinfo.bitDecoder, isDefault:false},
        // pending -->
        {mode: obdinfo.modeRealTime, pid: "42", bytes: 2, name: "vpwr",         description: "Control module voltage", min: 0, max: 65535, unit: "V", convertToUseful2: obdinfo.convertControlModuleVoltage, isDefault:false},
        {mode: obdinfo.modeRealTime, pid: "43", bytes: 2, name: "load_abs",     description: "Absolute Load Value", min: 0, max: 25700, unit: "%", convertToUseful2: obdinfo.convertAbsoluteLoad, isDefault:false},
        {mode: obdinfo.modeRealTime, pid: "44", bytes: 2, name: "lambda",       description: "Fuel/air Commanded Equivalence Ratio", min: 0, max: 2, unit: "(ratio)", convertToUseful2: obdinfo.convertLambda3, isDefault:false},
        {mode: obdinfo.modeRealTime, pid: "45", bytes: 1, name: "tp_r",         description: "Relative Throttle Position", min: 0, max: 100, unit: "%", convertToUseful: obdinfo.convertPercentA, isDefault:true},
        {mode: obdinfo.modeRealTime, pid: "46", bytes: 1, name: "aat",          description: "Ambient air temperature", min: -40, max: 215, unit: "°C", convertToUseful: obdinfo.convertAmbientAirTemp, isDefault:true},
        {mode: obdinfo.modeRealTime, pid: "47", bytes: 1, name: "tp_b",         description: "Absolute Throttle Position B", min: 0, max: 100, unit: "%", convertToUseful: obdinfo.convertPercentA, isDefault:false},
        {mode: obdinfo.modeRealTime, pid: "48", bytes: 1, name: "tp_c",         description: "Absolute Throttle Position C", min: 0, max: 100, unit: "%", convertToUseful: obdinfo.convertPercentA, isDefault:false},
        {mode: obdinfo.modeRealTime, pid: "49", bytes: 1, name: "app_d",        description: "Accelerator Pedal Position D", min: 0, max: 100, unit: "%", convertToUseful: obdinfo.convertPercentA, isDefault:false},
        {mode: obdinfo.modeRealTime, pid: "4A", bytes: 1, name: "app_e",        description: "Accelerator Pedal Position E", min: 0, max: 100, unit: "%", convertToUseful: obdinfo.convertPercentA, isDefault:false},
        {mode: obdinfo.modeRealTime, pid: "4B", bytes: 1, name: "app_f",        description: "Accelerator Pedal Position F", min: 0, max: 100, unit: "%", convertToUseful: obdinfo.convertPercentA, isDefault:false},
        {mode: obdinfo.modeRealTime, pid: "4C", bytes: 1, name: "tac_pct",      description: "Commanded Throttle Actuator Control", min: 0, max: 100, unit: "%", convertToUseful: obdinfo.convertPercentA, isDefault:false},
        {mode: obdinfo.modeRealTime, pid: "4D", bytes: 2, name: "mil_time",     description: "Time run by the engine while MIL activated", min: 0, max: 65535, unit: "minutes", convertToUseful2: obdinfo.convertMinutes, isDefault:false},
        {mode: obdinfo.modeRealTime, pid: "4E", bytes: 2, name: "clr_time",     description: "Time since diagnostic trouble codes cleared", min: 0, max: 65535, unit: "minutes", convertToUseful2: obdinfo.convertMinutes, isDefault:false},
        {mode: obdinfo.modeRealTime, pid: "4F", bytes: 4, name: "exttest1",     description: "External Test Equipment Configuration #1", min: 0, max: 0, unit: "Bit Encoded", convertToUseful4: obdinfo.convertExternalTestEquipment, isDefault:false},
        {mode: obdinfo.modeRealTime, pid: "50", bytes: 4, name: "exttest2",     description: "External Test Equipment Configuration #2", min: 0, max: 0, unit: "Bit Encoded", convertToUseful4: obdinfo.convertExternalTestEquipment2, isDefault:false},
        {mode: obdinfo.modeRealTime, pid: "51", bytes: 1, name: "fuel_type",    description: "Fuel Type", min: 0, max: 0, unit: "Bit Encoded", convertToUseful: obdinfo.bitDecoder, isDefault:false},
        {mode: obdinfo.modeRealTime, pid: "52", bytes: 1, name: "alch_pct",     description: "Ethanol fuel %", min: 0, max: 100, unit: "%", convertToUseful: obdinfo.convertPercentA, isDefault:false},
        {mode: obdinfo.modeRealTime, pid: "53", bytes: 2, name: "abs_vp",       description: "Absolute Evap system Vapor Pressure", min: 0, max: 327675, unit: "kPa", convertToUseful2: obdinfo.convertAbsoluteVaporPressure, isDefault:false},
        {mode: obdinfo.modeRealTime, pid: "54", bytes: 2, name: "system_vp",    description: "Evap system vapor pressure", min: -32767, max: 32767, unit: "Pa", convertToUseful2: obdinfo.convertSystemVaporPressure, isDefault:false},
        {mode: obdinfo.modeRealTime, pid: "55", bytes: 2, name: "s02b13",       description: "Short term secondary oxygen sensor trim bank 1 and bank 3", min: -100, max: 99.22, unit: "%", convertToUseful2: obdinfo.convertShortOxygenSensorOutput, isDefault:false},
        {mode: obdinfo.modeRealTime, pid: "56", bytes: 2, name: "l02b13",       description: "Long term secondary oxygen sensor trim bank 1 and bank 3", min: -100, max: 99.22, unit: "%", convertToUseful2: obdinfo.convertShortOxygenSensorOutput, isDefault:false},
        {mode: obdinfo.modeRealTime, pid: "57", bytes: 2, name: "s02b24",       description: "Short term secondary oxygen sensor trim bank 2 and bank 4", min: -100, max: 99.22, unit: "%", convertToUseful2: obdinfo.convertShortOxygenSensorOutput, isDefault:false},
        {mode: obdinfo.modeRealTime, pid: "58", bytes: 2, name: "l02b24",       description: "Long term secondary oxygen sensor trim bank 2 and bank 4", min: -100, max: 99.22, unit: "%", convertToUseful2: obdinfo.convertShortOxygenSensorOutput, isDefault:false},
        {mode: obdinfo.modeRealTime, pid: "59", bytes: 2, name: "frp_abs",      description: "Fuel rail pressure (absolute)", min: 0, max: 655350, unit: "kPa", convertToUseful2: obdinfo.convertFuelRailPressureAbs, isDefault:false},
        {mode: obdinfo.modeRealTime, pid: "5A", bytes: 1, name: "pedalpos",     description: "Relative accelerator pedal position", min: 0, max: 100, unit: "%", convertToUseful: obdinfo.convertPercentA, isDefault:false},
        {mode: obdinfo.modeRealTime, pid: "5B", bytes: 1, name: "hybridlife",   description: "Hybrid battery pack remaining life", min: 0, max: 100, unit: "%", convertToUseful: obdinfo.convertPercentA, isDefault:false},
        {mode: obdinfo.modeRealTime, pid: "5C", bytes: 1, name: "engineoilt",   description: "Engine oil temperature", min: -40, max: 210, unit: "°C", convertToUseful: obdinfo.convertTemp, isDefault:true},
        {mode: obdinfo.modeRealTime, pid: "5D", bytes: 2, name: "finjtiming",   description: "Fuel injection timing", min: -210.00, max: 301.992, unit: "°", convertToUseful2: obdinfo.convertFuelInjectionTiming, isDefault:true},
        {mode: obdinfo.modeRealTime, pid: "5E", bytes: 2, name: "enginefrate",  description: "Engine fuel rate", min: 0, max: 3212.75, unit: "L/h", convertToUseful2: obdinfo.convertEngineFuelRate, isDefault:true},
        {mode: obdinfo.modeRealTime, pid: "5F", bytes: 1, name: "emmissionreq", description: "Emission requirements to which vehicle is designed", min: 0, max: 0, unit: "Bit Encoded", convertToUseful: obdinfo.bitDecoder, isDefault:false},
    
        //added some new pid entries
        {mode: obdinfo.modeRealTime, pid: "62", bytes: 1, name: "aet",          description: "Actual engine - percent torque", min: -125, max: 125, unit: "%", convertToUseful: obdinfo.convertEngineTorque, isDefault:true},
        {mode: obdinfo.modeRealTime, pid: "67", bytes: 3, name: "ect",          description: "Engine coolant temperature", min: -40, max: 215, unit: "°C", isDefault:true},
        {mode: obdinfo.modeRealTime, pid: "6B", bytes: 5, name: "egrt",         description: "Exhaust gas recirculation temperature", min: -40, max: 215, unit: "°C", isDefault:false},
        {mode: obdinfo.modeRealTime, pid: "6D", bytes: 6, name: "fpc",          description: "Fuel pressure control system", min: -40, max: 215, unit: "°C", convertToUseful6: obdinfo.notSupported,isDefault:false},
        {mode: obdinfo.modeRealTime, pid: "6E", bytes: 5, name: "ipct",         description: "Injection pressure control system", min: -40, max: 215, unit: "°C", isDefault:false},
        {mode: obdinfo.modeRealTime, pid: "73", bytes: 5, name: "ep",           description: "Exhaust pressure", min: -40, max: 215, unit: "°C", isDefault:false},
        {mode: obdinfo.modeRealTime, pid: "78", bytes: 2, name: "egt",          description: "Exhaust Gas temperature Bank 1", min: -40, max: 215, unit: "°C", convertToUseful2: obdinfo.convertExhastGasTemperature, isDefault:false},
    
    
    
        //DTC's
        {mode: obdinfo.modeRequestDTC, pid: undefined, bytes: 6, name: "requestdtc", description: "Requested DTC", convertToUseful6: obdinfo.convertDTCRequest, isDefault:false}, //n*6 --> For each code, 6 bytes.
        {mode: obdinfo.modeClearDTC, pid: undefined, bytes: 0, name: "cleardtc", description: "Clear Trouble Codes (Clear engine light)", convertToUseful: obdinfo.notSupported, isDefault:false},
    
        //VIN
        {mode: obdinfo.modeVin, pid: "00", bytes: 4, name: "vinsupp0", description: "Vehicle Identification Number", convertToUseful4: obdinfo.bitDecoder, isDefault:false},
        {mode: obdinfo.modeVin, pid: "01", bytes: 1, name: "vin_mscout", description: "VIN message count", convertToUseful: obdinfo.convertVIN_count, isDefault:false},
        {mode: obdinfo.modeVin, pid: "02", bytes: 1, name: "vin", description: "Vehicle Identification Number", convertToUseful: obdinfo.convertVIN, isDefault:false}
    ];

 
 public checkHex(n){
    return/^[0-9A-Fa-f]{1,64}$/.test(n);
}
 Hex2Bin(n){
    if(!this.checkHex(n)){
        return 0;
    }
    return this.zeroFill(parseInt(n,16).toString(2),4);
}
 zeroFill( number, width ){
  width -= number.toString().length;
  if ( width > 0 ){
    return new Array( width + (/\./.test( number ) ? 2 : 1) ).join( '0' ) + number;
  }
  return number + ""; // always return a string
}
public static bitDecoder(byte) {
    return parseInt(byte, 2);
}
public static convertPIDSupported(byteA, byteB, byteC, byteD) {
    var hexstring = byteA + byteB + byteC + byteD;
    var pidHex = hexstring.split('');
    var pidStatus = [];
    pidHex.forEach(function(hex){
        var hexPerm = this.Hex2Bin(hex).split('');
        hexPerm.forEach(function(perm){
            pidStatus.push( perm === "1" ? true : false );
        });
    });
    return pidStatus;
}
public static convertFuelSystem(byteA, byteB){
    var reply = {system1:0,system2:0};
    reply.system1 = obdinfo.bitDecoder(byteA);
    if( byteB ){
        reply.system2 = obdinfo.bitDecoder(byteB);
    }
    return reply.system1;
}
public static convertDTCCheck(byteA, byteB, byteC, byteD) {
    //ByteB, ByteC and ByteD are not read. These bytes are for testing purposes, which is not supported in this module.
    var byteValue, mil, numberOfDTCs, reply;
    byteValue = parseInt(byteA, 16);
    if ((byteValue >> 7) === 1) {
        mil = 1;
    } else {
        mil = 0;
    }
    numberOfDTCs = byteValue % 128;
    reply = {};
    reply.numberOfErrors = numberOfDTCs;
    reply.mil = mil;
    return reply;
}
public static convertDTCRequest(byteA, byteB, byteC, byteD, byteE, byteF) {
    var reply = {errors:[]};
    reply.errors = [];

    var decodeDTCCode = (byte1, byte2) => {
        var codeString = "", firstChar;

        //If 00 00 --> No code.
        if ((byte1 === '00') && (byte2 === '00')) {
            return '-';
        }

        var firstByte = parseInt(byte1, 16);
        var firstCharBytes = firstByte >> 6;
        switch(firstCharBytes) {
            case 0:
                firstChar = 'P';
                break;
            case 1:
                firstChar = 'C';
                break;
            case 2:
                firstChar = 'B';
                break;
            case 3:
                firstChar = 'U';
                break;
            default:
                console.log('Error with DTC');
                break;
        }
        var secondChar = (firstByte >> 4) % 4;
        var thirdChar = firstByte % 16;
        codeString = firstChar + secondChar + thirdChar + byte2;
        return codeString;
    };

    reply.errors[0] = decodeDTCCode(byteA, byteB);
    reply.errors[1] = decodeDTCCode(byteC, byteD);
    reply.errors[2] = decodeDTCCode(byteE, byteF);
    return reply;
}
public static convertLoad(byte) {
    return parseInt(byte, 16) * (100 / 256);
}
public static convertTemp(byte) {
    return parseInt(byte, 16) - 40;
}
public static convertFuelTrim(byte) {
    return (parseInt(byte, 16) - 128) * (100 / 128);
}
public static convertFuelRailPressure(byte) {
    return parseInt(byte, 16) * 3;
}
public static convertIntakePressure(byte) {
    return parseInt(byte, 16);
}
public static convertRPM(byteA, byteB) {
    return ((parseInt(byteA, 16) * 256) + parseInt(byteB, 16)) / 4;
}
public static convertSpeed(byte) {
    return parseInt(byte, 16);
}
public static convertSparkAdvance(byte) {
    return (parseInt(byte, 16) / 2) - 64;
}
public static convertAirFlowRate(byteA, byteB) {
    return ((parseInt(byteA, 16) * 256.0) + parseInt(byteB, 16)) / 100;
}
public static convertThrottlePos(byte) {
    return (parseInt(byte, 16) * 100) / 255;
}
public static convertOxygenSensorOutput(byte) {
    return parseInt(byte, 16) * 0.005;
}
public static convertRuntime(byteA, byteB){
    return (parseInt(byteA, 16) * 256.0) + parseInt(byteB, 16);
}
public static convertfrpm(byteA, byteB){
    return ((parseInt(byteA, 16) * 256) + parseInt(byteB, 16)) * 0.079;
}
public static convertfrpd(byteA, byteB){
    return ((parseInt(byteA, 16) * 256) + parseInt(byteB, 16)) * 10;
}
public static convertLambda(byteA, byteB, byteC, byteD){
    var reply = {ratio:0,voltage:0};
    reply.ratio = ((parseInt(byteA, 16) * 256) + parseInt(byteB, 16)) * 2 / 65535;
    reply.voltage = ((parseInt(byteC, 16) * 256) + parseInt(byteD, 16)) * 8 / 65535;
    return reply;
}
public static convertPercentA(byte){
    return parseInt(byte, 16) * 100 / 255;
}
public static convertPercentB(byte){
    return (parseInt(byte, 16) - 128) * 100 / 128;
}
public static convertDistanceSinceCodesCleared(byteA, byteB){
    return (parseInt(byteA, 16) * 256) + parseInt(byteB, 16);
}
public static convertLambda2(byteA, byteB, byteC, byteD){
    var reply = {ratio:0,voltage:0};
    reply.ratio = ((parseInt(byteA, 16) * 256) + parseInt(byteB, 16)) / 32768;
    reply.voltage = ((parseInt(byteC, 16) * 256) + parseInt(byteD, 16)) / 256 - 128;
    return reply;
}
public static convertCatalystTemperature(byteA, byteB){
    return ((parseInt(byteA, 16) * 256) + parseInt(byteB, 16)) / 10 - 40;
}
public static convertControlModuleVoltage(byteA, byteB){
    return ((parseInt(byteA, 16) * 256) + parseInt(byteB, 16)) / 1000;
}
public static convertAbsoluteLoad(byteA, byteB){
    return ((parseInt(byteA, 16) * 256) + parseInt(byteB, 16)) * 100 / 255;
}
public static convertLambda3(byteA, byteB){
    return ((parseInt(byteA, 16) * 256) + parseInt(byteB, 16)) / 32768;
}
public static convertAmbientAirTemp(byte){
    return parseInt(byte, 16) - 40;
}
public static convertMinutes(byteA, byteB){
    return (parseInt(byteA, 16) * 256) + parseInt(byteB, 16);
}
public static convertExternalTestEquipment(byteA, byteB, byteC, byteD){
    var reply = {te1:0,te2:0,te3:0,te4:0};
    reply.te1 = obdinfo.bitDecoder(byteA);
    reply.te2 = obdinfo.bitDecoder(byteB);
    reply.te3 = obdinfo.bitDecoder(byteC);
    reply.te4 = obdinfo.bitDecoder(byteD) * 10;
    return reply;
}
public static convertExternalTestEquipment2(byteA, byteB, byteC, byteD){
    var reply = {te1:0,te2:0,te3:0,te4:0};
    reply.te1 = this.bitDecoder(byteA) * 10;
    reply.te2 = this.bitDecoder(byteB);
    reply.te3 = this.bitDecoder(byteC);
    reply.te4 = this.bitDecoder(byteD);
    return reply;
}
public static convertAbsoluteVaporPressure(byteA, byteB){
    return ((parseInt(byteA, 16) * 256) + parseInt(byteB, 16)) / 200;
}
public static convertSystemVaporPressure(byteA, byteB){
    return ((parseInt(byteA, 16) * 256) + parseInt(byteB, 16)) - 32767;
}
public static convertShortOxygenSensorOutput(byteA, byteB){
    var reply = {bank1:0,bank2:0};
    reply.bank1 = (parseInt(byteA, 16) - 128) * 100 / 128;
    reply.bank2 = (parseInt(byteB, 16) - 128) * 100 / 128;
    return reply;
}
public static convertFuelRailPressureAbs(byteA, byteB) {
    return ((parseInt(byteA, 16) * 256) + parseInt(byteB, 16)) * 10;
}
public static convertFuelInjectionTiming(byteA, byteB) {
    return (((parseInt(byteA, 16) * 256) + parseInt(byteB, 16)) - 26880) / 128;
}
public static convertEngineFuelRate(byteA, byteB) {
    return ((parseInt(byteA, 16) * 256) + parseInt(byteB, 16)) * 0.05;
}

public static convertEngineTorque(byte){
    return parseInt(byte, 16) - 125;
}
 
public static convertExhastGasTemperature(byteA, byteB){
    return (parseInt(byteA, 16) * 256 + parseInt(byteB, 16)) / 10 - 40;
}
//DTC
public static notSupported() {
   console.log("There is no answer. This should not be happening.");
   return;
}
//VIN
public static convertVIN_count(byte) {
    return byte;
}
public static convertVIN(byte) {
    byte = byte.split("");
    var tmp=[], vin="";
    for(var i in byte){
        tmp[i] = parseInt(byte[i]);
        tmp[i] = parseInt(tmp[i], 16);
        vin += String.fromCharCode(tmp[i]);
    }
    return vin;
}





}