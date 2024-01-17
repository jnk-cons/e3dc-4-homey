import Homey, {FlowCardTriggerDevice, SimpleClass} from 'homey';
import {PowerStationConfig} from '../../src/model/power-station.config';
import {ChargingConfiguration, E3dcConnectionData} from 'easy-rscp';
import {RscpApi} from '../../src/rscp-api';
import {HomePowerStation} from '../../src/model/home-power-station';
import {updateCapabilityValue} from '../../src/utils/capability-utils';
import {SetMaxChargingPowerActionCard} from '../../src/cards/action/set-max-charging-power.action.card';
import {clearTimeout} from 'node:timers';
import {
  RemoveMaxChargingPowerLimitActionCard
} from '../../src/cards/action/remove-max-charging-power-limit.action.card';
import {SetPowerLimitsToDefaultActionCard} from '../../src/cards/action/set-power-limits-to-default.action.card';
import {SetMaxDischargingPowerActionCard} from '../../src/cards/action/set-max-discharging-power.action.card';
import {
  RemoveMaxDischargingPowerLimitActionCard
} from '../../src/cards/action/remove-max-discharging-power-limit.action.card';
import {
  ProvideChargingConfigurationActionCard
} from '../../src/cards/action/provide-charging-configuration.action.card';
import {
  IsMaxChargingLimitGreaterThanConditionCard
} from '../../src/cards/condition/is-max-charging-limit-greater-than.condition.card';
import {
  IsMaxDischargingLimitGreaterThanConditionCard
} from '../../src/cards/condition/is-max-discharging-limit-greater-than.condition.card';
import {
  IsMaxChargingLimitActiveConditionCard
} from '../../src/cards/condition/is-max-charging-limit-active.condition.card';
import {
  IsMaxDischargingLimitActiveConditionCard
} from '../../src/cards/condition/is-max-discharging-limit-active.condition.card';
import {IsAnyPowerLimitActiveConditionCard} from '../../src/cards/condition/is-any-power-limit-active.condition.card';
import {SimpleValueChangedTrigger} from '../../src/cards/trigger/simple-value-changed.trigger';
import {ActivatePowerLimitsActionCard} from '../../src/cards/action/activate-power-limits.action.card';
import {ValueChanged} from '../../src/model/value-changed';
import {DeactivatePowerLimitsActionCard} from '../../src/cards/action/deactivate-power-limits.action.card';

const SYNC_INTERVAL = 1000 * 20; // 20 sec
const MAX_ALLOWED_ERROR_BEFORE_UNAVAILABLE = 5
class HomePowerStationDevice extends Homey.Device implements HomePowerStation{
  private firmwareChangedTrigger: SimpleValueChangedTrigger<string> | null = null
  private maxChargingLimitHasChangedTrigger: SimpleValueChangedTrigger<number> | null = null
  private maxDischargingLimitHasChangedTrigger: SimpleValueChangedTrigger<number> | null = null

  private currentChargingConfig: ChargingConfiguration | null = null

  private loopId: NodeJS.Timeout |null = null
  private api: RscpApi | undefined = undefined
  private syncErrorCount: number = 0
  async onInit() {
    this.log('HomePowerStationDevice has been initialized');
    this.setupActionCards()
    this.setupConditionCards()
    this.setupTriggerCards()

    setTimeout(() => {
      this.autoSync()
    }, 2000)


  }

  private setupTriggerCards() {
    this.setupFirmwareChangedCard()
    this.setupMaxChargingLimitChangedCard()
    this.setupMaxDischargingLimitChangedCard()
  }

  private setupFirmwareChangedCard() {
    const card = this.homey.flow.getDeviceTriggerCard('firmware_has_changed')
    this.firmwareChangedTrigger = new SimpleValueChangedTrigger<string>('Firmware', this, card, this)
  }

  private setupMaxChargingLimitChangedCard() {
    const card = this.homey.flow.getDeviceTriggerCard('max_charging_limit_has_changed')
    this.maxChargingLimitHasChangedTrigger = new SimpleValueChangedTrigger<number>('Charging limit', this, card, this)
  }

  private setupMaxDischargingLimitChangedCard() {
    const card = this.homey.flow.getDeviceTriggerCard('max_discharging_limit_has_changed')
    this.maxDischargingLimitHasChangedTrigger = new SimpleValueChangedTrigger<number>('Discharging limit', this, card, this)
  }

  private setupConditionCards() {
    this.setupIsMaxChargingPowerGreaterThan()
    this.setupIsMaxDischargingPowerGreaterThan()
    this.setupIsMaxChargingPowerLimitActive()
    this.setupIsMaxDischargingPowerLimitActive()
    this.setupIsAnyPowerLimitActive()
  }

  private setupIsMaxChargingPowerGreaterThan() {
    const card = this.homey.flow.getConditionCard('is_max_charging_limit_greater_than')
    card.registerRunListener(new IsMaxChargingLimitGreaterThanConditionCard().run)
  }

  private setupIsMaxDischargingPowerGreaterThan() {
    const card = this.homey.flow.getConditionCard('is_max_discharging_limit_greater_than')
    card.registerRunListener(new IsMaxDischargingLimitGreaterThanConditionCard().run)
  }

  private setupIsMaxChargingPowerLimitActive() {
    const card = this.homey.flow.getConditionCard('is_max_charging_limit_active')
    card.registerRunListener(new IsMaxChargingLimitActiveConditionCard().run)
  }

  private setupIsMaxDischargingPowerLimitActive() {
    const card = this.homey.flow.getConditionCard('is_max_discharging_limit_active')
    card.registerRunListener(new IsMaxDischargingLimitActiveConditionCard().run)
  }

  private setupIsAnyPowerLimitActive() {
    const card = this.homey.flow.getConditionCard('is_any_power_limit_active')
    card.registerRunListener(new IsAnyPowerLimitActiveConditionCard().run)
  }

  private setupActionCards() {
    this.setupConfigureMaxChargingLimitActionCard()
    this.setupRemoveMaxChargingLimitActionCard()
    this.setupConfigureMaxDischargingLimitActionCard()
    this.setupRemoveMaxDischargingLimitActionCard()
    this.setupRemoveAllLimitsActionCard()
    this.setupReadChargingConfiguration()
    this.setupActivatePowerLimitsCard()
    this.setupDeactivatePowerLimitsCard()
  }

  private setupActivatePowerLimitsCard() {
    const card = this.homey.flow.getActionCard('activate_configured_power_limits')
    card.registerRunListener(new ActivatePowerLimitsActionCard().run)
  }

  private setupDeactivatePowerLimitsCard() {
    const card = this.homey.flow.getActionCard('deactivate_configured_power_limits')
    card.registerRunListener(new DeactivatePowerLimitsActionCard().run)
  }

  private setupConfigureMaxChargingLimitActionCard() {
    const card = this.homey.flow.getActionCard('configure_max_charging_power')
    card.registerRunListener(new SetMaxChargingPowerActionCard().run)
  }

  private setupRemoveMaxChargingLimitActionCard() {
    const card = this.homey.flow.getActionCard('remove_max_charging_power')
    card.registerRunListener(new RemoveMaxChargingPowerLimitActionCard().run)
  }

  private setupConfigureMaxDischargingLimitActionCard() {
    const card = this.homey.flow.getActionCard('configure_max_discharging_power')
    card.registerRunListener(new SetMaxDischargingPowerActionCard().run)
  }

  private setupRemoveMaxDischargingLimitActionCard() {
    const card = this.homey.flow.getActionCard('remove_max_discharging_power')
    card.registerRunListener(new RemoveMaxDischargingPowerLimitActionCard().run)
  }

  private setupRemoveAllLimitsActionCard() {
    const card = this.homey.flow.getActionCard('remove_all_power_limits')
    card.registerRunListener(new SetPowerLimitsToDefaultActionCard().run)
  }

  private setupReadChargingConfiguration() {
    const card = this.homey.flow.getActionCard('provide_charging_configuration')
    card.registerRunListener(new ProvideChargingConfigurationActionCard().run)
  }

  asSimple(): SimpleClass {
    return this;
  }

  validateUnit(value: number, unit: CardUnit): string | undefined {
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

            this.firmwareChangedTrigger?.runIfChanged(firmwareChange)
            if (this.currentChargingConfig) {
              this.log('Checking if charging limits have changed')
              const maxChargingLimitChange: ValueChanged<number> = {
                oldValue: this.readActiveMaxChargingLimit(this.currentChargingConfig),
                newValue: this.readActiveMaxChargingLimit(result.chargingConfig)
              }
              this.maxChargingLimitHasChangedTrigger?.runIfChanged(maxChargingLimitChange)
              const maxDischargingLimitChange: ValueChanged<number> = {
                oldValue: this.readActiveMaxDischargingLimit(this.currentChargingConfig),
                newValue: this.readActiveMaxDischargingLimit(result.chargingConfig)
              }
              this.maxDischargingLimitHasChangedTrigger?.runIfChanged(maxDischargingLimitChange)
            }
            this.currentChargingConfig = result.chargingConfig

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

  private readActiveMaxChargingLimit(config: ChargingConfiguration): number {
    if (config.currentLimitations.chargingLimitationsEnabled) {
      return config.currentLimitations.maxCurrentChargingPower
    }
    return config.maxPossibleChargingPower
  }

  private readActiveMaxDischargingLimit(config: ChargingConfiguration): number {
    if (config.currentLimitations.chargingLimitationsEnabled) {
      return config.currentLimitations.maxCurrentDischargingPower
    }
    return config.maxPossibleDischargingPower
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

  translate(key: string | Object, tags?: Object | undefined): string {
    return this.homey.__(key, tags);
  }
}

export enum CardUnit {
  WATT = 'w',
  PERCENTAGE = 'percentage'
}

module.exports = HomePowerStationDevice;
