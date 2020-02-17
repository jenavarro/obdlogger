import { IonicModule } from '@ionic/angular';
import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';

import { TabsPageRoutingModule } from './tabs-routing.module';

import { TabsPage } from './tabs.page';
import { BluetoothSerial } from '@ionic-native/bluetooth-serial/ngx';
import { IonicStorageModule } from '@ionic/storage';

@NgModule({
  imports: [
    IonicModule,
    CommonModule,
    FormsModule,
    TabsPageRoutingModule,
    IonicStorageModule.forRoot()
  ],
  declarations: [TabsPage],
  providers: [BluetoothSerial]
})
export class TabsPageModule {}
