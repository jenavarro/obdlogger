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

/*global db,console,Promise */
"use strict";

var tripClass = (function() {
    var startedTs;
    var identified;

  function tripClass() {
    identified=false;
      startedTs=0;
  }

  tripClass.prototype = {
    setFinished: function() {
        var diffSecs = this.getElapsed();


        db.executeSql('UPDATE trips SET duration = ? WHERE startedTs = ?', [diffSecs,startedTs], function(rs) {
          }, function(error) {
            console.log('Transaction ERROR on UPDATE: ' + error.message);
          });
        startedTs = undefined;
    },
    setStarted: function() {
        startedTs = Date.now();
        db.executeSql('INSERT INTO trips VALUES (?,?)', [startedTs,0], function(rs) {
          }, function(error) {
            console.log('Transaction ERROR on INSERT: ' + error.message);
          });
    },
    getElapsed: function() {
        var timeDiff = Math.abs(Date.now() - startedTs);
        var diffDays = Math.ceil(timeDiff / (1000));
        return diffDays;
    },
    tripId: function() {
        return startedTs;
    },
    getTrips: function () {
        return new Promise(function(resolve, reject){
        db.executeSql('SELECT * FROM trips ORDER BY startedTs DESC LIMIT 100', [], function(res){
            console.log('Row count from SELECT trips: ' + res.rows.length);
            if (res) {
                resolve (res);
            } else {
                reject();
            }
        });
        });
    }
  };

  return tripClass;
})();

var thisTrip = new tripClass();

