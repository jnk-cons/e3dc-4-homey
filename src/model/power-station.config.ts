export interface PowerStationConfig {
    portalUsername: string,
    portalPassword: string,
    rscpKey: string,
    stationAddress: string,
    stationPort: number,
    timeout?: number,
    batteryInfo: string,
    rscpCapacity: string,
    shouldCapacityOverwritten: boolean,
    customCapacity: number,
    debugMode: boolean
}
