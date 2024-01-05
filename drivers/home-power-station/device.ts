import Homey from 'homey';
import {PowerStationConfig} from '../../src/model/power-station.config';
import {E3dcConnectionData, StringFrameConverter} from 'easy-rscp';
import {RscpApi} from '../../src/rscp-api';
import {ValueChanged} from '../../src/model/value-changed';
import {HomePowerStation} from '../../src/model/home-power-station';
import {clearInterval} from 'timers';
import {updateCapabilityValue} from '../../src/utils/capability-utils';

const SYNC_INTERVAL = 1000 * 20; // 20 sec

class HomePowerStationDevice extends Homey.Device implements HomePowerStation{

  private loopId: NodeJS.Timeout |null = null
  private api: RscpApi | undefined = undefined
  async onInit() {
    this.log('HomePowerStationDevice has been initialized');

    setTimeout(() => {
      this.startAutoSync()
    }, 2000)
  }

  private startAutoSync() {
    this.log('Starting auto sync ...')
    this.sync().then(() => {
      this.loopId = setInterval(() => this.sync(), SYNC_INTERVAL)
    })
  }

  getId(): string {
    return this.getData().id;
  }



  public getApi(): RscpApi {
    if (this.api) {
      return this.api
    }
    this.api = new RscpApi()
    const storedSettings: PowerStationConfig = this.getSettings();
    this.api.init({
      address: storedSettings.stationAddress,
      port: storedSettings.stationPort,
      portalUser: storedSettings.portalUsername,
      portalPassword: storedSettings.portalPassword,
      rscpPassword: storedSettings.rscpKey
    })
    return this.api
  }

  async sync() {
    return new Promise((resolve, reject) => {
      this.log('Starting sync ...')
      const station = this.getApi()
      station
          .readLiveData(true, this)
          .then(result => {
            updateCapabilityValue('measure_pv_delivery', result.pvDelivery, this)
            updateCapabilityValue('measure_grid_delivery', result.gridDelivery, this)
            updateCapabilityValue('measure_battery_delivery', result.batteryDelivery, this)
            updateCapabilityValue('measure_house_consumption', result.houseConsumption, this)
            updateCapabilityValue('measure_battery', result.batteryChargingLevel * 100, this)

            this.log(result)

            resolve(undefined)
          })
          .catch(e => {
            this.error('Error reading live data')
            this.error(e)
            resolve(undefined)
          })
    })

  }


  async onAdded() {
    this.log('HomePowerStationDevice has been added');
    const storedSettings: PowerStationConfig = this.getStoreValue('settings')
    await this.setSettings(storedSettings)
    await this.unsetStoreValue('settings')


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
    this.log("HomePowerStationDevice settings where changed");
    const e3dcData: E3dcConnectionData = {
      // @ts-ignore
      address: newSettings.stationAddress,
      // @ts-ignore
      port: newSettings.stationPort,
      // @ts-ignore
      portalUser: newSettings.portalUsername,
      // @ts-ignore
      portalPassword: newSettings.portalPassword,
      // @ts-ignore
      rscpPassword: newSettings.rscpKey
    }
    new RscpApi().init(e3dcData)
  }

  async onRenamed(name: string) {
    this.log('HomePowerStationDevice was renamed');
  }

  async onDeleted() {
    this.log('HomePowerStationDevice has been deleted');
    if (this.loopId) {
      clearInterval(this.loopId)
    }
    new RscpApi().closeConnection()
  }

}

module.exports = HomePowerStationDevice;
