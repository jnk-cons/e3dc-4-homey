import {HomePowerStation} from '../../model/home-power-station';
import {RunListener} from '../run-listener';

export class RemoveEmergencyReserveActionCard implements RunListener {

    run(args: any, state: any): Promise<any> {
        return new Promise<any>(async (resolve, reject) => {
            const hps: HomePowerStation = args.device;
            const amount: number = args.amount
            const unit: string = args.unit
            hps.log('RemoveEmergencyReserveActionCard: triggered')
            const api = hps.getApi()
            api.writeEmergencyPowerReserve(0, false, true, hps)
                .then(value => {
                    hps.log('RemoveEmergencyReserveActionCard: success')
                    hps.log(value)
                    resolve(undefined)
                })
                .catch(e => {
                    hps.error('RemoveEmergencyReserveActionCard: failed')
                    hps.error(e)
                    reject(e)
                })
        })
    }
}

