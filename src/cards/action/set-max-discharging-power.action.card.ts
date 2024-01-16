
import {RunListener} from '../run-listener';
import {ResultCode} from 'easy-rscp';
import {getResultCode} from '../../utils/i18n-utils';
import {CardUnit} from '../../../drivers/home-power-station/device';
import {HomePowerStation} from '../../model/home-power-station';

export class SetMaxDischargingPowerActionCard implements RunListener {
    run(args: any, state: any): Promise<any> {
        return new Promise<any>(async (resolve, reject) => {
            const hps: HomePowerStation = args.device;
            const value: number = args.limit
            const unit: CardUnit = args.unit
            hps.log('Starting card to configure the max discharging power to ' + value + ' ' + unit)
            const validationResult = hps.validateUnit(value, unit)
            if (validationResult) {
                hps.log('Rejected max discharging power configuration: ' + validationResult)
                reject(validationResult)
            }
            else {
                let requestedWattLimit = value
                hps.getApi().readChargingConfiguration(true, hps.asSimple())
                    .then(config => {
                        if (unit == CardUnit.PERCENTAGE) {
                            requestedWattLimit = Math.floor((value / 100.0) * config.maxPossibleDischargingPower)
                        }

                        hps.log('Max discharging power should be ' + requestedWattLimit + ' Watt. Checking if the HPS can handle this ...')
                        if (requestedWattLimit > config.maxPossibleDischargingPower) {
                            hps.log('Rejected max discharging power configuration. Requested value is higher than the allowed max of the HPS. Requested: ' + requestedWattLimit + ', HPS-max: ' + config.maxPossibleDischargingPower)
                            reject(hps.translate('messages.requested-max-discharging-power-to-high', {REQUESTED: requestedWattLimit, MAX: config.maxPossibleDischargingPower}))
                        }
                        else if (requestedWattLimit < config.minPossibleChargingPower) {
                            hps.log('Rejected max charging power configuration. Requested value is lower than the allowed min of the HPS. Requested: ' + requestedWattLimit + ', HPS-min: ' + config.minPossibleDischargingPower)
                            reject(hps.translate('messages.requested-max-discharging-power-to-low', {REQUESTED: requestedWattLimit, MIN: config.minPossibleDischargingPower}))
                        }
                        else {
                            const limits = config.currentLimitations
                            limits.chargingLimitationsEnabled = true
                            limits.maxCurrentDischargingPower = requestedWattLimit

                            hps.getApi().writeChargingLimits(limits, true, hps)
                                .then(result => {
                                    if (result.maxCurrentDischargingPower == ResultCode.SUCCESS) {
                                        hps.log('Max allowed discharging power configured')
                                        const token = {
                                            'max discharging limit': requestedWattLimit
                                        }
                                        resolve(token)
                                    }
                                    else {
                                        hps.error('Failed to configure max allowed discharging power: ResultCode=' + result.maxCurrentDischargingPower)
                                        reject(hps.translate('messages.requested-max-discharging-power-denied-by-hps', {RESULTCODE: getResultCode(result.maxCurrentDischargingPower, hps)}))
                                    }
                                })
                                .catch(e => {
                                    hps.error('Writing discharging limits failed: ' + e)
                                    hps.error(e)
                                    reject(e)
                                })
                        }

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

