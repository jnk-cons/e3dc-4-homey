import Homey from 'homey';
import PairSession from 'homey/lib/PairSession';
import {BatteryModuleConfig} from '../../src/model/battery-module.config';

class BatteryModuleDriver extends Homey.Driver {

  async onInit() {
    this.log('BatteryModuleDriver has been initialized');
  }

  onPair(session: PairSession): Promise<void> {
    session.setHandler("list_devices", async () => {
      return await this.onPairListDevices();
    });
    return new Promise<void>(async (resolve, reject) => resolve());
  }

  async onPairListDevices() {
    const homePowerStations = this.homey.drivers.getDriver('home-power-station').getDevices()

    let devices = []
    for(let i = 0; i < homePowerStations.length; i++) {
      let station = homePowerStations[i];
      const stationData = await station.getData();
      const stationId = stationData.id;

      const name = station.getName() + ' - Battery'
      const settings: BatteryModuleConfig = {
        stationId: stationId,
      }
      devices.push({
        name: name,
        data: {
          id: 'battery-' + stationId + '-' + Date.now(),
        },
        store: {
          settings: settings
        }
      })
    }

    return devices;
  }

}

module.exports = BatteryModuleDriver;
