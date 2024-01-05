import Homey from 'homey';
import {SummaryConfig} from '../../src/model/summary.config';
import {HomePowerStation} from '../../src/model/home-power-station';
import {updateCapabilityValue} from '../../src/utils/capability-utils';
import {clearInterval} from 'timers';
import {getTypeName} from '../../src/utils/i18n-utils';

// const SYNC_INTERVAL = 1000 * 60 * 5; // 5 min
const SYNC_INTERVAL = 1000 * 20; // 20 sec

class SummaryDevice extends Homey.Device {

  private loopId: NodeJS.Timeout |null = null

  async onInit() {
    this.log('SummaryDevice has been initialized');

    setTimeout(() => {
      this.startAutoSync()
    }, 5000)
  }

  private startAutoSync() {
    this.log('Starting auto sync ...')
    this.sync().then(() => {
      this.loopId = setInterval(() => this.sync(), SYNC_INTERVAL)
    })
  }

  async sync() {
    return new Promise((resolve, reject) => {
      const hpsDevices = this.homey.drivers.getDriver('home-power-station').getDevices()
      const ownConfig: SummaryConfig = this.getStoreValue('settings')
      updateCapabilityValue('date_range', getTypeName(ownConfig.type, this.homey), this)
      const stationId = ownConfig.stationId
      const stationToUse = hpsDevices.find(value => {
        const asStation: HomePowerStation = value as unknown as HomePowerStation
        return asStation.getId() === stationId
      })
      if (stationToUse) {
        this.log('Connected station is still available')
        const asStation: HomePowerStation = stationToUse as unknown as HomePowerStation
        const api = asStation.getApi()
        const syncType = ownConfig.type
        api
            .readSummaryData(syncType, true, this)
            .then(result => {
              updateCapabilityValue('measure_pv_summary', result.pvDelivery / 1000.0, this)
              updateCapabilityValue('measure_house_consumption_summary', result.houseConsumption / 1000.0, this)
              updateCapabilityValue('measure_battery_in', result.batteryIn / 1000.0, this)
              updateCapabilityValue('measure_battery_out', result.batteryOut / 1000.0, this)
              updateCapabilityValue('measure_grid_in', result.gridIn / 1000.0, this)
              updateCapabilityValue('measure_grid_out', result.gridOut / 1000.0, this)
              updateCapabilityValue('measure_self_consumption', result.selfConsumption * 100, this)
              updateCapabilityValue('measure_autarky', result.selfSufficiency * 100, this)
              this.log(result)
              resolve(undefined)
            })
            .catch(e => {
              this.error('error reading summary data')
              this.error(e)
              resolve(undefined)
            })

      }
      else {
        this.error('Station with id ' + stationId + ' not found. Sync will fail')
        resolve(undefined)
      }
    })
  }
  async onAdded() {
    this.log('SummaryDevice has been added');
  }

  async onSettings({
    oldSettings,
    newSettings,
    changedKeys,
  }: {
    oldSettings: { [key: string]: boolean | string | number | undefined | null };
    newSettings: { [key: string]: boolean | string | number | undefined | null };
    changedKeys: string[];
  }): Promise<string | void> {
    this.log("SummaryDevice settings where changed");
  }
  async onRenamed(name: string) {
    this.log('SummaryDevice was renamed');
  }

  async onDeleted() {
    this.log('SummaryDevice has been deleted');
    if (this.loopId) {
      clearInterval(this.loopId)
    }
  }

}

module.exports = SummaryDevice;