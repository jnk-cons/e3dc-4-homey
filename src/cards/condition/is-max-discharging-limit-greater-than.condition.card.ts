
import {RunListener} from '../run-listener';
import {ResultCode} from 'easy-rscp';
import {getResultCode} from '../../utils/i18n-utils';
import {CardUnit} from '../../../drivers/home-power-station/device';
import {HomePowerStation} from '../../model/home-power-station';

export class IsMaxDischargingLimitGreaterThanConditionCard implements RunListener {
    run(args: any, state: any): Promise<any> {
        return new Promise<any>(async (resolve, reject) => {
            const hps: HomePowerStation = args.device;
            const value: number = args.limit
            const unit: CardUnit = args.unit
            hps.log('Starting card to check if the max discharging power is greater than ' + value + ' ' + unit)
            const validationResult = hps.validateUnit(value, unit)
            if (validationResult) {
                hps.log('Rejected discharging power check: ' + validationResult)
                reject(validationResult)
            }
            else {
                let requestedWattLimit = value
                hps.getApi().readChargingConfiguration(true, hps.asSimple())
                    .then(config => {
                        if (unit == CardUnit.PERCENTAGE) {
                            requestedWattLimit = Math.floor((value / 100.0) * config.maxPossibleDischargingPower)
                        }

                        hps.log('Checking if the current max discharging power limit of ' + config.currentLimitations.maxCurrentDischargingPower + ' Watt is greater than ' + requestedWattLimit + ' Watt ...')
                        resolve(config.currentLimitations.maxCurrentDischargingPower > requestedWattLimit)
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

