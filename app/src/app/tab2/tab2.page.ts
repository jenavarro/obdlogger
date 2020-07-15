import { Component } from '@angular/core';
import { NavController } from '@ionic/angular';
import { BluetoothSerial } from '@ionic-native/bluetooth-serial/ngx';
import { AlertController, ToastController } from '@ionic/angular';
import { obdinfo } from './obdInfo.js';
 import { $ } from 'protractor';
import { SQLite, SQLiteObject } from '@ionic-native/sqlite/ngx';
import { Network } from '@ionic-native/network/ngx';
import { HTTP } from '@ionic-native/http/ngx';
import { getJSDocReturnTag, ExitStatus } from 'typescript';
import { CloudSettings } from '@ionic-native/cloud-settings/ngx';
import { Insomnia } from '@ionic-native/insomnia/ngx';
import { BatteryStatus } from '@ionic-native/battery-status/ngx';
import { isNumber } from 'util';
import { File } from '@ionic-native/file/ngx';
import * as moment from 'moment';
import * as _ from 'underscore';
import { BackgroundGeolocation, BackgroundGeolocationConfig, BackgroundGeolocationEvents, BackgroundGeolocationResponse, BackgroundGeolocationAuthorizationStatus } from '@ionic-native/background-geolocation/ngx';
import { Brightness } from '@ionic-native/brightness/ngx';

const gpsConfig: BackgroundGeolocationConfig = {
  desiredAccuracy: 10,
  stationaryRadius: 20,
  distanceFilter: 30,
  startForeground:true,
  debug: false,  
  stopOnTerminate: false   
};

@Component({
  selector: 'app-tab2',
  templateUrl: 'tab2.page.html',
  styleUrls: ['tab2.page.scss']
})

export class Tab2Page {
 

  compareWithFn = (o1, o2) => {
    return o1 && o2 ? o1.name === o2.name : o1 === o2;
  };

  compareWith = this.compareWithFn;
  pairedList: [pairedlist];
  targetList=[];
  listToggle: boolean = false;
  pairedDeviceID: number = 0;
  dataSend: string = "";
  connstatus: string="Disconnected";
  writeDelay:number= 50;
  btReceivedData :string = '';
  btLastCheckedReceivedData :string = '';
  receivedData:string ='';
  btConnected=false;
  activePollers = [];
  pollerInterval;
  queue = [];
  btLastReceivedData = '';
  inmemoryqty=0;
  globalLog =[];
  maincycle;
  globalLogEnabled = true;   // disable when generating a build
  defaultbluetoothdev='';
  showbluetoothconfig=false;
  btIsConnecting:boolean=false;
  obdmetrics: obdmetric[];
  private db: SQLiteObject;
  state:string="";
  lastConnectedToOBD;
  isNetworkConnectivity:boolean=false;
  uploadingData:boolean=false;
  liveStatsNumRecordsToSend:number=0;
  lastRPMmetricvalue;
  lastRPMmetricTimestamp; 
  liveMetrics={};
  liveStatsNumRecordsSinceConnected:number=0;
  liveStatsBattery={level:-1,isPlugged:false, lastUnplugged:0}; 
  globalconfig={
      obdmetrics: [], 
      dataUpload:{apikey:'',apisecret:'',localserver:'',mode:''},
      bluetoothDeviceToUse : {address:'', devicename: ''},
      sendstatusinfo:false,
      gpsTracking:true,
      dimscreenbrightness:50
    };


    startMain() {
      this.obdmetrics=[];
      this.liveMetrics={};
      this.targetList= ['InfluxDB','CSV'];

      this.lastConnectedToOBD = Date.now();
      this.loadGlobalConfig();
      this.setupDb();
      this.subscribeToNetworkChanges();
      this.keepSystemAwake();
      this.enableSendBatteryStatus();
      this.enableGPSTracking();
      this.repeatPeriodically();
      this.maincycle = setInterval( ()=> {
        this.repeatPeriodically();
  
      } ,20000);
    }
 

  constructor(private brightness: Brightness,private insomnia: Insomnia, private backgroundGeolocation: BackgroundGeolocation,  private file:File , private batteryStatus: BatteryStatus,private cloudSettings: CloudSettings, public navCtrl: NavController, private alertCtrl: AlertController, private bluetoothSerial: BluetoothSerial, private toastCtrl: ToastController, private sqlite: SQLite, private network: Network, private http: HTTP) {

    this.startMain();
  }

  navigateTo(page) {
    // Stop everything
    clearInterval( this.maincycle);
    this.btDisconnect();
    this.navCtrl.navigateForward(page);
  }

  enableGPSTracking(){
  
    if (!this.globalconfig.gpsTracking) return;

    this.backgroundGeolocation.checkStatus().then((status) => {
      console.log('[INFO] BackgroundGeolocation service is running', status.isRunning);
      console.log('[INFO] BackgroundGeolocation services enabled', status.locationServicesEnabled);
      console.log('[INFO] BackgroundGeolocation auth status: ' + status.authorization);
  
      if (!status.locationServicesEnabled) { 
          return this.backgroundGeolocation.showLocationSettings(); 
      }
      if (status.authorization==BackgroundGeolocationAuthorizationStatus.NOT_AUTHORIZED) { 
          return this.backgroundGeolocation.showAppSettings(); 
      }
    });
   
    this.backgroundGeolocation.configure(gpsConfig)
      .then(() => {
        this.backgroundGeolocation.on(BackgroundGeolocationEvents.location).subscribe((location: BackgroundGeolocationResponse) => {
          console.log('[INFO] Location: ' + location.time + ', Lat: ' + location.latitude + ', Lon: ' + location.longitude); 
          var objdata={name:'location', value:JSON.stringify({"latitude":location.latitude,"longitude":location.longitude})}; 
          this.btEventEmit ('dataReceived',objdata);
 
          // IMPORTANT:  You must execute the finish method here to inform the native plugin that you're finished,
          // and the background-task may be completed.  You must do this regardless if your operations are successful or not.
          // IF YOU DON'T, ios will CRASH YOUR APP for spending too much time in the background.
          //this.backgroundGeolocation.finish(); // FOR IOS ONLY
        });
  });
  }

  ionViewDidEnter(event) {
    // When navigating back to main page, restart connectivity
    clearInterval( this.maincycle);
    this.btDisconnect();
    this.startMain();
  }
  

  repeatPeriodically() {
         /* 
        Execute every 20 seconds
        On plugged-in -> reset timer, start trying to connect to OBD device every 20
        On connect to OBD, collect metrics in real time
        0-5 minutes losing contact with OBD devices -> retry connect evey 20 seconds, keep awake
          meanwhile if wifi network is available upload data
        5+ minutes after losing contact with OBD Device if not connected to energy (if not sending data)-> quit app, allow deep sleep
        10+ minutes after losing contact with OBD Device if not connected to energy (even sending data)-> quit app, allow deep sleep
      */ 
     this.liveStatsGetRecordsToUpload();
      // Attempt to connect
      if (!this.btIsConnecting && !this.btConnected ) {
        console.log('[INFO] Re-attempting connection...');
        this.checkBluetoothEnabled();
      }

      // Upload data if there is wifi and not send to csv
      if ( !this.btConnected && this.isNetworkConnectivity && this.liveStatsNumRecordsToSend >0 && this.globalconfig.dataUpload.mode!=='CSV') {     
        if (this.uploadingData) {
          console.log('[INFO] Wifi detected, attempting to upload data but still uploading previous cycle, retrying in 20 seconds...');
          return;
        }
        this.uploadData();
      }
      // Upload data if is sending to 
      if ( this.globalconfig.dataUpload.mode=='CSV' && this.liveStatsNumRecordsToSend >0 ) {   
        if (this.uploadingData) {
          console.log('[INFO] Attempting to save to csv but still uploading previous cycle, retrying in 20 seconds...');
          return;
        }
        this.uploadData();
      }

      //5+ minutes after losing contact with OBD Device  if not sending data  allow deep sleep
      if (!this.btConnected && Math.abs((this.lastConnectedToOBD - Date.now())/1000) > 5 * 60) {
        console.log('[INFO] Disconnected from OBD for more than 5 minutes, disabling keep-awake');
        this.disableKeepSystemAwake();
      }
      //5+ minutes after losing power and rpm metrics is zero or non existing
      if (! this.liveStatsBattery.isPlugged && Math.abs((this.liveStatsBattery.lastUnplugged - Date.now())/1000) > 5 * 60) {
         //5+ minutes after last RPM metric and last rpm metric was zero or ''
        if (( this.lastRPMmetricvalue === '' || this.lastRPMmetricvalue=== '0') 
          && Math.abs((this.lastRPMmetricTimestamp - Date.now())/1000) > 5 * 60) { 
            console.log('[INFO] 5+ minutes after losing power and rpm metrics is zero or non existing, assuming car is off');
            this.disableKeepSystemAwake();
          }
      }
  }
  
  keepSystemAwake() {
    this.execSql('INSERT INTO livemetricstable VALUES (?,?,?,?,?)', [null,Date.now().toString(),'systemforceawake', '60', '0'],'');
    
    this.insomnia.keepAwake()
      .then(
        () => console.log('[INFO] Keeping system awake...'),
        () => console.log('[ERROR] Keeping system awake...')
      );
  }
  
  disableKeepSystemAwake() {
    this.execSql('INSERT INTO livemetricstable VALUES (?,?,?,?,?)', [null,Date.now().toString(),'systemforceawake', '40', '0'],'');
    this.insomnia.allowSleepAgain()
      .then(
        () => console.log('[INFO] Disable keeping system awake...'),
        () => console.log('[ERROR] Disable keeping system awake...')
      );
  }

  enableSendBatteryStatus(){
    const subscription = this.batteryStatus.onChange().subscribe(status => {
      let stat='';
      if (status.isPlugged) 
        {stat='60';}
      else 
        {stat='40';} 

      this.execSql('INSERT INTO livemetricstable VALUES (?,?,?,?,?)', [null,Date.now().toString(),'battlevel', status.level.toString(), '0'],'');
      this.execSql('INSERT INTO livemetricstable VALUES (?,?,?,?,?)', [null,Date.now().toString(),'isplugged', stat, '0'],'');
      // if it was plugged and now it is not, resets time counter for how long it has been unplugged.
      if (this.liveStatsBattery.isPlugged && !status.isPlugged) {
        this.liveStatsBattery.lastUnplugged=Date.now();
      }
      this.liveStatsBattery.level= status.level;
      this.liveStatsBattery.isPlugged=status.isPlugged;
    }); 
  }

  logSystemEvent(level:string,description:string){
    this.execSql('INSERT INTO systemevents VALUES (?,?,?,?,?)', [null,Date.now().toString(),level, description ],'');
  }

  setupDb(){
     this.sqlite.create({
      name: 'data.db',
      location: 'default'
    })
      .then((db: SQLiteObject) => {
      
        db.executeSql('CREATE TABLE IF NOT EXISTS livemetricstable (rowid INTEGER PRIMARY KEY,ts INT, name text, value text, tripId INT )')
        .then(() => {
          console.log('[INFO] Executed CREATE TABLE IF NOT EXISTS livemetricstable')
           }).catch((e) => console.log("ERR CREATING TABLE livemetricstable "  + JSON.stringify(e)));
        db.executeSql('CREATE TABLE IF NOT EXISTS trips (startedTs INTEGER PRIMARY KEY, duration INT)')
        .then(() => {
          console.log('[INFO] Executed CREATE TABLE IF NOT EXISTS trips')
        }).catch((e) => console.log("ERR CREATING TABLE trips " + JSON.stringify(e)));
        db.executeSql('CREATE TABLE IF NOT EXISTS systemevents (rowid INTEGER PRIMARY KEY,startedTs  INTEGER  , level test, description text )')
        .then(() => {
          console.log('[INFO] Executed CREATE TABLE IF NOT EXISTS systemevents')
        }).catch((e) => console.log("ERR CREATING TABLE systemevents " + JSON.stringify(e)));
            
      })
      .catch(e => console.log((e) => console.log("[INFO]  " + JSON.stringify(e))));
      
  }  


 
loadGlobalConfig() {
  this.cloudSettings.enableDebug( );
 
this.cloudSettings.exists()
.then((exists: boolean) => { 
  if (!exists) {
    this.saveGlobalConfig();
    console.error('[INFO] Global config does not exist');

  } else { 
  this.cloudSettings.load()
    .then((settings: any) => {
      // OBD Metrics configuration
      this.globalconfig = JSON.parse(settings.data);
      console.log('[INFO] Saved settings loaded: ' + JSON.stringify(settings));
      if (this.globalconfig.obdmetrics !== undefined) {
        this.configureMetricsList();
      } 
    } )
    .catch((error: any) => {
      this.configureMetricsList();
      console.error('[INFO] Error retrieving global configuration ' + error);
    });
  }
   }); 
}

configureMetricsList() {
  for (var k=0;k<obdinfo.PIDS.length;k++){
    var itm = obdinfo.PIDS[k];
    if (itm.mode==obdinfo.modeRealTime && itm.name !=='' ) { 
      this.obdmetrics.push({"metricSelectedToPoll":this.globalconfig.obdmetrics.indexOf(itm.name)>-1,
        "name":itm.name,"description":itm.description,"value":"","unit": itm.unit}); 
    }
  }
} 
 
saveGlobalConfig () {
  this.cloudSettings.save({data:JSON.stringify(this.globalconfig)})
  .then((savedSettings: any) => console.log("[INFO] Saved Gobal settings "  ))
  .catch((error: any) => console.error('Error saving global configuration ' + error));
}

  
  public checkBluetoothEnabled() { 
    this.bluetoothSerial.isEnabled().then(success => {
      this.listPairedDevices();
    }, error => {
      // Do not popup message otherwise would be constantly nagging the user
      //this.bluetoothSerial.showBluetoothSettings();
      this.connstatus ="Bluetooth disconnected"
    }); 
  }
 
  listPairedDevices() { 
    this.bluetoothSerial.list().then(success => {
      this.pairedList = success;
      this.pairedList.forEach(item => item.isSelected=false);
      this.listToggle = true;
         console.log('[INFO] Reading default device data: ' +  this.globalconfig.bluetoothDeviceToUse.devicename);
        if (this.globalconfig.bluetoothDeviceToUse==null || this.globalconfig.bluetoothDeviceToUse.devicename== "" ) return;
        let i = this.pairedList.findIndex(item => item.address === this.globalconfig.bluetoothDeviceToUse.address) ;
        if (i>-1) {
          this.pairedList[i].isSelected=true
        }
        if (!this.btConnected && this.globalconfig.bluetoothDeviceToUse.address !== undefined) {
          this.connect(this.globalconfig.bluetoothDeviceToUse.address,this.globalconfig.bluetoothDeviceToUse.devicename);
        }  
    }, error => { 
      this.listToggle = false;
    }); 
  }
 
  connect (address, devicename) { 
    if (address=="") return;
    this.connstatus=" Connecting...";// + devicename;
    this.btIsConnecting=true;
    console.log('[INFO] '+ this.connstatus);
    this.bluetoothSerial.connect(address).subscribe(success => {
      this.liveStatsNumRecordsSinceConnected=0;
      this.btConnected = true;
      this.btIsConnecting = false;
      this.connstatus="Connected";
      this.defaultbluetoothdev=devicename;
      console.log('[INFO] '+ this.connstatus); 
      this.deviceConnected();
    }, error => {
      this.connstatus="Error";
      this.btIsConnecting = false;
      this.btConnected = false;
      console.log('[INFO] BT Conn. Status: ' + this.connstatus); 
      this.btDisconnect();

    }); 
  }
 
  deviceConnected ()  { 
    this.lastConnectedToOBD = Date.now();
    this.keepSystemAwake();
    this.backgroundGeolocation.start();
 
    // set brightness
    this.brightness.setBrightness(this.globalconfig.dimscreenbrightness/100);

    // Subscribe to data receiving as soon as the delimiter is read
    this.bluetoothSerial.subscribe('>').subscribe(success => { 
      this.btDataReceived(success);
    }, error => {
      console.log('[INFO] Device Connected, Subscribe error: ' + error);
    });
    this.init_communication();
    this.connectInterval(); 
  }
    
    btWrite = function (message, replies) {
      if (replies === undefined) {
          replies = 0;
      }
      if (this.btConnected) {
          if (this.queue.length < 256) {
              if (replies !== 0) {
                this.queue.push(message + replies + '\r');
              } else {
                this.queue.push(message + '\r');
              } 
          } else {
            this.btEventEmit('error', 'Queue-overflow!');
          }
      } else {
        this.btEventEmit('error', 'Bluetooth device is not connected.');
      }
    } 


    init_communication = function() {
      this.btWrite('ATZ');
      this.btWrite('ATL0');//Turns off extra line feed and carriage return
      this.btWrite('ATS0');//This disables spaces in in output, which is faster!
      this.btWrite('ATH0');//Turns off headers and checksum to be sent.
      this.btWrite('ATE0');//Turns off echo.
      this.btWrite('ATAT2');//Turn adaptive timing to 2. This is an aggressive learn curve for adjusting the timeout. Will make huge difference on slow systems.
      //Set timeout to 10 * 4 = 40msec, allows +20 queries per second. This is the maximum wait-time. ATAT will decide if it should wait shorter or not.
      //btWrite('ATST0A');
      this.btWrite('ATSP0');//Set the protocol to automatic.
    
      //Event connected
      this.btEventEmit('Communication Initiated....');
      this.btConnected=true;
    };
    
    btDataReceived(data) {
      this.lastConnectedToOBD = Date.now();
      var currentString, arrayOfCommands;
    
      currentString = this.receivedData + data.toString('utf8'); // making sure it's a utf8 string
    
      arrayOfCommands = currentString.split('>');
    
      var forString;
      if (arrayOfCommands.length < 2) {
        this.receivedData = arrayOfCommands[0];
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
                  reply = this.parseOBDCommand(messageString);
                  this.btEventEmit('dataReceived', reply);
                  this.receivedData = '';
              }
          }
      }
    }
 
    btEventEmit = function (event,text) {
      var pdata={ts:0,name:"",value:"",};

      if ( event!=='dataReceived' || text.value === 'NO DATA' || text.name === undefined || text.value === undefined) {
          return;
      }
      console.log('[INFO] Metric for ' + text.name);
      pdata = {ts:Date.now(),name:text.name,value:text.value};
      this.liveStatsNumRecordsSinceConnected++;
      this.execSql('INSERT INTO livemetricstable VALUES (?,?,?,?,?)', [null,pdata.ts, pdata.name, pdata.value, 0],'');
      if (pdata.name=='rpm') { 
        this.lastRPMmetricTimestamp = pdata.ts;
        this.lastRPMmetricvalue = pdata.value;
      }
      if (pdata.name!=='location'){ 
          if (this.liveMetrics[pdata.name]==undefined) {
            var mt =_.findWhere(this.obdmetrics, { name: pdata.name }); 
            this.liveMetrics[pdata.name]={};
            this.liveMetrics[pdata.name].description = mt.description;
            this.liveMetrics[pdata.name].name=mt.name;
            this.liveMetrics[pdata.name].unit=mt.unit;
            this.liveMetrics[pdata.name].type='';  
          }
          this.liveMetrics[pdata.name].value=pdata.value;
          if (this.liveMetrics[pdata.name].unit=='sec.' || this.liveMetrics[pdata.name].type=='s' ) {
            this.liveMetrics[pdata.name].value=moment.utc(parseInt(pdata.value)).format('HH:mm:ss'); 
            this.liveMetrics[pdata.name].unit='';  
            this.liveMetrics[pdata.name].type='s';  
          }
    } else {  // location data
      if (this.liveMetrics['latitude']==undefined) {
         this.liveMetrics['latitude']={};
        this.liveMetrics['latitude'].description = 'Location: latitude';
        this.liveMetrics['latitude'].name='';
        this.liveMetrics['latitude'].unit='°'
        this.liveMetrics['latitude'].type='';          
      }
      this.liveMetrics['latitude'].value=  JSON.parse(pdata.value).latitude;
      if (this.liveMetrics['longitude']==undefined) {
        this.liveMetrics['longitude']={};
       this.liveMetrics['longitude'].description = 'Location: longitude';
       this.liveMetrics['longitude'].name='';
       this.liveMetrics['longitude'].unit='°'
       this.liveMetrics['longitude'].type='';          
      }
      this.liveMetrics['longitude'].value=  JSON.parse(pdata.value).longitude;
    }
    }

    execSql = function (sSql:string,params:string[],logentry:string) {

      this.sqlite.create({
        name: 'data.db',
        location: 'default'
      }).then((db: SQLiteObject) => {
        db.executeSql(sSql,params)
        .then(() => { 
           }).catch(e => console.log('[ERROR] ' + e.message));
      });
    }

    enableIntervalWriter = function() {
      var self = this;
      this.btIntervalWriter = setInterval(function () {
                      if (self.queue.length > 0 && self.btConnected)
                          try {
                              var writedata = self.queue.shift();
                              self.bluetoothSerial.write(writedata + '\r',
                                                    function(success){self.btEventEmit('wrote data ' , writedata);
                                                                                },
                                                    function (err) {
                                                      this.btEventEmit('error', err);
                              });
                          } catch (err) {
                            this.btEventEmit('error', 'Error while writing: ' + err);
                            this.btEventEmit('error', 'OBD-II Listeners deactivated, connection is probably lost.');
                            clearInterval(self.btIntervalWriter);
                            this.removeAllPollers();
                          }
                  }, this.writeDelay); //Updated with Adaptive Timing on ELM327. 20 queries a second seems good enough.
    };
    
    btDisconnect = function () {
      clearInterval(this.btIntervalWriter);
      this.queue.length = 0; //Clears queue
      this.btConnected = false;
      this.btIsConnecting=false;
      this.bluetoothSerial.disconnect();
      this.connstatus="Disconnected";
      console.log('[INFO] Disconnected');
      this.liveStatsNumRecordsSinceConnected=0;
      this.lastConnectedToOBD = Date.now();
      this.backgroundGeolocation.stop();
 
    };
    
    requestValueByName = function (name) {
      this.btWrite(this.getPIDByName(name));
    };
    
    getPIDByName = function(name) {
      var i;
      for (i = 0; i < obdinfo.PIDS.length; i++) {
          if (obdinfo.PIDS[i].name === name) {
              if (obdinfo.PIDS[i].pid !== undefined) {
                  return (obdinfo.PIDS[i].mode + obdinfo.PIDS[i].pid);
              }
              //There are modes which don't require a extra parameter ID.
              return (obdinfo.PIDS[i].mode);
          }
      }
    };
    
    addPoller = function (name) {
      var stringToSend = this.getPIDByName(name);
      this.activePollers.push(stringToSend);
    };
    removePoller = function (name) {
      var stringToDelete = this.getPIDByName(name);
      var index = this.indexOf(stringToDelete);
      this.activePollers.splice(index, 1);
    };
    removeAllPollers = function () {
      this.activePollers.length = 0; //This does not delete the array, it just clears every element.
    };
    
    writePollers = function () {
      var i;
      for (i = 0; i < this.activePollers.length; i++) {
          this.btWrite(this.activePollers[i], 1);
      }
    };
    
    startPolling = function (interval) {
      if (interval === undefined || isNaN(interval)  ) {
          interval = this.activePollers.length * (this.writeDelay * 2); //Double the delay, so there's room for manual requests.
      }
    
      var self = this;
      this.pollerInterval = setInterval(function () {
          self.writePollers();
      }, interval);
      this.enableIntervalWriter();
    };
    stopPolling = function () {
      clearInterval(this.pollerInterval);
    };
    
    parseOBDCommand = function (hexString) {
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
          for (var i = 0; i < obdinfo.PIDS.length; i++) {
              if (obdinfo.PIDS[i].pid == reply.pid) {
                  var numberOfBytes = obdinfo.PIDS[i].bytes;
                  reply.name = obdinfo.PIDS[i].name;
                  switch (numberOfBytes) {
                      case 1:
                          reply.value = obdinfo.PIDS[i].convertToUseful(valueArray[2]);
                          break;
                      case 2:
                          reply.value = obdinfo.PIDS[i].convertToUseful2(valueArray[2], valueArray[3]);
                          break;
                      case 4:
                          reply.value = obdinfo.PIDS[i].convertToUseful4(valueArray[2], valueArray[3], valueArray[4], valueArray[5]);
                          break;
                      case 6:
                          reply.value = obdinfo.PIDS[i].convertToUseful6(valueArray[2], valueArray[3], valueArray[4], valueArray[5], valueArray[6], valueArray[7] );
                          break;
                  }
                  break; //Value is converted, break out the for loop.
              } 
          }
      } else if (valueArray[0] === "43") {
          reply.mode = valueArray[0];
          for (var ij = 0; ij < obdinfo.PIDS.length; ij++) {
              if (obdinfo.PIDS[ij].mode == "03") {
                  reply.name = obdinfo.PIDS[ij].name;
                  reply.value = obdinfo.PIDS[ij].convertToUseful6(valueArray[1], valueArray[2], valueArray[3], valueArray[4], valueArray[5], valueArray[6]);
              }
          }
      }
      return reply;
    };
 
    connectInterval =  function () {
    let totalmetrics=0;
                for (var i=0; i<this.obdmetrics.length;i++){
                    if (this.obdmetrics[i].metricSelectedToPoll===true){
                        this.addPoller(this.obdmetrics[i].name);
                        totalmetrics++;
                        console.log('[INFO] + poller for ' + this.obdmetrics[i].name);
                    }
                }  
                this.pollinginterval = this.totalmetrics * 50 * 4;
                if (this.pollinginterval<4000) this.pollinginterval=4000;
                this.startPolling(this.pollinginterval);
                
                /*var pollerInterval = setInterval(function () {
                    this.queryLastData();
                }, 400); */
                //enableDisableNonOBDLogging();
      
}

 // Upload Data  -------------------------------------------------------------------------------------------------------
 
getRecords = async function(db: SQLiteObject) {
  console.log('[INFO] Start Get Records...');
  return new Promise((resolve, reject) => {
    db.transaction(
          tx => {
            tx.executeSql('SELECT  * FROM livemetricstable LIMIT 1000;', [], (_, {
              rows }) => {
                console.log('[INFO] Records found to send: ' + rows.length);
                let data=[];
                let i;
                for(i=0;i<rows.length;i++) {
                  data.push(rows.item(i));
                }
                resolve(data);
          });
        }  ); 
});
}

flagSentReslts = async function(db: SQLiteObject,item) {
   await db.executeSql('DELETE FROM livemetricstable WHERE rowid=?',[item.rowid]);
}

sendRecords = async function(data):Promise<boolean> {
  let url='';
  let headers = {
    'Content-Type': 'application/json'
  };
  if (this.globalconfig.dataUpload.mode==='localserver') {
    url = this.globalconfig.dataUpload.localserver + '/write?db=obdmetrics&precision=ms'; 
    // Set HTTP POST InfluxDB format
    var datainfluxdb='';
    data.forEach(itm => {
      if (itm.name !== 'location') {
        datainfluxdb = datainfluxdb + itm.name + ' value='  + itm.value + ' ' + itm.ts + '\n';
      } else {
        datainfluxdb = datainfluxdb + 'latitude' + ' value='  + JSON.parse(itm.value).latitude + ' ' + itm.ts + '\n';
        datainfluxdb = datainfluxdb + 'longitude' + ' value='  + JSON.parse(itm.value).longitude + ' ' + itm.ts + '\n';
      }
    });
    data = datainfluxdb; 
    this.http.setDataSerializer('utf8');
  }
  if (this.globalconfig.dataUpload.mode==='backend') {
    url = 'https://qridr.com.ar/obdmetrics';
  }  
 
  try {
    return new Promise((resolve, reject) => {
      this.http.post(url, data, headers, function(response) {
        console.log('[INFO] HTTP Success: ' + response.status);
        resolve(true);
        return ;
      }, function(response) {
        console.log('[INFO] HTTP Error: ' + response.error);
        resolve(false);
        return ;
      });
    });
} catch (error) {
  console.log('[INFO] HTTP Post error: ' + error);
}}
 
 liveStatsGetRecordsToUpload = function () {
    this.sqlite.create({
      name: 'data.db',
      location: 'default'
    })
      .then(async (db: SQLiteObject) => {
                  db.executeSql('SELECT  COUNT(*) AS countrecs FROM livemetricstable ;', [])
                  .then((data) => {
                    this.liveStatsNumRecordsToSend = data.rows.item(0).countrecs;
                    console.log('Found records to send: ' + this.liveStatsNumRecordsToSend );
                  })
                  .catch(e => console.log('[ERROR] SQL: ' + e)); 
      });
  };

  uploadData = async function() {
  this.sqlite.create({
    name: 'data.db',
    location: 'default'
  })
    .then(async (db: SQLiteObject) => {
       console.log('[INFO]  UploadingData');
        this.uploadingData = true; 

        while (true) {
            let reslts = await this.getRecords(db);
            console.log('[INFO] Finish Get Records...');

            if (reslts.length==0){
              console.log('[INFO] No records to send found in DB'); 
              break; 
            }
            console.log('[INFO] Starting send data to backend');
            if (this.globalconfig.dataUpload.mode=='backend' || this.globalconfig.dataUpload.mode=='localserver' ){
              let success = await this.sendRecords(reslts);
              if (success) {
                await reslts.forEach( item =>  this.flagSentReslts(db,item));
                //this.changeRef.detectChanges(); 
              }
            }
            if ( this.globalconfig.dataUpload.mode=='CSV' ){ 

               await this.saveDataToCSV(reslts);
                await reslts.forEach( item =>  this.flagSentReslts(db,item));
             }

 
             
      } // while
        console.log('[INFO]  Exiting processing');
        this.uploadingData=false;
    });
  };

  saveDataToCSV = async function (data) { 
     await new Promise(resolve  => {
    console.log('[INFO] Start send to CSV'); 
    let dta:string;
    data.forEach( itm => dta = dta + itm.name + ','  + itm.value + ', ' + itm.ts + '\n');
    let filename =  "obdmetrics-" + new Date().toISOString().split('T')[0] + ".csv";

    this.file.resolveLocalFilesystemUrl(this.file.externalDataDirectory)
      .then( (dirEntry:any) =>  { 
        dirEntry.getFile(filename, {create: true, exclusive: false}, function(fileEntry) {

          fileEntry.createWriter(function (fileWriter) {
          try {
              fileWriter.seek(fileWriter.length);
          }
          catch (e) {
              console.log("[ERROR] file doesn't exist");
          }
          fileWriter.write(dta);
          console.log('[INFO] End send to CSV ');
          resolve();
      });  
      })});
    });
  }
   
 
  // Networking ---------------------------------------------------------------------------------------------------------

  subscribeToNetworkChanges = function () {
    if (this.network.type==='wifi') {
      this.isNetworkConnectivity=true;
    }
      let netDisconnectSubscription = this.network.onDisconnect().subscribe(() => {
        console.log('[INFO] WiFi disconnected');
        this.isNetworkConnectivity=false;
      }); 


      let netConnectSubscription = this.network.onConnect().subscribe(() => { 
        setTimeout(() => {
          if (this.network.type === 'wifi') {
            console.log('[INFO] Connected to Wifi');
            this.isNetworkConnectivity=true;
          }
        }, 3000);
      });
}
 secondsInterval=function(date1:Date,date2:Date) {
  return (date1.getTime()-date2.getTime())/1000
 };

 fakedata () {
  this.sqlite.create({
    name: 'data.db',
    location: 'default'
  })
    .then(async (db: SQLiteObject) => { 
      let i = 0;
      for (i=0;i<100000;i++) {
          this.execSql('INSERT INTO livemetricstable VALUES (?,?,?,?,?)', [null,Date.now().toString(), 'fake', '1234', '0'],'');
      }
    });
 }


  

}

interface pairedlist {
  "class": number,
  "id": string,
  "address": string,
  "name": string,
  "isSelected":boolean
}

interface obdmetric {
  "metricSelectedToPoll":boolean,
  "name":string,
  "description":string,
  "value":string,
  "unit": string
}


 