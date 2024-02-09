
import {RunListener} from '../run-listener';
import {HomePowerStation} from '../../model/home-power-station';

export class IsIslandModeActiveConditionCard implements RunListener {
    run(args: any, state: any): Promise<any> {
        return new Promise<any>(async (resolve, reject) => {
            const hps: HomePowerStation = args.device;
            hps.log('Starting card to check if the island mode is active')
            const state = hps.getEmergencyPowerState()
            if (state) {
                hps.log('Checking state')
                hps.log(state)
                resolve(state.island)
            }
            else {
                hps.log('State not available')
                resolve(false)
            }
        })
    }
}

