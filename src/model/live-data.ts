import {ChargingConfiguration, EmergencyPowerState, ManualChargeState} from 'easy-rscp';

export interface LiveData {
    pvDelivery: number
    gridDelivery: number
    batteryDelivery: number
    houseConsumption: number
    batteryChargingLevel: number
    firmwareVersion: string
    chargingConfig: ChargingConfiguration
    manualChargeState: ManualChargeState,
    emergencyPowerState: EmergencyPowerState
}
