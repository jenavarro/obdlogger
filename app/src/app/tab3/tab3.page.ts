import { Component } from '@angular/core';
import { NavController } from '@ionic/angular';
import { BluetoothSerial } from '@ionic-native/bluetooth-serial/ngx';
import { AlertController, ToastController } from '@ionic/angular';
import { obdinfo } from '../tab2/obdInfo.js';
import { CloudSettings } from '@ionic-native/cloud-settings/ngx';
import { Brightness } from '@ionic-native/brightness/ngx';
import { SQLite, SQLiteObject } from '@ionic-native/sqlite/ngx';

@Component({
  selector: 'app-tab3',
  templateUrl: 'tab3.page.html',
  styleUrls: ['tab3.page.scss']
})

export class Tab3Page {
 

  compareWithFn = (o1, o2) => {
    return o1 && o2 ? o1.name === o2.name : o1 === o2;
  };

  compareWith = this.compareWithFn;
  pairedList: [pairedlist];
  targetList=[];
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
      sendstatusinfo:false,
      dimscreenbrightness:50
    };
     
  constructor(private brightness: Brightness, private sqlite: SQLite, private cloudSettings: CloudSettings, public navCtrl: NavController, private alertCtrl: AlertController, private bluetoothSerial: BluetoothSerial, private toastCtrl: ToastController) {
    this.obdmetrics=[];
    this.targetList= ['InfluxDB','CSV'];
    this.loadGlobalConfig();
    this.checkBluetoothEnabled();
      
  }
  
 

  selectBtDevice(ev) {
    if (ev.detail.value === null || ev.detail.value <0) return;
    console.log('Changed BT device to use:' + this.pairedList[ev.detail.value].name);
    this.globalconfig.bluetoothDeviceToUse = {address:this.pairedList[ev.detail.value].address, devicename:this.pairedList[ev.detail.value].name};
    this.saveGlobalConfig();
    
}
  
loadGlobalConfig() {
  this.cloudSettings.enableDebug( );

this.cloudSettings.exists()
.then((exists: boolean) => {
  //console.log("Saved settings exist: " + exists) ;
  if (!exists) {
    this.saveGlobalConfig();
  } else {
  this.cloudSettings.load()
    .then((settings: any) => {
      // OBD Metrics configuration
      this.globalconfig = JSON.parse(settings.data);
      //console.log('Saved settings to use: ' + JSON.stringify(settings));
      if (this.globalconfig.obdmetrics !== undefined) {
        this.configureMetricsList();
      } 
    } )
    .catch((error: any) => {
      this.configureMetricsList();
      console.error('Error retrieving global configuration ' + error);
    });
  }
  }); 
}

setBrightness() {
  this.brightness.setBrightness(this.globalconfig.dimscreenbrightness/100);
  this.saveGlobalConfig();
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
  this.cloudSettings.save({data:JSON.stringify(this.globalconfig)},true)
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
 
      if (elem.metricSelectedToPoll) enabledmetrics.push(elem.name)
    }); 
    this.globalconfig.obdmetrics = enabledmetrics;
    this.saveGlobalConfig(); 
}
  public checkBluetoothEnabled() { 
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
        if (this.globalconfig.bluetoothDeviceToUse==null || this.globalconfig.bluetoothDeviceToUse.devicename== "" ) return;
        let i = this.pairedList.findIndex(item => item.address === this.globalconfig.bluetoothDeviceToUse.address) ;
        if (i>-1) {
          this.pairedList[i].isSelected=true
        }
   
    }, error => {
      this.showError("Please Enable Bluetooth")
      this.listToggle = false;
    }); 
  }
 
  
  showError(error) {/*
        let alert = this.alertCtrl.create({
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
 
        
selectDataUpload = function(data) {
  if (data== undefined) return;
  this.globalconfig.dataUpload.mode=  data ;
  this.saveGlobalConfig();
  console.log('Changed default upload mode to ' + data);
}
configDataUpload = function() {
  this.saveGlobalConfig();   
}

dropDBTables(){
  this.sqlite.create({
    name: 'data.db',
    location: 'default'
  })
    .then((db: SQLiteObject) => {
   
  
      db.executeSql('DELETE FROM livemetricstable  ')
      .then(() => { 
        console.log('[INFO] DELETED Content of table livemetrics');
         }).catch(e => console.log("[ERROR]  " + JSON.stringify(e)));
          
    })
    .catch(e => console.log("[ERROR]  " + JSON.stringify(e)));
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


 