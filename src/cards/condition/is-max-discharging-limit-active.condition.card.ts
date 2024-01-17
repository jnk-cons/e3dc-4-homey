
import {RunListener} from '../run-listener';
import {ResultCode} from 'easy-rscp';
import {getResultCode} from '../../utils/i18n-utils';
import {CardUnit} from '../../../drivers/home-power-station/device';
import {HomePowerStation} from '../../model/home-power-station';

export class IsMaxDischargingLimitActiveConditionCard implements RunListener {
    run(args: any, state: any): Promise<any> {
        return new Promise<any>(async (resolve, reject) => {
            const hps: HomePowerStation = args.device;
            hps.log('Starting card to check if the max discharging limit is active')
            hps.getApi().readChargingConfiguration(true, hps.asSimple())
                .then(config => {
                    resolve(
                        config.currentLimitations.chargingLimitationsEnabled
                            && config.currentLimitations.maxCurrentDischargingPower < config.maxPossibleDischargingPower)
                })
                .catch(e => {
                    hps.error('Reading charging configuration failed: ' + e)
                    hps.error(e)
                    reject(e)
                })

        })
    }

}

