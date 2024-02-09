import Homey, {FlowCardTriggerDevice, SimpleClass} from 'homey';
import {PowerStationConfig} from '../../src/model/power-station.config';
import {
  BatteryUnit,
  ChargingConfiguration,
  E3dcConnectionData,
  EmergencyPowerState,
  ManualChargeState
} from 'easy-rscp';
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
import {BatteryModuleConfig} from '../../src/model/battery-module.config';
import {BatteryModule} from '../../src/model/battery-module';
import {TriggerCard} from '../../src/cards/trigger-card';
import {ManualBatteryChargingStartedTrigger} from '../../src/cards/trigger/manual-battery-charging-started.trigger';
import {ManualBatteryChargingStoppedTrigger} from '../../src/cards/trigger/manual-battery-charging-stopped.trigger';
import {IsManualChargeActiveConditionCard} from '../../src/cards/condition/is-manual-charge-active.condition.card';
import {LiveData} from '../../src/model/live-data';
import {StopManualBatteryChargeActionCard} from '../../src/cards/action/stop-manual-battery-charge.action.card';
import {
  StartManualBatteryChargeActionPercentageCard,
  StartManualBatteryChargeWhActionCard
} from '../../src/cards/action/start-manual-battery-charge.action.card';
import {ConfigureEmergencyReserveActionCard} from '../../src/cards/action/configure-emergency-reserve.action.card';
import {RemoveEmergencyReserveActionCard} from '../../src/cards/action/remove-emergency-reserve.action.card';
import {IslandModeStartedTrigger} from '../../src/cards/trigger/island-mode-started.trigger';
import {IslandModeStoppedTrigger} from '../../src/cards/trigger/island-mode-stopped.trigger';
import {
  IsEmergencyPowerReserveGreaterThanConditionCard
} from '../../src/cards/condition/is-emergency-power-reserve-greater-than.condition.card';
import {IsIslandModeActiveConditionCard} from '../../src/cards/condition/is-island-mode-active.condition.card';
import {IsIslandModePossibleConditionCard} from '../../src/cards/condition/is-island-mode-possible.condition.card';

const SYNC_INTERVAL = 1000 * 20; // 20 sec
const MAX_ALLOWED_ERROR_BEFORE_UNAVAILABLE = 5
class HomePowerStationDevice extends Homey.Device implements HomePowerStation{
  private firmwareChangedTrigger: SimpleValueChangedTrigger<string> | null = null
  private maxChargingLimitHasChangedTrigger: SimpleValueChangedTrigger<number> | null = null
  private maxDischargingLimitHasChangedTrigger: SimpleValueChangedTrigger<number> | null = null
  private emergencyPowerReserveChangedTrigger: SimpleValueChangedTrigger<number> | null = null
  private manualBatteryChargingStartedTrigger: TriggerCard<undefined> | null = null
  private manualBatteryChargingStoppedTrigger: TriggerCard<number> | null = null
  private islandModeStartedTrigger: TriggerCard<undefined> | null = null
  private islandModeStoppedTrigger: TriggerCard<undefined> | null = null

  private currentChargingConfig: ChargingConfiguration | null = null
  private currentManualChargeState: ManualChargeState | null = null
  private currentEmergencyPowerState: EmergencyPowerState | null = null

  private loopId: NodeJS.Timeout |null = null
  private api: RscpApi | undefined = undefined
  private syncErrorCount: number = 0
  private updateBatteryData = true
  async onInit() {
    this.log('HomePowerStationDevice has been initialized');
    this.setupActionCards()
    this.setupConditionCards()
    this.setupTriggerCards()

    setTimeout(() => {
      this.autoSync()
    }, 2000)
  }

  getCurrentSOC(): number {
    const number = this.getCapabilityValue('measure_battery')
    if (number) {
      return number / 100.0;
    }
    return  0.0
  }

  getManualChargeState(): ManualChargeState | null {
    return this.currentManualChargeState;
  }

  getEmergencyPowerState(): EmergencyPowerState | null {
    return this.currentEmergencyPowerState;
  }



  private setupTriggerCards() {
    this.setupFirmwareChangedCard()
    this.setupMaxChargingLimitChangedCard()
    this.setupMaxDischargingLimitChangedCard()
    this.setupStartManualChargeCards()
    this.setupManualBatteryChargingStartedCard()
    this.setupManualBatteryChargingStoppedCard()
    this.setupIslandModeCards()
    this.setupEmergencyPowerReserveChangedCard()
  }

  private setupIslandModeCards() {
    let card = this.homey.flow.getDeviceTriggerCard('island_mode_started')
    this.islandModeStartedTrigger = new IslandModeStartedTrigger(this, card, this)

    card = this.homey.flow.getDeviceTriggerCard('island_mode_stopped')
    this.islandModeStoppedTrigger = new IslandModeStoppedTrigger(this, card, this)
  }


  private setupManualBatteryChargingStoppedCard() {
    const card = this.homey.flow.getDeviceTriggerCard('manual_battery_charging_stopped')
    this.manualBatteryChargingStoppedTrigger = new ManualBatteryChargingStoppedTrigger(this, card, this)
  }

  private setupManualBatteryChargingStartedCard() {
    const card = this.homey.flow.getDeviceTriggerCard('manual_battery_charging_started')
    this.manualBatteryChargingStartedTrigger = new ManualBatteryChargingStartedTrigger(this, card, this)
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

  private setupEmergencyPowerReserveChangedCard() {
    const card = this.homey.flow.getDeviceTriggerCard('emergency_power_reserve_has_changed')
    this.emergencyPowerReserveChangedTrigger = new SimpleValueChangedTrigger<number>('Emergency power reserve', this, card, this)
  }

  private setupConditionCards() {
    this.setupIsMaxChargingPowerGreaterThan()
    this.setupIsMaxDischargingPowerGreaterThan()
    this.setupIsMaxChargingPowerLimitActive()
    this.setupIsMaxDischargingPowerLimitActive()
    this.setupIsAnyPowerLimitActive()
    this.setupIsManualChargeActive()
    this.setupEmergencyPowerConditionCards()
  }

  private setupEmergencyPowerConditionCards() {
    let card = this.homey.flow.getConditionCard('is_emergency_power_reserve_greater_than')
    card.registerRunListener(new IsEmergencyPowerReserveGreaterThanConditionCard().run)

    card = this.homey.flow.getConditionCard('is_island_mode_active')
    card.registerRunListener(new IsIslandModeActiveConditionCard().run)

    card = this.homey.flow.getConditionCard('is_island_mode_possible')
    card.registerRunListener(new IsIslandModePossibleConditionCard().run)
  }

  private setupIsManualChargeActive() {
    const card = this.homey.flow.getConditionCard('is_manual_charge_active')
    card.registerRunListener(new IsManualChargeActiveConditionCard().run)
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
    this.setupStartManualChargeCards()
    this.setupStopManualChargeCards()
    this.setupConfigureEmergencyPowerReserve()
    this.setupRemoveEmergencyPowerReserve()
  }

  private setupRemoveEmergencyPowerReserve() {
    const card = this.homey.flow.getActionCard('remove_emergency_reserve')
    card.registerRunListener(new RemoveEmergencyReserveActionCard().run)
  }

  private setupConfigureEmergencyPowerReserve() {
    const card = this.homey.flow.getActionCard('configure_emergency_reserve')
    card.registerRunListener(new ConfigureEmergencyReserveActionCard().run)
  }

  private setupStopManualChargeCards() {
    const card = this.homey.flow.getActionCard('stop_manual_battery_charging')
    card.registerRunListener(new StopManualBatteryChargeActionCard().run)
  }

  private setupStartManualChargeCards() {
    const card = this.homey.flow.getActionCard('start_manual_battery_charging_amount')
    card.registerRunListener(new StartManualBatteryChargeWhActionCard().run)

    const cardPercemtage = this.homey.flow.getActionCard('start_manual_battery_charging_percentage')
    cardPercemtage.registerRunListener(new StartManualBatteryChargeActionPercentageCard().run)
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

  public getBatteryCapacity(): Promise<number> {
    return new Promise((resolve, reject) => {
      const storedSettings: PowerStationConfig = this.getSettings();
      if (storedSettings.shouldCapacityOverwritten) {
        resolve(storedSettings.customCapacity)
      }
      else {
        const api = this.getApi()
        api.readBatteryData(true, this)
            .then(value => {
              resolve(value[0].capacity)
            })
            .catch(reason => {
              this.error('getBatteryCapacity: Error reading battery data')
              this.error(reason)
              reject(reason)
            })
      }
    })
}

  public getApi(): RscpApi {
    if (this.api) {
      return this.api
    }
    this.api = new RscpApi()
    const storedSettings: PowerStationConfig = this.getSettings();
    this.log(storedSettings)
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
            this.log(result)

            updateCapabilityValue('measure_pv_delivery', result.pvDelivery, this)
            updateCapabilityValue('measure_grid_delivery', result.gridDelivery, this)
            updateCapabilityValue('measure_battery_delivery', result.batteryDelivery * -1, this)
            updateCapabilityValue('measure_house_consumption', result.houseConsumption, this)
            updateCapabilityValue('measure_battery', result.batteryChargingLevel * 100, this)
            this.handleChargeTimeCapability(result);
            this.handleFirmwareChange(result);
            this.handleChargingConfigurationChanges(result);
            this.handleManualChargeStateChanges(result)
            this.handleEmergencyPowerStateChanges(result)
            this.handleAvailability();
            this.handleBatteryData(station, result, resolve);
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

  private handleChargeTimeCapability(data: LiveData) {
    this.getBatteryCapacity()
        .then(capacityWh => {
          let targetWh = 0
          if (data.batteryDelivery > 0) {
            console.log('battery is discharging')
            targetWh = Math.abs(capacityWh * data.batteryChargingLevel)
            console.log('' + targetWh + 'Wh stored in the battery. capacity: ' + capacityWh + ', level: ' + data.batteryChargingLevel)
          } else {
            console.log('battery is charging')
            targetWh = Math.abs(capacityWh * (1-data.batteryChargingLevel))
            console.log('' + targetWh + 'Wh missing to full battery. capacity: ' + capacityWh + ', level: ' + data.batteryChargingLevel)
          }

          const minutes =  targetWh / Math.abs(data.batteryDelivery) * 60
          const batteryRemainingHours = Math.floor(minutes / 60);
          let batteryRemainingMin = Math.floor(minutes % 60);
          let hoursAsString = '' + batteryRemainingHours
          let minAsString = '' + batteryRemainingMin
          if (hoursAsString.length == 1) {
            hoursAsString = '0' + hoursAsString
          }
          if (minAsString.length == 1) {
            minAsString = '0' + minAsString
          }

          let finalValue;
          if (batteryRemainingHours > 24) {
            finalValue = '> 24h'
          }
          else if (batteryRemainingHours == 0 && batteryRemainingMin < 10) {
            finalValue = '< 10min'
          }
          else {
            finalValue = hoursAsString + ':' + minAsString
          }

          updateCapabilityValue('charge_time', finalValue, this)
        })
  }

  private handleBatteryData(station: RscpApi, result: LiveData, resolve: (value: (PromiseLike<unknown> | unknown)) => void) {
    if (this.updateBatteryData) {
      this.log('Updating battery devices')
      this.updateBatteryData = false
      station
          .readBatteryData(true, this)
          .then(batteryData => {
            const storedSettings: PowerStationConfig = this.getSettings()
            if (storedSettings.rscpCapacity == '0') {
              storedSettings.rscpCapacity = batteryData[0].capacity.toString()
              this.setSettings(storedSettings).then(value => this.log('Stored RSCP capacity'))
            }

            const batteryDevices = this.homey.drivers.getDriver('battery-module').getDevices()
            const stationId = this.getId()
            batteryDevices.forEach(currentDevice => {
              const batteryConfig: BatteryModuleConfig = currentDevice.getStoreValue('settings')
              if (batteryConfig.stationId == stationId) {
                this.log('Updating battery device: ' + currentDevice.getName())
                const batteryDevice = currentDevice as unknown as BatteryModule
                this.getBatteryCapacity().then(capa => {
                  batteryDevice.sync(
                      batteryData[0],
                      result.batteryChargingLevel * 100,
                      capa / 1000.0,
                      result.chargingConfig,
                      result.emergencyPowerState)
                })

              }
            })
          })
          .catch(reason => {
            this.log('Error reading battery monitoring data')
            this.error(reason)
          })
          .finally(() => resolve(undefined))
    } else {
      this.updateBatteryData = true
      resolve(undefined)
    }
  }

  private handleAvailability() {
    this.syncErrorCount = 0
    if (!this.getAvailable()) {
      this.setAvailable().then()
    }
  }

  private handleChargingConfigurationChanges(result: LiveData) {
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
  }

  private handleManualChargeStateChanges(result: LiveData) {
    if (this.currentManualChargeState) {
      if (this.currentManualChargeState.active && !result.manualChargeState.active) {
        this.manualBatteryChargingStoppedTrigger?.trigger(result.manualChargeState.chargedEnergyWh)
      }
      else if (!this.currentManualChargeState.active && result.manualChargeState.active) {
        this.manualBatteryChargingStartedTrigger?.trigger(undefined)
      }
    }
    this.currentManualChargeState = result.manualChargeState
  }

  private handleEmergencyPowerStateChanges(result: LiveData) {
    if (this.currentEmergencyPowerState) {
      if (this.currentEmergencyPowerState.island && !result.emergencyPowerState.island) {
        this.islandModeStoppedTrigger?.trigger(undefined)
      }
      else if (!this.currentEmergencyPowerState.island && result.emergencyPowerState.island) {
        this.islandModeStartedTrigger?.trigger(undefined)
      }

      const reserveChange: ValueChanged<number> = {
        oldValue: this.currentEmergencyPowerState.reserveWh,
        newValue: result.emergencyPowerState.reserveWh
      }
      this.emergencyPowerReserveChangedTrigger?.runIfChanged(reserveChange)
    }
    else {
      if (result.emergencyPowerState.island) {
        this.islandModeStartedTrigger?.trigger(undefined)
      }
    }
    this.currentEmergencyPowerState = result.emergencyPowerState
  }

  private handleFirmwareChange(result: LiveData) {
    const firmwareChange = updateCapabilityValue('firmware_version', result.firmwareVersion, this)

    this.firmwareChangedTrigger?.runIfChanged(firmwareChange)
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
