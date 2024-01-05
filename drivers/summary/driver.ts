import Homey from 'homey';
import PairSession from 'homey/lib/PairSession';
import {SummaryConfig, SummaryType} from '../../src/model/summary.config';
import {getTypeName} from '../../src/utils/i18n-utils';

class SummaryDriver extends Homey.Driver {

  private type: SummaryType = SummaryType.TODAY

  async onInit() {
    this.log('SummaryDriver has been initialized');
  }

  onPair(session: PairSession): Promise<void> {
    session.setHandler('settingsChanged', async (data: SummaryType) => {
      return await this.onSettingsChanged(data)
    })

    session.setHandler("list_devices", async () => {
      return await this.onPairListDevices();
    });

    session.setHandler("getSettings", async () => {
      return this.type;
    });
    return new Promise<void>(async (resolve, reject) => resolve());
  }

  async onSettingsChanged(data: SummaryType) {
    this.log('Settings changed to: ' + data)
    this.type = data
    return true
  }

  async onPairListDevices() {
    const homePowerStations = this.homey.drivers.getDriver('home-power-station').getDevices()

    let devices = []
    for(let i = 0; i < homePowerStations.length; i++) {
      let station = homePowerStations[i];
      const stationData = await station.getData();
      const stationId = stationData.id;
      this.log(stationData)
      const name = station.getName() + ' - ' + getTypeName(this.type, this.homey)
      const settings: SummaryConfig = {
        stationId: stationId,
        type: this.type
      }
      devices.push({
        name: name,
        data: {
          id: 'summary-' + stationId + '-' + Date.now(),
        },
        store: {
          settings: settings
        }
      })
    }

    return devices;
  }

}



module.exports = SummaryDriver;
