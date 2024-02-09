import {HomePowerStation} from '../../model/home-power-station';
import {RunListener} from '../run-listener';

function startCharge(amount: number,
                      hps: HomePowerStation,
                      resolve: ((value: any | PromiseLike<any>) => void),
                      reject: ((reason?: any) => void)) {
    if (amount < 200) {
        reject(hps.translate('messages.manual-charge-input-wrong-wh-to-low', {MIN: 200}))
    }
    else {
        hps.getApi()
            .startManualCharge(amount, true, hps)
            .then(started => {
                hps.log('StartManualBatteryChargingActionCard (' + amount + 'Wh): Answer received ' + started)
                if (started) {
                    resolve(undefined)
                }
                else {
                    reject(hps.translate('messages.manual-charge-rejected-by-hps'))
                }
            })
            .catch(reason => {
                hps.log('StartManualBatteryChargingActionCard: ' + amount + ' failed')
                hps.error(reason)
                reject(reason)
            })
    }
}

export class StartManualBatteryChargeActionPercentageCard implements RunListener {


    run(args: any, state: any): Promise<any> {
        return new Promise<any>(async (resolve, reject) => {
            const hps: HomePowerStation = args.device;
            const amount: number = args.amount
            hps.log('StartManualBatteryChargingActionCard: triggered -> ' + amount + '%')
            const currentState = hps.getManualChargeState()
            if (currentState && !currentState.active) {
                hps.getBatteryCapacity()
                    .then(capacity => {
                        const wh = capacity * (amount / 100.0)
                        const soc = hps.getCurrentSOC()
                        const alreadyLoadedWh = capacity * soc
                        const whToLoad = wh - alreadyLoadedWh
                        if (whToLoad > 0) {
                            startCharge(whToLoad, hps, resolve, reject)
                        }
                        else {
                            hps.log('Desired battery charge level already reached. Manual storage charging skipped')
                            resolve(undefined)
                        }
                    })
                    .catch(reason => {
                        hps.log('Unable to start manual charge. Error reading battery capacity')
                        hps.error(reason)
                        reject(reason)
                    })
            }
            else {
                hps.log('Manual charge is already running')
                reject(hps.translate('messages.manual-charge-already-running'))
            }
        })
    }

}

export class StartManualBatteryChargeWhActionCard implements RunListener {


    run(args: any, state: any): Promise<any> {
        return new Promise<any>(async (resolve, reject) => {
            const hps: HomePowerStation = args.device;
            const amount: number = args.amount
            hps.log('StartManualBatteryChargingActionCardWh: triggered -> ' + amount)
            const currentState = hps.getManualChargeState()
            if (currentState && !currentState.active) {
                startCharge(amount, hps, resolve, reject)
            }
            else {
                hps.log('Manual charge is already running')
                reject(hps.translate('messages.manual-charge-already-running'))
            }
        })
    }
}

