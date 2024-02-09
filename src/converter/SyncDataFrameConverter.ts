import {
    ChargingConfigurationConverter, EmergencyPowerStateConverter,
    EMSTag,
    Frame,
    FrameConverter,
    InfoTag,
    ManualChargeStateConverter
} from 'easy-rscp';
import {LiveData} from '../model/live-data';

export class SyncDataFrameConverter implements FrameConverter<LiveData> {
    convert(frame: Frame): LiveData {
        const chargingConfigConverter = new ChargingConfigurationConverter();
        const manualChargeConverter = new ManualChargeStateConverter()
        const chargingConfig = chargingConfigConverter.convert(frame)
        const manualChargeState = manualChargeConverter.convert(frame)
        const emergencyPowerConverter = new EmergencyPowerStateConverter();
        const emergencyPowerState = emergencyPowerConverter.convert(frame)

        return {
            pvDelivery: frame.numberByTag(EMSTag.POWER_PV),
            gridDelivery: frame.numberByTag(EMSTag.POWER_GRID),
            batteryDelivery: frame.numberByTag(EMSTag.POWER_BAT) * -1,
            houseConsumption: frame.numberByTag(EMSTag.POWER_HOME),
            batteryChargingLevel: frame.numberByTag(EMSTag.BAT_SOC) / 100.0,
            firmwareVersion: frame.stringByTag(InfoTag.SW_RELEASE),
            chargingConfig: chargingConfig,
            manualChargeState: manualChargeState,
            emergencyPowerState: emergencyPowerState
        }
    }
}
