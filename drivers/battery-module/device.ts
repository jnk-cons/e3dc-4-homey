import Homey, {SimpleClass} from 'homey';
import {BatteryData} from '../../src/model/battery-data';
import {updateCapabilityValue} from '../../src/utils/capability-utils';
import {BatteryModule} from '../../src/model/battery-module';
import {ChargingConfiguration, EmergencyPowerState} from 'easy-rscp';

class BatterModuleDevice extends Homey.Device implements BatteryModule{

  async onInit() {
    this.log('BatterModuleDevice has been initialized');
  }

  async onAdded() {
    this.log('BatterModuleDevice has been added');
  }

  sync(batteryData: BatteryData, rsoc: number, capacity: number, chargingConfiguration: ChargingConfiguration,
  emergencyPower: EmergencyPowerState) {
    updateCapabilityValue('device_name', batteryData.name, this)
    updateCapabilityValue('measure_dcbcount', batteryData.dcbs.length, this)
    updateCapabilityValue('measure_battery', rsoc, this)
    updateCapabilityValue('measure_capacity', capacity, this)
    updateCapabilityValue('measure_voltage', batteryData.voltage, this)
    let minTemp = 0
    let maxTemp: number = 0
    let sumTemp: number = 0
    let sensorCount = 0
    for (let moduleIndex = 0; moduleIndex < batteryData.dcbs.length; moduleIndex++) {
      for (let tempIndex = 0; tempIndex < batteryData.dcbs[moduleIndex].temperaturesCelsius.length; tempIndex++) {
        const temp = batteryData.dcbs[moduleIndex].temperaturesCelsius[tempIndex]
        if (minTemp == 0 || minTemp > temp) {
          minTemp = temp
        }
        if (maxTemp == 0 || maxTemp < temp) {
          maxTemp = temp
        }
        sumTemp += temp
        sensorCount++
      }
    }
    updateCapabilityValue('measure_temperature', sumTemp / sensorCount, this)
    updateCapabilityValue('measure_temperature_max', maxTemp, this)
    updateCapabilityValue('measure_temperature_min', minTemp, this)

    let maxChargingPower = chargingConfiguration.maxPossibleChargingPower
    let maxDischargingPower = chargingConfiguration.maxPossibleDischargingPower
    if (chargingConfiguration.currentLimitations.chargingLimitationsEnabled) {
      maxChargingPower = chargingConfiguration.currentLimitations.maxCurrentChargingPower
      maxDischargingPower = chargingConfiguration.currentLimitations.maxCurrentDischargingPower
    }

    updateCapabilityValue('measure_max_charging_power', maxChargingPower, this)
    updateCapabilityValue('measure_max_discharging_power', maxDischargingPower, this)
    updateCapabilityValue('measure_emergency_power_reserve', emergencyPower.reserveWh, this)
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
    this.log("BatterModuleDevice settings where changed");
  }

  async onRenamed(name: string) {
    this.log('BatterModuleDevice was renamed');
  }

  async onDeleted() {
    this.log('BatterModuleDevice has been deleted');
  }

  asSimple(): SimpleClass {
    return this;
  }

  translate(key: string | Object, tags?: Object | undefined): string {
    return this.homey.__(key, tags);
  }



}

module.exports = BatterModuleDevice;
