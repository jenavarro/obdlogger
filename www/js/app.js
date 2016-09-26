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
 * Author: Javier Navarro
 */

/*global token,ionic,clearInterval,app,console, window,cordova,FileReader,async,XMLHttpRequest,alert,Connection,Blob, setinterval,navigator,angular,document,setInterval,PIDS,Buffer,callback,modeRealTime */
"use strict";

var bluetoothSerial;
var db = null;
var flag_uploading = false;


function onAppReady() {
    if( navigator.splashscreen && navigator.splashscreen.hide ) {   // Cordova API detected
        navigator.splashscreen.hide() ;
        console.log("APPREADY - Now the angular part will be bootstraped");
        angular.bootstrap(document, ['ionicApp']);
        db = window.sqlitePlugin.openDatabase({name: 'livemetrics.db', location: 'default'});
        setupdb();

    }
}

var setupdb = function(){

    //CREATE TABLE IF NOT EXISTS

        //db.executeSql('DROP TABLE livemetricstable', [], function(res){},function(err) {});
        db.executeSql('CREATE TABLE IF NOT EXISTS livemetricstable (rowid INTEGER PRIMARY KEY,ts INT, name text, value text)');

};

document.addEventListener("app.Ready", onAppReady, false) ;
document.addEventListener("online", onOnline, false);

var btGoogleSheetAPI ='';

var globalLog =[];
var globalLogEnabled = true;   // disable when generating a build
var btIntervalWriter;

var clearDB = function() {
    db.executeSql('DROP TABLE livemetricstable', [], function(res){
        setupdb();
    },function(err) {});

}
var pushGlobalLog = function(entry) {
    if (!globalLogEnabled) return;

    if (globalLog.length>99) {
        globalLog = globalLog.splice(0,1);
    }
    globalLog.push(entry);
};

var tryToUploadData = function() {
    flag_uploading = true;
    var url=btGoogleSheetAPI + '?';

    db.executeSql('SELECT * FROM livemetricstable', [], function(res){
            var tmpdocs =[];
            console.log('Row count from SELECT: ' + res.rows.length);
            for (var i = 0; i < res.rows.length; i++)
            {
                tmpdocs.push({rowid:res.rows.item(i).rowid, ts:res.rows.item(i).ts, name:res.rows.item(i).name, value:res.rows.item(i).value});
            }

            async.eachSeries(tmpdocs, function(item, callbackp) {
                var request = new XMLHttpRequest();
                var tmpurl = url + 'ts=' + item.ts + '&name=' + item.name + '&value=' + item.value;// + '&unit=' + item.unit;
                console.log(tmpurl);
                request.open('POST',tmpurl,true);
                request.onreadystatechange = function() {
                    if (request.readyState == 4) {
                        if (request.status == 200 || request.status === 0) {
                            db.executeSql('DELETE FROM livemetricstable WHERE rowid=?',[item.rowid], function(results){
                                return callbackp(null);
                                },function(err){
                                pushGlobalLog('Cannot delete row = ' + item.rowid);
                                return callbackp('Cannot delete row = ' + item.rowid);
                            });
                        } else {
                            return callbackp(request.status);
                        }
                    }
                };
                request.send();
            }, function(err, results) {
                if (!err) {
                    // Compact database
                    db.executeSql('VACUUM',[], function(results){
                            pushGlobalLog('DB was vacuumed');
                        },function(err){
                            pushGlobalLog('ERROR - DB NOT VACUUMed');
                        });
                    flag_uploading = false;
                    pushGlobalLog('processingfile finished succesefully');
                    callback(null, 'processingfile finished succesefully');
                } else {
                    flag_uploading = false;
                    pushGlobalLog('processingfile finished w/error');
                    callback(null, 'processingfile finished w/error');
                }
            });

    }, function(err){
    });
};

function onOnline() {
    var networkState = navigator.connection.type;
    if (networkState === Connection.WIFI && btGoogleSheetAPI!=='' ) {
            if (flag_uploading){
                console.log('Discarding duplicate trigger, still processing');
                return;
            }
            flag_uploading = true;
            pushGlobalLog('Connection type: ' + networkState + ' will attempt to upload cached data');
            tryToUploadData();
    }
}

//==================================================

var btGetDevices = function(callback) {
            bluetoothSerial.list(function(results) {
                    callback(results);
                },
                function(error) {
                    callback([]);
                }
            );
};


var btShowSettings = function(callback) {
    bluetoothSerial.showBluetoothSettings(
                function() {
                },
                function() {
                }
    );
};

var writeDelay = 50;
var btReceivedData = '';
var btLastCheckedReceivedData = '';
var receivedData='';
var btConnected=false;
var activePollers = [];
var pollerInterval;
var queue = [];

var btDataReceived = function (data) {
    var currentString, arrayOfCommands;

    currentString = receivedData + data.toString('utf8'); // making sure it's a utf8 string

    arrayOfCommands = currentString.split('>');

    var forString;
    if (arrayOfCommands.length < 2) {
        receivedData = arrayOfCommands[0];
    } else {
        for (var commandNumber = 0; commandNumber < arrayOfCommands.length; commandNumber++) {
            forString = arrayOfCommands[commandNumber];
            if (forString === '') {
                continue;
            }

            var multipleMessages = forString.split('\r');
            for (var messageNumber = 0; messageNumber < multipleMessages.length; messageNumber++) {
                var messageString = multipleMessages[messageNumber];
                if (messageString === '') {
                    continue;
                }
                var reply;
                reply = parseOBDCommand(messageString);
                btEventEmit('dataReceived', reply);
                receivedData = '';
            }
        }
    }
};


var btDataError = function (data) {
    console.log("Rec. Data ERROR: " + data);
};

var btConnectToDevice = function (id,callback) {
    bluetoothSerial.connect(id,
                    function() {
                        pushGlobalLog("connected succesful to " + id);
                        btConnected = true;
                        bluetoothSerial.subscribe('>',btDataReceived, btDataError);
                        init_communication();
                        callback(true);
                    },
                    function() {
                        console.log("NOT connected to " + id);
                        btConnected = false;
                        callback(false);
                    }
               );
};

var btLastReceivedData = '';

var inmemoryqty=0;
var inmemorylastdata=[];

//===========================================================================

var btEventEmit = function (event,text) {
    var pdata={};
    if (event==='dataReceived') {
        if ( text.value === 'NO DATA' || text.name === undefined || text.value === undefined) {
            return;
        }
        pushGlobalLog('New metric for ' + text.name);
        pdata = {ts:Date.now(),name:text.name,value:text.value};
        console.log(JSON.stringify(pdata));
        inmemorylastdata[text.name]=text.value;

        db.executeSql('INSERT INTO livemetricstable VALUES (?,?,?,?)', [null,pdata.ts, pdata.name, pdata.value], function(rs) {
          }, function(error) {
            console.log('Transaction ERROR: ' + error.message);
          });

    }
};

var btWrite = function(message, replies) {
            if (replies === undefined) {
                replies = 0;
            }
            if (btConnected) {
                if (queue.length < 256) {
                    if (replies !== 0) {
                        queue.push(message + replies + '\r');
                    } else {
                        queue.push(message + '\r');
                    }
                } else {
                    btEventEmit('error', 'Queue-overflow!');
                }
            } else {
                btEventEmit('error', 'Bluetooth device is not connected.');
            }
        };


var init_communication = function() {
    btWrite('ATZ');
    btWrite('ATL0');//Turns off extra line feed and carriage return
    btWrite('ATS0');//This disables spaces in in output, which is faster!
    btWrite('ATH0');//Turns off headers and checksum to be sent.
    btWrite('ATE0');//Turns off echo.
    btWrite('ATAT2');//Turn adaptive timing to 2. This is an aggressive learn curve for adjusting the timeout. Will make huge difference on slow systems.
    //Set timeout to 10 * 4 = 40msec, allows +20 queries per second. This is the maximum wait-time. ATAT will decide if it should wait shorter or not.
    //btWrite('ATST0A');
    btWrite('ATSP0');//Set the protocol to automatic.

    //Event connected
    btEventEmit('connected','');
    btConnected=true;
};
var enableIntervalWriter = function() {
    btIntervalWriter = setInterval(function () {
                    if (queue.length > 0 && btConnected)
                        try {
                            var writedata = queue.shift();
                            bluetoothSerial.write(writedata + '\r',
                                                  function(success){btEventEmit('wrote data ' , writedata);
                                                                              },
                                                  function (err) {
                                    btEventEmit('error', err);
                            });
                        } catch (err) {
                            btEventEmit('error', 'Error while writing: ' + err);
                            btEventEmit('error', 'OBD-II Listeners deactivated, connection is probably lost.');
                            clearInterval(btIntervalWriter);
                            removeAllPollers();
                        }
                }, writeDelay); //Updated with Adaptive Timing on ELM327. 20 queries a second seems good enough.
};


var btDisconnect = function () {
            clearInterval(btIntervalWriter);
            queue.length = 0; //Clears queue
            btConnected = false;
            bluetoothSerial.disconnect();
        };

var requestValueByName = function (name) {
            btWrite(getPIDByName(name));
        };
var getPIDByName = function(name) {
    var i;
    for (i = 0; i < PIDS.length; i++) {
        if (PIDS[i].name === name) {
            if (PIDS[i].pid !== undefined) {
                return (PIDS[i].mode + PIDS[i].pid);
            }
            //There are modes which don't require a extra parameter ID.
            return (PIDS[i].mode);
        }
    }
};

var addPoller = function (name) {
    var stringToSend = getPIDByName(name);
    activePollers.push(stringToSend);
};

var removePoller = function (name) {
    var stringToDelete = getPIDByName(name);
    var index = activePollers.indexOf(stringToDelete);
    activePollers.splice(index, 1);
};

var removeAllPollers = function () {
            activePollers.length = 0; //This does not delete the array, it just clears every element.
        };


var writePollers = function () {
    var i;
    for (i = 0; i < activePollers.length; i++) {
        btWrite(activePollers[i], 1);
    }
};

var startPolling = function (interval) {
    if (interval === undefined) {
        interval = activePollers.length * (writeDelay * 2); //Double the delay, so there's room for manual requests.
    }


    pollerInterval = setInterval(function () {
        writePollers();
    }, interval);
    enableIntervalWriter();
};

var stopPolling = function () {
    clearInterval(pollerInterval);
};

var parseOBDCommand = function (hexString) {
            var reply,
                byteNumber,
                valueArray; //New object

            reply = {};
            if (hexString === "NO DATA" || hexString === "OK" || hexString === "?" || hexString === "UNABLE TO CONNECT" || hexString === "SEARCHING...") {
                //No data or OK is the response, return directly.
                reply.value = hexString;
                return reply;
            }

            hexString = hexString.replace(/ /g, ''); //Whitespace trimming //Probably not needed anymore?
            valueArray = [];

            for (byteNumber = 0; byteNumber < hexString.length; byteNumber += 2) {
                valueArray.push(hexString.substr(byteNumber, 2));
            }

            if (valueArray[0] === "41") {
                reply.mode = valueArray[0];
                reply.pid = valueArray[1];
                for (var i = 0; i < PIDS.length; i++) {
                    if (PIDS[i].pid == reply.pid) {
                        var numberOfBytes = PIDS[i].bytes;
                        reply.name = PIDS[i].name;
                        switch (numberOfBytes) {
                            case 1:
                                reply.value = PIDS[i].convertToUseful(valueArray[2]);
                                break;
                            case 2:
                                reply.value = PIDS[i].convertToUseful(valueArray[2], valueArray[3]);
                                break;
                            case 4:
                                reply.value = PIDS[i].convertToUseful(valueArray[2], valueArray[3], valueArray[4], valueArray[5]);
                                break;
                            case 8:
                                reply.value = PIDS[i].convertToUseful(valueArray[2], valueArray[3], valueArray[4], valueArray[5], valueArray[6], valueArray[7], valueArray[8], valueArray[9]);
                                break;
                        }
                        break; //Value is converted, break out the for loop.
                    }
                }
            } else if (valueArray[0] === "43") {
                reply.mode = valueArray[0];
                for (var ij = 0; ij < PIDS.length; ij++) {
                    if (PIDS[ij].mode == "03") {
                        reply.name = PIDS[ij].name;
                        reply.value = PIDS[ij].convertToUseful(valueArray[1], valueArray[2], valueArray[3], valueArray[4], valueArray[5], valueArray[6]);
                    }
                }
            }
            return reply;
        };


/*
==========================================================================
*/

angular.module('ionicApp', ['ionic','ngResource','ngAnimate','ngTouch','angular-loading-bar','angular-inview','ngStorage'])
 .factory('globalvars', function($localStorage) {
    var btdevicetouse = '';
    var btGoogleSheetAPI = '';
    var btSelectedMetrics=[];
    var logGPSLocation=true;
    
    if ($localStorage.btdevicetouse!==undefined){
        if ($localStorage.btdevicetouse!==''){
            btdevicetouse = $localStorage.btdevicetouse;
        }
    }
    if ($localStorage.btSelectedMetrics!==undefined){
            btSelectedMetrics = JSON.parse($localStorage.btSelectedMetrics);
    }
    if ($localStorage.btGoogleSheetAPI!==undefined){
            btGoogleSheetAPI = $localStorage.btGoogleSheetAPI;
    }
    if ($localStorage.logGPSLocation!==undefined){
            logGPSLocation = $localStorage.logGPSLocation;
    }    
    return {
        getSelectedMetrics: function() {return btSelectedMetrics;},
        setSelectedMetrics: function(pbtSelectedMetrics) {
                    btSelectedMetrics=pbtSelectedMetrics;
                    $localStorage.btSelectedMetrics=JSON.stringify(btSelectedMetrics);
                    },
        getBtDeviceToUse: function() {return btdevicetouse;},
        setBtDeviceToUse: function(pbtdevicetouse) {
                    btdevicetouse=pbtdevicetouse;
                    $localStorage.btdevicetouse=btdevicetouse;
                    console.log('saving to localstorage key=btdevicetouse');
                    },
        getGoogleSheetAPI: function() {return btGoogleSheetAPI;},
        setGoogleSheetAPI: function(pbtGoogleSheetAPI) {
                    btGoogleSheetAPI=pbtGoogleSheetAPI;
                    $localStorage.btGoogleSheetAPI=pbtGoogleSheetAPI;
                    },
        getLogGPSLocation: function() {return logGPSLocation;},
        setLogGPSLocation: function(plogGPSLocation) {
                    logGPSLocation=plogGPSLocation;
                    $localStorage.logGPSLocation=plogGPSLocation;
                    }        
    };
})
 .controller('MainCtrl', function($scope,$http,$state,globalvars,$resource,$stateParams,$window,$interval) {
    ionic.Platform.ready(function() {
        if (navigator.splashscreen !== undefined) {
            navigator.splashscreen.hide();
        }
      });
    $scope.livestats={connectionstatus:''};
    $scope.receiveddata ='';
    $scope.btdevices = {};
    $scope.metrics = [];
    $scope.livemetrics=[];
    $scope.connectRetry = 0;
    $scope.btGoogleSheetAPI='';
    $scope.logentries = [];
    $scope.logGPSLocation;

    var logGPSInterval;
    var pollinginterval;
    
    var disconnectEverything = function () {
        stopPolling();
        removeAllPollers();
        btDisconnect();
        $scope.livestats={connectionstatus:''};
    };
    
    var fetchDefaultMetrics = function() {
        var tmpmetrics=[];
        var selecteditems=[];
        for (var k=0;k<PIDS.length;k++){
            if (PIDS[k].mode==modeRealTime && PIDS[k].name !=='' ) {
                tmpmetrics.push(PIDS[k]);
            }
        }
        selecteditems=globalvars.getSelectedMetrics();
        var tmparray=[];
        for (k=0;k<tmpmetrics.length;k++){
                if (selecteditems.indexOf(tmpmetrics[k].name)>-1) {
                    tmpmetrics[k].metricSelectedToPoll = true;
                    tmparray.push({
                        name:tmpmetrics[k].name,
                        description:tmpmetrics[k].description,
                        value:'',
                        unit:tmpmetrics[k].unit
                    });
                } else {
                    tmpmetrics[k].metricSelectedToPoll = false;
                }
        }
        $scope.livemetrics = tmparray;
        $scope.metrics = tmpmetrics;
    };

    $scope.readDefaultMetrics = function() {
        fetchDefaultMetrics();
    };

    $scope.readLogEntries = function (){
        $scope.logentries = globalLog;
    };

    $scope.selectDefaultMetrics = function() {
        var cfg = globalvars.getSelectedMetrics();
        var i;
        for (var k = 0; k<$scope.metrics.length;k++){
            if ($scope.metrics[k].isDefault === true && $scope.metrics[k].metricSelectedToPoll===false ){
                $scope.metricToPollClick($scope.metrics[k].name,true);
                $scope.metrics[k].metricSelectedToPoll=true;
            }
            if ($scope.metrics[k].isDefault === false && $scope.metrics[k].metricSelectedToPoll===true ){
                $scope.metrics[k].metricSelectedToPoll=false;
                $scope.metricToPollClick($scope.metrics[k].name,false);
            }
        }
    };
    $scope.metricToPollClick = function(name,value){
        var cfg = globalvars.getSelectedMetrics();
        var i = cfg.indexOf(name);

        // metric was selected but is not in the savd config, shall be added
        if (value===true && i===-1){
            cfg.push(name);
            globalvars.setSelectedMetrics(cfg);
            //stopPolling();
            //addPoller(name);
            //startPolling(pollinginterval);
            fetchDefaultMetrics();
            disconnectEverything();
            console.log('Adding poller for ' + name);
        }

        // metric was un-selected but was in the savd config, shall be removed
        if (value===false && i>-1){
            cfg.splice(i,1);
            globalvars.setSelectedMetrics(cfg);
            console.log('Removing poller for ' + name);
            //stopPolling();
            //removePoller(name);
            //startPolling(pollinginterval);
            fetchDefaultMetrics();            
            disconnectEverything();
        }
    };

    $scope.changebtdevice = function(id){
        if (id!=='' && id !== globalvars.getBtDeviceToUse()){
            globalvars.setBtDeviceToUse(id);
            disconnectEverything();
        }
    };
    
    function onGPSSuccess(position) {
        var objdata={name:'location', 
                     value:JSON.stringify({coords:{latitude:position.coords.latitude,longitude:position.coords.longitude}})
                    };
        btEventEmit ('dataReceived',objdata);
    }

    function onGPSError(error) {
        pushGlobalLog('Cannot get GPS location: '    + error.code    + ' ' +
              ' ' + error.message);
    }
    
    
    var enableDisableNonOBDLogging = function(metric) {
     if (metric==='GPS' || metric===undefined){
         if ($scope.logGPSLocation){
             logGPSInterval = $interval(function () {
              navigator.geolocation.getCurrentPosition(onGPSSuccess, onGPSError);
             },10000);
         } else {
             $interval.cancel(logGPSInterval);
         }
     }
    };
    
    $scope.logGPSLocationClick = function() {
        $scope.logGPSLocation = !$scope.logGPSLocation;
        globalvars.setLogGPSLocation($scope.logGPSLocation);
        enableDisableNonOBDLogging('GPS');
    }
    
    
    $scope.ShowSettings = function (){
        btShowSettings(function(result) {
            console.log(result);
        });
    };
    var queryLastData = function() {
        for (var k=0;k<$scope.livemetrics.length;k++){
            $scope.livemetrics[k].value = inmemorylastdata[$scope.livemetrics[k].name];
        }
    };
    $scope.verifyConfigData = function () {
        if (btConnected) return;
        
        $scope.livestats={connectionstatus:'Initializing...'};
        $scope.btGoogleSheetAPI = globalvars.getGoogleSheetAPI();
        btGoogleSheetAPI= $scope.btGoogleSheetAPI;
        $scope.logGPSLocation = globalvars.getLogGPSLocation();
        
        btGetDevices(function(results){
            //Fetch list of bluetooth devices
            var tmpdev = {devices:results,
                                selectedvalue:globalvars.getBtDeviceToUse()};
            if (tmpdev.selectedvalue!==''){
                var pos = tmpdev.devices.map(function(e) { return e.id; }).indexOf(tmpdev.selectedvalue);
                if (pos > -1) {
                    tmpdev.selectedvalue = tmpdev.devices[pos];
                }
            }
            $scope.btdevices = tmpdev;

            fetchDefaultMetrics();
            var id = globalvars.getBtDeviceToUse();
            if (id === undefined || id === '' || $scope.livemetrics.length < 1) {
                $state.go('configuration');
                return;
            }
            console.log(id);
            //console.log($scope.btdevices);
            var devname = $scope.btdevices.devices[$scope.btdevices.devices.map(function(e)
                                                                                {
                return e.id;
            }).indexOf(id)].name;
            var connectInterval = $interval(function () {
                    var totalmetrics=0;
                    $scope.livestats.connectionstatus=' Connecting to ' + devname + ' (' + ($scope.connectRetry) +')';
                    btConnectToDevice(id,function(result) {
                        $scope.connectRetry++;
                        if ($scope.connectRetry<-1){ //repeat indefinitely
                            $interval.cancel(connectInterval);
                        }
                        if (result){
                            $scope.connectRetry=0;
                            $interval.cancel(connectInterval);
                            $scope.livestats.connectionstatus='Connected to ' + devname;
                            for (var i=0; i<$scope.metrics.length;i++){
                                if ($scope.metrics[i].metricSelectedToPoll===true){
                                    addPoller($scope.metrics[i].name);
                                    totalmetrics++;
                                    console.log('Adding poller for ' + $scope.metrics[i].name);
                                }
                            }
                            pollinginterval = totalmetrics * 50 * 4;
                            if (pollinginterval<4000) pollinginterval=4000;
                            startPolling(pollinginterval);
                            
                            var pollerInterval = $interval(function () {
                                queryLastData();
                            }, 400);
                            enableDisableNonOBDLogging();
                    } else {
                        $scope.livestats.connectionstatus='Connect to ' + devname + ' failed';
                        $interval.cancel(logGPSInterval);
                      }});
            }, 10000);
        });
    };

    $scope.changebtGoogleSheetAPI = function(btGoogleSheetAPI){
        globalvars.setGoogleSheetAPI(btGoogleSheetAPI);
    };
    $scope.clearCachedData = function() {
        clearDB();
    }
        
    $scope.uploadData = function() {
        tryToUploadData();
    };

    $state.go('index');

})
.config(function ($stateProvider, $urlRouterProvider) {

  $stateProvider
    .state('index', {
      url: "/index",
      cache:false,
      views: {
        'menuContent' :{
            templateUrl: "index.html"
        }
      }
    });
  $stateProvider
    .state('log', {
      url: "/log.html",
      cache:false,
      views: {
        'menuContent' : {
          templateUrl: "log.html"
        }
      }
    });
  $stateProvider
    .state('configuration', {
      url: "/settings.html",
      cache:false,
      views: {
        'menuContent' : {
          templateUrl: "settings.html"
        }
      }
    });
  $stateProvider
    .state('about', {
      url: "/abpit.html",
      cache:false,
      views: {
        'menuContent' : {
          templateUrl: "about.html"
        }
      }
    });

});
