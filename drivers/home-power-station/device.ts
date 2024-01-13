import Homey, {FlowCardTriggerDevice} from 'homey';
import {PowerStationConfig} from '../../src/model/power-station.config';
import {E3dcConnectionData, ResultCode} from 'easy-rscp';
import {RscpApi} from '../../src/rscp-api';
import {HomePowerStation} from '../../src/model/home-power-station';
import {updateCapabilityValue} from '../../src/utils/capability-utils';
import {getResultCode} from '../../src/utils/i18n-utils';

const SYNC_INTERVAL = 1000 * 20; // 20 sec
const MAX_ALLOWED_ERROR_BEFORE_UNAVAILABLE = 5
class HomePowerStationDevice extends Homey.Device implements HomePowerStation{

  private firmwareChangedCard: FlowCardTriggerDevice | null = null;

  private loopId: NodeJS.Timeout |null = null
  private api: RscpApi | undefined = undefined
  private syncErrorCount: number = 0
  async onInit() {
    this.log('HomePowerStationDevice has been initialized');

    this.firmwareChangedCard = this.homey.flow.getDeviceTriggerCard('firmware_has_changed')

    setTimeout(() => {
      this.autoSync()
    }, 2000)

    this.setupActionCards()
  }

  private setupActionCards() {
    this.setupConfigureMaxChargingLimigActionCard()
  }

  private setupConfigureMaxChargingLimigActionCard() {
    const card = this.homey.flow.getActionCard("configure_max_charging_power")
    card.registerRunListener(async (args, state) => {
      return new Promise<any>(async (resolve, reject) => {
        const device: HomePowerStationDevice = args.device;
        const value: number = args.limit
        const unit: CardUnit = args.unit
        device.log('Starting card to configure the max charging power to ' + value + ' ' + unit)
        const validationResult = device.validateUnit(value, unit)
        if (validationResult) {
          device.log('Rejected max charging power configuration: ' + validationResult)
          reject(validationResult)
        }
        else {
          let requestedWattLimit = value
          device.getApi().readChargingConfiguration(true, device)
              .then(config => {
                if (unit == CardUnit.PERCENTAGE) {
                  requestedWattLimit = (value / 100.0) * config.maxPossibleChargingPower
                }

                device.log('Max charging power should be ' + requestedWattLimit + ' Watt. Checking if the HPS can handle this ...')
                if (requestedWattLimit > config.maxPossibleChargingPower) {
                  device.log('Rejected max charging power configuration. Requested value is higher than the allowed max of the HPS. Requested: ' + requestedWattLimit + ', HPS-max: ' + config.maxPossibleChargingPower)
                  reject(this.homey.__('messages.requested-max-charging-power-to-high', {REQUESTED: requestedWattLimit, MAX: config.maxPossibleChargingPower}))
                }
                else if (requestedWattLimit < config.minPossibleChargingPower) {
                  device.log('Rejected max charging power configuration. Requested value is lower than the allowed min of the HPS. Requested: ' + requestedWattLimit + ', HPS-min: ' + config.minPossibleChargingPower)
                  reject(this.homey.__('messages.requested-max-charging-power-to-low', {REQUESTED: requestedWattLimit, MIN: config.minPossibleChargingPower}))
                }
                else {
                  const limits = config.currentLimitations
                  limits.chargingLimitationsEnabled = true
                  limits.maxCurrentChargingPower = requestedWattLimit

                  device.getApi().writeChargingLimits(limits, true, device)
                      .then(result => {
                        if (result.maxCurrentChargingPower == ResultCode.SUCCESS) {
                          device.log('Max allowed charging power configured')
                          resolve(undefined)
                        }
                        else {
                          device.error('Failed to configure max allowed charging power: ResultCode=' + result.maxCurrentChargingPower)
                          reject(device.homey.__('messages.requested-max-charging-power-denied-by-hps', {RESULTCODE: getResultCode(result.maxCurrentChargingPower, device.homey)}))
                        }
                      })
                      .catch(e => {
                        device.error('Writing charging limits failed: ' + e)
                        device.error(e)
                        reject(e)
                      })
                }

              })
              .catch(e => {
                device.error('Reading charging configuration failed: ' + e)
                device.error(e)
                reject(e)
              })
        }
      })
    })
  }

  private validateUnit(value: number, unit: CardUnit): string | undefined {
    if (unit == CardUnit.PERCENTAGE && value > 100) {
      return this.homey.__('messages.invalid-percentage')
    }
    if (value < 0) {
      return this.homey.__('messages.to-low-limit"')
    }

    return undefined
  }

  private autoSync() {
    this.log('Auto sync ...')
    this.sync().then(() => {
      this.loopId = setTimeout(() => this.autoSync(), SYNC_INTERVAL)
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
      rscpPassword: storedSettings.rscpKey,
      connectionTimeoutMillis: 5000,
      readTimeoutMillis: 5000
    }, this)
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
            const firmwareChange = updateCapabilityValue('firmware_version', result.firmwareVersion, this)
            if (firmwareChange && firmwareChange.oldValue != null) {
              const tokens = {
                'old firmware version': firmwareChange.oldValue,
                'new firmware version': firmwareChange.newValue
              }
              this.log('Firmware change detected. Triggering firmware changed card')
              this.firmwareChangedCard?.trigger(this, tokens).then(this.log).catch(this.error)
            }

            this.log(result)
            this.syncErrorCount = 0
            if (!this.getAvailable()) {
              this.setAvailable().then()
            }
            resolve(undefined)
          })
          .catch(e => {
            this.error('Error reading live data')
            this.error(e)
            this.syncErrorCount++
            if (this.syncErrorCount >= MAX_ALLOWED_ERROR_BEFORE_UNAVAILABLE) {
              this.setUnavailable(this.homey.__('messages.hps-not-available')).then()
            }
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
    new RscpApi().init(e3dcData, this)
  }

  async onRenamed(name: string) {
    this.log('HomePowerStationDevice was renamed');
  }

  async onDeleted() {
    this.log('HomePowerStationDevice has been deleted');
    if (this.loopId) {
      clearTimeout(this.loopId)
    }
    new RscpApi().closeConnection(this).then()
  }

}

enum CardUnit {
  WATT = 'w',
  PERCENTAGE = 'percentage'
}

module.exports = HomePowerStationDevice;
