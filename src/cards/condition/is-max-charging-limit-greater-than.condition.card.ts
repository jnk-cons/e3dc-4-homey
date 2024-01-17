
import {RunListener} from '../run-listener';
import {ResultCode} from 'easy-rscp';
import {getResultCode} from '../../utils/i18n-utils';
import {CardUnit} from '../../../drivers/home-power-station/device';
import {HomePowerStation} from '../../model/home-power-station';

export class IsMaxChargingLimitGreaterThanConditionCard implements RunListener {
    run(args: any, state: any): Promise<any> {
        return new Promise<any>(async (resolve, reject) => {
            const hps: HomePowerStation = args.device;
            const value: number = args.limit
            const unit: CardUnit = args.unit
            hps.log('Starting card to check if the max charging power is greater than ' + value + ' ' + unit)
            const validationResult = hps.validateUnit(value, unit)
            if (validationResult) {
                hps.log('Rejected charging power check: ' + validationResult)
                reject(validationResult)
            }
            else {
                let requestedWattLimit = value
                hps.getApi().readChargingConfiguration(true, hps.asSimple())
                    .then(config => {
                        if (unit == CardUnit.PERCENTAGE) {
                            requestedWattLimit = Math.floor((value / 100.0) * config.maxPossibleChargingPower)
                        }

                        hps.log('Checking if the current max charging power limit of ' + config.currentLimitations.maxCurrentChargingPower + ' Watt is greater than ' + requestedWattLimit + ' Watt ...')
                        resolve(config.currentLimitations.maxCurrentChargingPower > requestedWattLimit)
                    })
                    .catch(e => {
                        hps.error('Reading charging configuration failed: ' + e)
                        hps.error(e)
                        reject(e)
                    })
            }
        })
    }

}

