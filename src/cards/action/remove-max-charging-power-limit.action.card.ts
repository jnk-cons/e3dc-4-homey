
import {RunListener} from '../run-listener';
import {ResultCode} from 'easy-rscp';
import {getResultCode} from '../../utils/i18n-utils';
import {CardUnit} from '../../../drivers/home-power-station/device';
import {HomePowerStation} from '../../model/home-power-station';

export class RemoveMaxChargingPowerLimitActionCard implements RunListener {
    run(args: any, state: any): Promise<any> {
        return new Promise<any>(async (resolve, reject) => {
            const hps: HomePowerStation = args.device;
            hps.log('Starting card to remove the max charging power limit')

            hps.getApi().readChargingConfiguration(true, hps.asSimple())
                .then(config => {
                    const limits = config.currentLimitations
                    limits.maxCurrentChargingPower = config.maxPossibleChargingPower
                    if (limits.maxCurrentDischargingPower == config.maxPossibleDischargingPower
                        && limits.dischargeStartPower == config.defaultStartChargingThreshold) {
                        limits.chargingLimitationsEnabled = false
                    }

                    hps.getApi().writeChargingLimits(limits, true, hps)
                        .then(result => {
                            if (result.maxCurrentChargingPower == ResultCode.SUCCESS) {
                                hps.log('Limit of the max allowed charging power removed')
                                const token = {
                                    'max charging limit': config.maxPossibleChargingPower
                                }
                                resolve(token)
                            }
                            else {
                                hps.error('Failed to remove max allowed charging power: ResultCode=' + result.maxCurrentChargingPower)
                                reject(hps.translate('messages.removal-of-all-powerlimits-denied-by-hps', {RESULTCODE: getResultCode(result.maxCurrentChargingPower, hps)}))
                            }
                        })
                        .catch(e => {
                            hps.error('Writing charging limits failed: ' + e)
                            hps.error(e)
                            reject(e)
                        })


                })
                .catch(e => {
                    hps.error('Reading charging configuration failed: ' + e)
                    hps.error(e)
                    reject(e)
                })

        })
    }

}

