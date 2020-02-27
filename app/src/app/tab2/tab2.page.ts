import { Component, ChangeDetectorRef } from '@angular/core';
import { NavController } from '@ionic/angular';
import { BluetoothSerial } from '@ionic-native/bluetooth-serial/ngx';
import { AlertController, ToastController } from '@ionic/angular';
import { obdinfo } from './obdInfo.js';
//import { Storage } from '@ionic/storage';
import { $ } from 'protractor';
import { SQLite, SQLiteObject } from '@ionic-native/sqlite/ngx';
import { Network } from '@ionic-native/network/ngx';
import { HTTP } from '@ionic-native/http/ngx';
import { getJSDocReturnTag } from 'typescript';
import { CloudSettings } from '@ionic-native/cloud-settings/ngx';
import { BackgroundMode } from '@ionic-native/background-mode/ngx';
import { BatteryStatus } from '@ionic-native/battery-status/ngx';
import { isNumber } from 'util';

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
  listToggle: boolean = false;
  pairedDeviceID: number = 0;
  dataSend: string = "";
  connstatus: string="";
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
  liveStatsBattery={level:-1,isPlugged:false, lastUnplugged:0}; 
  globalconfig={
      obdmetrics: [], 
      dataUpload:{apikey:'',apisecret:'',localserver:'',mode:''},
      bluetoothDeviceToUse : {address:'', devicename: ''},
      sendstatusinfo:false
    };

  constructor(private changeRef: ChangeDetectorRef, private batteryStatus: BatteryStatus,private backgroundMode: BackgroundMode, private cloudSettings: CloudSettings, public navCtrl: NavController, private alertCtrl: AlertController, private bluetoothSerial: BluetoothSerial, private toastCtrl: ToastController, private sqlite: SQLite, private network: Network, private http: HTTP) {
    this.obdmetrics=[];
    this.lastConnectedToOBD = Date.now();
    this.loadGlobalConfig();
    this.setupDb();
    this.subscribeToNetworkChanges();
    this.keepSystemAwake();
    this.enableSendBatteryStatus();
    var maincycle = setInterval( ()=> {
      /* 
        Execute every 20 seconds
        On plugged-in -> reset timer, start trying to connect to OBD device every 20
        On connect to OBD, collect metrics in real time
        0-5 minutes losing contact with OBD devices -> retry connect evey 20 seconds, keep awake
          meanwhile if wifi network is available upload data
        5+ minutes after losing contact with OBD Device if not connected to energy (if not sending data)-> quit app, allow deep sleep
        10+ minutes after losing contact with OBD Device if not connected to energy (even sending data)-> quit app, allow deep sleep
      */ 
      // Attempt to connect
      if (!this.btIsConnecting && !this.btConnected ) {
        console.log('Re-attempting connection...');
        this.checkBluetoothEnabled();
      }
      // Upload data if there is wifi
      if ( !this.btConnected && this.isNetworkConnectivity && this.liveStatsNumRecordsToSend >0 ) {     //!this.btIsConnecting &&
        if (this.uploadingData) {
          console.log('There\'wifi!, attempting to upload data but still uploading previous cycle, retrying in 20 seconds...');
          return;
        }
        this.uploadData();
      }
      //5+ minutes after losing contact with OBD Device  if not sending data  allow deep sleep
      if (!this.btConnected && Math.abs((this.lastConnectedToOBD - Date.now())/1000) > 5 * 60) {
        console.log('Disconnected from OBD for more than 5 minutes, disabling keep-awake');
        this.disableKeepSystemAwake();
      }
      //5+ minutes after losing power and rpm metrics is zero or non existing
      if (! this.liveStatsBattery.isPlugged && Math.abs((this.liveStatsBattery.lastUnplugged - Date.now())/1000) > 5 * 60) {
         //5+ minutes after last RPM metric and last rpm metric was zero or ''
        if (( this.lastRPMmetricvalue === '' || this.lastRPMmetricvalue=== '0') 
          && Math.abs((this.lastRPMmetricTimestamp - Date.now())/1000) > 5 * 60) { 
            console.log('5+ minutes after losing power and rpm metrics is zero or non existing, assuming car is off');
            this.disableKeepSystemAwake();
          }
      }      
      this.liveStatsGetRecordsToUpload(); 
    } ,20000);
  }

  keepSystemAwake() {
    this.backgroundMode.enable();
    console.log('Keeping system awake...');
  }
  
  disableKeepSystemAwake() {
    this.backgroundMode.disable();
    console.log('Disabling keeping system awake...');
  }

  enableSendBatteryStatus(){
    const subscription = this.batteryStatus.onChange().subscribe(status => {
      let stat='';
      if (status.isPlugged) 
        {stat='60';}
      else 
        {stat='40';}
      console.log(status.level, status.isPlugged, stat); 
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

  setupDb(){
    this.sqlite.create({
      name: 'data.db',
      location: 'default'
    })
      .then((db: SQLiteObject) => {
     
    
        db.executeSql('CREATE TABLE IF NOT EXISTS livemetricstable (rowid INTEGER PRIMARY KEY,ts INT, name text, value text, tripId INT )')
        .then(() => {
          console.log('Executed CREATE TABLE IF NOT EXISTS livemetricstable')
           }).catch(e => console.log(e));
        db.executeSql('CREATE TABLE IF NOT EXISTS trips (startedTs INTEGER PRIMARY KEY, duration INT)')
        .then(() => {
          console.log('Executed CREATE TABLE IF NOT EXISTS trips')
           }).catch(e => console.log(e));
            
      })
      .catch(e => console.log(e));
  }  

  dropDBTables(){
    this.sqlite.create({
      name: 'data.db',
      location: 'default'
    })
      .then((db: SQLiteObject) => {
     
    
        db.executeSql('DROP TABLE  livemetricstable  ')
        .then(() => {
          this.setupDb();
          console.log('Dropped table livemetrics');
           }).catch(e => console.log(e));
            
      })
      .catch(e => console.log(e));
  } 

  selectBtDevice(ev) {
    if (ev.detail.value === null || ev.detail.value <0) return;
    console.log('Changed BT device to use:' + this.pairedList[ev.detail.value].name);
    this.globalconfig.bluetoothDeviceToUse = {address:this.pairedList[ev.detail.value].address, devicename:this.pairedList[ev.detail.value].name};
    this.saveGlobalConfig();
    this.btDisconnect();
    this.connect(this.pairedList[ev.detail.value].address, this.pairedList[ev.detail.value].name);
}
  
loadGlobalConfig() {
  this.cloudSettings.enableDebug( );

this.cloudSettings.exists()
.then((exists: boolean) => {
  console.log("Saved settings exist: " + exists) ;
  if (!exists) {
    this.saveGlobalConfig();
  } 
  this.cloudSettings.load()
    .then((settings: any) => {
      // OBD Metrics configuration
      this.globalconfig = JSON.parse(settings.data);
      if (this.globalconfig.obdmetrics !== undefined) {
        this.configureMetricsList();
      } 
    } )
    .catch((error: any) => {
      this.configureMetricsList();
      console.error('Error retrieving global configuration ' + error);
    });
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
  .then((savedSettings: any) => console.log("Saved Gobal settings "  ))
  .catch((error: any) => console.error('Error saving global configuration ' + error));
}

resetMetrics() {
  let i:number=0;
  for (var k=0;k<obdinfo.PIDS.length;k++){
    var itm = obdinfo.PIDS[k];
    if (itm.mode==obdinfo.modeRealTime && itm.name !=='' ) { 
      if (this.obdmetrics[k].metricSelectedToPoll!==itm.isDefault) {  // To avoid setting the same value as it already exists, which would fire an angular update
        this.obdmetrics[k].metricSelectedToPoll=itm.isDefault;
      }
      i=i+1; 
    }
  } 
  this.saveMetricsCfg( );
}
 
saveMetricsCfg( ) { 
    var enabledmetrics:string[];
    enabledmetrics=[];
    this.obdmetrics.forEach(elem => {
      /*if (item !== null && elem.name=== item.name) {
        elem.metricSelectedToPoll = !elem.metricSelectedToPoll;
      }*/
      if (elem.metricSelectedToPoll) enabledmetrics.push(elem.name)
    }); 
    this.globalconfig.obdmetrics = enabledmetrics;
    this.saveGlobalConfig(); 
}
  checkBluetoothEnabled() { 
    this.bluetoothSerial.isEnabled().then(success => {
      this.listPairedDevices();
    }, error => {
      this.showError("Please Enable Bluetooth")
    }); 
  }
 
  listPairedDevices() { 
    this.bluetoothSerial.list().then(success => {
      this.pairedList = success;
      this.pairedList.forEach(item => item.isSelected=false);
      this.listToggle = true;
      
         console.log('Reading default device data: ' +  this.globalconfig.bluetoothDeviceToUse.devicename);
        if (this.globalconfig.bluetoothDeviceToUse==null) return;
        let i = this.pairedList.findIndex(item => item.address === this.globalconfig.bluetoothDeviceToUse.address) ;
        if (i>-1) {
          this.pairedList[i].isSelected=true
        }
        if (this.globalconfig.bluetoothDeviceToUse.address !== undefined) {
          this.connect(this.globalconfig.bluetoothDeviceToUse.address,this.globalconfig.bluetoothDeviceToUse.devicename);
        }  
    }, error => {
      this.showError("Please Enable Bluetooth")
      this.listToggle = false;
    }); 
  }
 
  connect (address, devicename) { 
    this.connstatus=" Connecting to " + devicename;
    this.btIsConnecting=true;
    console.log(this.connstatus);
    this.bluetoothSerial.connect(address).subscribe(success => {
      this.btConnected = true;
      this.btIsConnecting = false;
      this.connstatus=" Connected";
      this.defaultbluetoothdev=devicename;
      console.log(this.connstatus);
      this.showToast("Successfully Connected");
      this.deviceConnected();
    }, error => {
      this.connstatus=" Error";
      this.btIsConnecting = false;
      this.btConnected = false;
      console.log('BT Conn. Status: ' + this.connstatus);
      this.showError("Error: Connecting to Device");
    }); 
  }

  deviceConnected ()  { 
    this.lastConnectedToOBD = Date.now();
    // Subscribe to data receiving as soon as the delimiter is read
    this.bluetoothSerial.subscribe('>').subscribe(success => {
      //this.showToast("Succesful subscription");
     // this.init_communication();
      this.btDataReceived(success);
    }, error => {
      console.log('Device Connected, Subscribe error: ' + error);
    });
    this.init_communication();
    this.connectInterval(); 
  }
 
  showError(error) {
    /*   let alert = this.alertCtrl.create({
        title: 'Error',
        subTitle: error,
        buttons: ['Dismiss']
      });
      alert.present(); */
    }
  
    showToast(msj) { 
      const toast = this.toastCtrl.create({
        message: msj,
        duration: 1000
      });
     // toast.present();
   
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
              //console.log('Wrote Event: ' + message);
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
      //console.log('New metric for ' + text.name);
      pdata = {ts:Date.now(),name:text.name,value:text.value};
      console.log(JSON.stringify(pdata));
  
      this.execSql('INSERT INTO livemetricstable VALUES (?,?,?,?,?)', [null,pdata.ts, pdata.name, pdata.value, 0],'');
      if (pdata.name=='rpm') { 
        this.lastRPMmetricTimestamp = pdata.ts;
        this.lastRPMmetricvalue = pdata.value;
        
      }
    } 

    execSql = function (sSql:string,params:string[],logentry:string) {

      this.sqlite.create({
        name: 'data.db',
        location: 'default'
      }).then((db: SQLiteObject) => {
        db.executeSql(sSql,params)
        .then(() => {
          //console.log('DB Executed: ' + logentry);
           }).catch(e => console.log('Error: ' + e.message));
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
      this.connstatus="";
      console.log('Disconnected');
      this.lastConnectedToOBD = Date.now();
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
                        console.log('Adding poller for ' + this.obdmetrics[i].name);
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
  console.log('Start Get Records...');
  return new Promise((resolve, reject) => {
    db.transaction(
          tx => {
            tx.executeSql('SELECT  * FROM livemetricstable LIMIT 1000;', [], (_, {
              rows }) => {
                console.log('Records found to send: ' + rows.length);
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
    url = 'http://' + this.globalconfig.dataUpload.localserver + '/write?db=obdmetrics&precision=ms'; 
    // Set HTTP POST InfluxDB format
    var datainfluxdb='';
    data.forEach(itm => {
      datainfluxdb = datainfluxdb + itm.name + ' value='  + itm.value + ' ' + itm.ts + '\n'
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
        console.log('HTTP Success: ' + response.status);
        resolve(true);
        return ;
      }, function(response) {
        console.log('HTTP Error: ' + response.error);
        resolve(false);
        return ;
      });
    });
} catch (error) {
  console.log('HTTP Post error: ' + error);
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
                  .catch(e => console.log('Error SQL> ' + e)); 
      });
  };

  uploadData = async function() {
  this.sqlite.create({
    name: 'data.db',
    location: 'default'
  })
    .then(async (db: SQLiteObject) => {
       console.log('===========uploadingData = true');
        this.uploadingData = true; 
        while (true) {
            let reslts = await this.getRecords(db);
            console.log('Finish Get Records...');

            if (reslts.length==0){
              console.log('No records to send found in DB');
              console.log('===========uploadingData = false, RETURN');
              this.uploadingData=false;
              return;
            }
            console.log('=========== starting send to backend');
            if (this.globalconfig.dataUpload.mode=='backend' || this.globalconfig.dataUpload.mode=='localserver' ){
              let success = await this.sendRecords(reslts);
              if (success) {
                await reslts.forEach( item =>  this.flagSentReslts(db,item));
                this.changeRef.detectChanges();  
              }
            }
            console.log('=========== finished, next while loop');
            
      } // while
        console.log('=========== UploadingData = false, EXIT END OF PROCESS=======');
        this.uploadingData=false;
    });
  };

 

selectDataUpload = function(data) {
  this.globalconfig.dataUpload.mode=  data;
  this.saveGlobalConfig();
  console.log('Changed default upload mode to ' + data);
}
configDataUpload = function() {
  this.saveGlobalConfig();   
}


  // Networking ---------------------------------------------------------------------------------------------------------

  subscribeToNetworkChanges = function () {
    if (this.network.type==='wifi') {
      this.isNetworkConnectivity=true;
    }
      let netDisconnectSubscription = this.network.onDisconnect().subscribe(() => {
        console.log('wifi network was disconnected');
        this.isNetworkConnectivity=false;
      });
      //netDisconnectSubscription.unsubscribe();


      let netConnectSubscription = this.network.onConnect().subscribe(() => { 
        setTimeout(() => {
          if (this.network.type === 'wifi') {
            console.log('Connected to Wifi');
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


 