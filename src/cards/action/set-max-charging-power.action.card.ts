
import {RunListener} from '../run-listener';
import {ResultCode} from 'easy-rscp';
import {getResultCode} from '../../utils/i18n-utils';
import {CardUnit} from '../../../drivers/home-power-station/device';
import {HomePowerStation} from '../../model/home-power-station';

export class SetMaxChargingPowerActionCard implements RunListener {
    run(args: any, state: any): Promise<any> {
        return new Promise<any>(async (resolve, reject) => {
            const hps: HomePowerStation = args.device;
            const value: number = args.limit
            const unit: CardUnit = args.unit
            hps.log('Starting card to configure the max charging power to ' + value + ' ' + unit)
            const validationResult = hps.validateUnit(value, unit)
            if (validationResult) {
                hps.log('Rejected max charging power configuration: ' + validationResult)
                reject(validationResult)
            }
            else {
                let requestedWattLimit = value
                hps.getApi().readChargingConfiguration(true, hps.asSimple())
                    .then(config => {
                        if (unit == CardUnit.PERCENTAGE) {
                            requestedWattLimit = Math.floor((value / 100.0) * config.maxPossibleChargingPower)
                        }

                        hps.log('Max charging power should be ' + requestedWattLimit + ' Watt. Checking if the HPS can handle this ...')
                        if (requestedWattLimit > config.maxPossibleChargingPower) {
                            hps.log('Rejected max charging power configuration. Requested value is higher than the allowed max of the HPS. Requested: ' + requestedWattLimit + ', HPS-max: ' + config.maxPossibleChargingPower)
                            reject(hps.translate('messages.requested-max-charging-power-to-high', {REQUESTED: requestedWattLimit, MAX: config.maxPossibleChargingPower}))
                        }
                        else if (requestedWattLimit < config.minPossibleChargingPower) {
                            hps.log('Rejected max charging power configuration. Requested value is lower than the allowed min of the HPS. Requested: ' + requestedWattLimit + ', HPS-min: ' + config.minPossibleChargingPower)
                            reject(hps.translate('messages.requested-max-charging-power-to-low', {REQUESTED: requestedWattLimit, MIN: config.minPossibleChargingPower}))
                        }
                        else {
                            const limits = config.currentLimitations
                            limits.chargingLimitationsEnabled = true
                            limits.maxCurrentChargingPower = requestedWattLimit

                            hps.getApi().writeChargingLimits(limits, true, hps)
                                .then(result => {
                                    if (result.maxCurrentChargingPower == ResultCode.SUCCESS) {
                                        hps.log('Max allowed charging power configured')
                                        const token = {
                                            'max charging limit': requestedWattLimit
                                        }
                                        resolve(token)
                                    }
                                    else {
                                        hps.error('Failed to configure max allowed charging power: ResultCode=' + result.maxCurrentChargingPower)
                                        reject(hps.translate('messages.requested-max-charging-power-denied-by-hps', {RESULTCODE: getResultCode(result.maxCurrentChargingPower, hps)}))
                                    }
                                })
                                .catch(e => {
                                    hps.error('Writing charging limits failed: ' + e)
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

