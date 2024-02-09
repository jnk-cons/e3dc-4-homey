
import {RunListener} from '../run-listener';
import {ResultCode} from 'easy-rscp';
import {getResultCode} from '../../utils/i18n-utils';
import {CardUnit} from '../../../drivers/home-power-station/device';
import {HomePowerStation} from '../../model/home-power-station';

export class IsManualChargeActiveConditionCard implements RunListener {
    run(args: any, state: any): Promise<any> {
        return new Promise<any>(async (resolve, reject) => {
            const hps: HomePowerStation = args.device;
            hps.log('Starting card to check if a manual charge is active')
            const state = hps.getManualChargeState()
            if (state) {
                resolve(state.active)
            }
            else {
                hps.log('No manual charge state available')
                resolve(false)
            }
        })
    }

}

