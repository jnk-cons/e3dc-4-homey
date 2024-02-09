
export interface BatteryData {
    index: number
    capacity: number
    asoc: number
    name: string
    maxChargingTempCelsius: number
    minChargingTempCelsius: number
    maxChargeCurrentA: number
    maxDischargeCurrentA: number
    designVoltage: number
    connected: boolean
    working: boolean
    inService: boolean
    voltage: number
    dcbs: DCBData[]
}

export interface DCBData {
    index: number,
    voltage: number;
    voltageAVG30s: number;
    currentA: number;
    currentAVG30s: number;
    temperaturesCelsius: number[];
}
