import {HomePowerStation} from '../../model/home-power-station';
import {RunListener} from '../run-listener';

export class ConfigureEmergencyReserveActionCard implements RunListener {

    run(args: any, state: any): Promise<any> {
        return new Promise<any>(async (resolve, reject) => {
            const hps: HomePowerStation = args.device;
            const amount: number = args.amount
            const unit: string = args.unit
            hps.log('ConfigureEmergencyReserveActionCard: triggered -> ' + amount + '' + unit)
            const api = hps.getApi()
            api.writeEmergencyPowerReserve(amount, unit == 'percentage', true, hps)
                .then(value => {
                    hps.log('ConfigureEmergencyReserveActionCard: success')
                    hps.log(value)
                    resolve(undefined)
                })
                .catch(e => {
                    hps.error('ConfigureEmergencyReserveActionCard: failed')
                    hps.error(e)
                    reject(e)
                })
        })
    }
}

