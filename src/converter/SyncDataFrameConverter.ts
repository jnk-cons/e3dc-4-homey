import {EMSTag, Frame, FrameConverter} from 'easy-rscp';
import {LiveData} from '../model/live-data';

export class SyncDataFrameConverter implements FrameConverter<LiveData> {
    convert(frame: Frame): LiveData {
        return {
            pvDelivery: frame.numberByTag(EMSTag.POWER_PV),
            gridDelivery: frame.numberByTag(EMSTag.POWER_GRID),
            batteryDelivery: frame.numberByTag(EMSTag.POWER_BAT) * -1,
            houseConsumption: frame.numberByTag(EMSTag.POWER_HOME),
            batteryChargingLevel: frame.numberByTag(EMSTag.BAT_SOC) / 100.0,
        }
    }

}
