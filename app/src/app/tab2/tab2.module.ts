import { IonicModule } from '@ionic/angular';
import { RouterModule } from '@angular/router';
import { NgModule ,CUSTOM_ELEMENTS_SCHEMA} from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Tab2Page } from './tab2.page';
import { IonicStorageModule } from '@ionic/storage';
import { Component } from '@angular/core';
import { SQLiteObject, SQLite } from '@ionic-native/sqlite/ngx';
import { Network } from '@ionic-native/network/ngx';
import { HTTP } from '@ionic-native/http/ngx'; 
import { CloudSettings } from '@ionic-native/cloud-settings/ngx';
import { BackgroundMode } from '@ionic-native/background-mode/ngx';

@NgModule({
  imports: [
    IonicModule,
    CommonModule, 
    FormsModule, 
    RouterModule.forChild([{ path: '', component: Tab2Page }]),
    IonicStorageModule.forRoot()  
  ],
  declarations: [Tab2Page], 
  providers: [  SQLite,Network,HTTP, CloudSettings ,BackgroundMode ],
  schemas: [CUSTOM_ELEMENTS_SCHEMA]
})
export class Tab2PageModule {}

 
 