
import {RunListener} from '../run-listener';
import {ResultCode} from 'easy-rscp';
import {getResultCode} from '../../utils/i18n-utils';
import {CardUnit} from '../../../drivers/home-power-station/device';
import {HomePowerStation} from '../../model/home-power-station';

export class IsEmergencyPowerReserveGreaterThanConditionCard implements RunListener {
    run(args: any, state: any): Promise<any> {
        return new Promise<any>(async (resolve, reject) => {
            const hps: HomePowerStation = args.device;
            const value: number = args.reserve
            const unit: string = args.unit
            hps.log('Starting card to check if the emergency power is greater than ' + value + ' ' + unit)
            const state = hps.getEmergencyPowerState()
            if (state) {
                if (unit == 'wh') {
                    hps.log('Comparing with WH reserve ' + state.reserveWh)
                    resolve(state.reserveWh > value)
                }
                else {
                    hps.log('Comparing with % reserve ' + state.reservePercentage)
                    resolve(state.reservePercentage * 100.0 > value)
                }
            }
            else {
                resolve(false)
            }

        })
    }

}

