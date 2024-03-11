import Homey from 'homey';
import {PowerStationConfig} from '../../src/model/power-station.config';
import PairSession from 'homey/lib/PairSession';
import {
  E3dcConnectionData,
} from 'easy-rscp';
import {RscpApi} from '../../src/rscp-api';

class HomePowerStationDriver extends Homey.Driver {

  private settings: PowerStationConfig = {
    portalUsername: '',
    portalPassword: '',
    rscpKey: '',
    stationAddress: '',
    stationPort: 5033,
    batteryInfo: '',
    customCapacity: 0,
    rscpCapacity: '0',
    shouldCapacityOverwritten: false,
    debugMode: false
  }

  onPair(session: PairSession): Promise<void> {
    session.setHandler('settingsChanged', async (data: PowerStationConfig) => {
      return await this.onSettingsChanged(data)
    })

    session.setHandler('checkConnection', async (data: PowerStationConfig) => {
      return await this.onCheckConnection(data)
    })

    session.setHandler("list_devices", async () => {
      return await this.onPairListDevices();
    });

    session.setHandler("getSettings", async () => {
      return this.settings;
    });
    return new Promise<void>(async (resolve, reject) => resolve());
  }

  async onCheckConnection(data: PowerStationConfig) {
    return new Promise<string>(async (resolve, reject) => {
      this.settings = data
      const validationError = this.validateSettings()
      if (validationError) {
        resolve(validationError)
      }
      else {
        const easyRscpConnectionData: E3dcConnectionData = {
          address: this.settings.stationAddress,
          port: this.settings.stationPort,
          portalUser: this.settings.portalUsername,
          portalPassword: this.settings.portalPassword,
          rscpPassword: this.settings.rscpKey,
          connectionTimeoutMillis: 5000,
          readTimeoutMillis: 5000
        }

        const api = new RscpApi()
        api.init(easyRscpConnectionData, false, this)
        api.readLiveData(true, this)
            .then(e => resolve(this.homey.__('setup.connection-test.success')))
            .catch(e => {
              resolve(this.homey.__('setup.connection-test.failed-detail', {detail: e}))
            })
      }
    })
  }

  async onSettingsChanged(data: PowerStationConfig) {
    this.settings = data
    return true
  }

  private validateSettings(): string | undefined {
    if (this.settings.portalUsername === null || this.settings.portalUsername.trim() === '') {
      return this.homey.__('setup.validation.required', {input: this.homey.__('setup.field.portal-username.title')})
    }
    if (this.settings.portalPassword === null || this.settings.portalPassword.trim() === '') {
      return this.homey.__('setup.validation.required', {input: this.homey.__('setup.field.portal-password.title')})
    }
    if (this.settings.rscpKey === null || this.settings.rscpKey.trim() === '') {
      return this.homey.__('setup.validation.required', {input: this.homey.__('setup.field.rscp-key.title')})
    }
    if (this.settings.stationAddress === null || this.settings.stationAddress.trim() === '') {
      return this.homey.__('setup.validation.required', {input: this.homey.__('setup.field.station-address.title')})
    }
    if (this.settings.stationPort == null || this.settings.stationPort < 0 || this.settings.stationPort > 65535) {
      return this.homey.__('setup.validation.required', {input: this.homey.__('setup.field.station-port.title')})
    }
    return undefined
  }

  async onPairListDevices() {
    this.settings.stationPort = parseInt(this.settings.stationPort.toString())
    return [
      {
        name: 'HPS - ' + this.settings.stationAddress,
        data: {
          id: 'rscp-device-' + this.settings.stationAddress + '-' + Date.now(),
        },
        store: {
          settings: this.settings
        },
      },
    ];
  }

}

module.exports = HomePowerStationDriver;
