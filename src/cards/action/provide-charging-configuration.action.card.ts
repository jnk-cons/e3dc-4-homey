import {RunListener} from '../run-listener';
import {ResultCode} from 'easy-rscp';
import {getResultCode} from '../../utils/i18n-utils';
import {HomePowerStation} from '../../model/home-power-station';

export class ProvideChargingConfigurationActionCard implements RunListener {
    run(args: any, state: any): Promise<any> {
        return new Promise<any>(async (resolve, reject) => {
            const hps: HomePowerStation = args.device;
            hps.log('Starting card to provide the charging configuration')

            hps.getApi().readChargingConfiguration(true, hps.asSimple())
                .then(config => {
                    const limits = config.currentLimitations
                    const token = {
                        'max possible charging limit': config.maxPossibleChargingPower,
                        'max possible discharging limit': config.maxPossibleDischargingPower,
                        'min possible charging limit': config.minPossibleChargingPower,
                        'min possible discharging limit': config.minPossibleDischargingPower,
                        'max charging limit': limits.maxCurrentChargingPower,
                        'max discharging limit': limits.maxCurrentDischargingPower,
                        'limits active': limits.chargingLimitationsEnabled
                    }
                    resolve(token)
                })
                .catch(e => {
                    hps.error('Reading charging configuration failed: ' + e)
                    hps.error(e)
                    reject(e)
                })

        })
    }

}

