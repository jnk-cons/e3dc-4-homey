
import {RunListener} from '../run-listener';
import {BatteryUnit, ResultCode} from 'easy-rscp';
import {HomePowerStation} from '../../model/home-power-station';

export class StopManualBatteryChargeActionCard implements RunListener {

    constructor() {
    }

    run(args: any, state: any): Promise<any> {
        return new Promise<any>(async (resolve, reject) => {
            const hps: HomePowerStation = args.device;
            const amount: number = args.amount
            hps.log('StopManualBatteryChargeActionCard: triggered')
            const state = hps.getManualChargeState()
            if (state && state.active) {
                hps.getApi()
                    .startManualCharge(0, true, hps)
                    .then(_ => {
                        resolve(undefined)
                    })
                    .catch(reason => {
                        hps.log('StopManualBatteryChargeActionCard: failed')
                        hps.error(reason)
                        reject(reason)
                    })
            }
            else {
                hps.log('StopManualBatteryChargeActionCard: Stop not needed. No manual charge is running')
                resolve(undefined)
            }
        })
    }
}
