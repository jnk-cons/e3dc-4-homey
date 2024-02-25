import Homey from 'homey';
import PairSession from 'homey/lib/PairSession';
import {WallboxConfig} from '../../src/model/wallbox.config';
import {HomePowerStation} from '../../src/model/home-power-station';

class WallboxDriver extends Homey.Driver {

  async onInit() {
    this.log('WallboxDriver has been initialized');
  }

  onPair(session: PairSession): Promise<void> {
    session.setHandler("list_devices", async () => {
      return await this.onPairListDevices();
    });
    return new Promise<void>(async (resolve, reject) => resolve());
  }

  async onPairListDevices(): Promise<any[]> {
    const homePowerStations = this.homey.drivers.getDriver('home-power-station').getDevices()
    return new Promise(async (resolve, reject) => {
      let devices: any[] = []
      for(let i = 0; i < homePowerStations.length; i++) {
        const rawStation = homePowerStations[i]
        let station: HomePowerStation = rawStation as unknown as HomePowerStation;
        const stationData = rawStation.getData()
        const stationId = stationData.id;
        const api = station.getApi()
        const wallboxes = await api.readConnectedWallboxes(true, this)
        this.log('Found ' + wallboxes.length + ' wallboxes')
        wallboxes.forEach(value => {
          const settings: WallboxConfig = {
            id: value.id,
            stationId: stationId,
          }
          devices.push({
            name: rawStation.getName() + ' - ' + value.name,
            data: {
              id: 'wb-' + stationId + '-' + Date.now()
            },
            store: {
              settings: settings
            }
          })
        })
      }
      resolve(devices)
    })
  }
}

module.exports = WallboxDriver;
