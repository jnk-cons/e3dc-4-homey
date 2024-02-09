import {RscpApi} from '../rscp-api';
import {CardUnit} from '../../drivers/home-power-station/device';
import {InternalDevice} from '../internal-api/internal-device';
import {BatteryData} from './battery-data';
import {ChargingConfiguration, EmergencyPowerState} from 'easy-rscp';

export interface BatteryModule extends InternalDevice{
    sync(
        batteryData: BatteryData,
        rsoc: number,
        capacity: number,
        chargingConfiguration: ChargingConfiguration,
        emergencyPower: EmergencyPowerState): void
}
