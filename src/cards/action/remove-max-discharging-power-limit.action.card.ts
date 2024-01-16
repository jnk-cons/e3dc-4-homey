
import {RunListener} from '../run-listener';
import {ResultCode} from 'easy-rscp';
import {getResultCode} from '../../utils/i18n-utils';
import {CardUnit} from '../../../drivers/home-power-station/device';
import {HomePowerStation} from '../../model/home-power-station';

export class RemoveMaxDischargingPowerLimitActionCard implements RunListener {
    run(args: any, state: any): Promise<any> {
        return new Promise<any>(async (resolve, reject) => {
            const hps: HomePowerStation = args.device;
            hps.log('Starting card to remove the max discharging power limit')

            hps.getApi().readChargingConfiguration(true, hps.asSimple())
                .then(config => {
                    const limits = config.currentLimitations
                    limits.maxCurrentDischargingPower = config.maxPossibleDischargingPower
                    if (limits.maxCurrentChargingPower == config.maxPossibleChargingPower
                        && limits.dischargeStartPower == config.defaultStartChargingThreshold) {
                        limits.chargingLimitationsEnabled = false
                    }

                    hps.getApi().writeChargingLimits(limits, true, hps)
                        .then(result => {
                            if (result.maxCurrentDischargingPower == ResultCode.SUCCESS) {
                                hps.log('Limit of the max allowed discharging power removed')
                                const token = {
                                    'max discharging limit': config.maxPossibleDischargingPower
                                }
                                resolve(token)
                            }
                            else {
                                hps.error('Failed to remove max allowed discharging power: ResultCode=' + result.maxCurrentDischargingPower)
                                reject(hps.translate('messages.requested-max-discharging-power-denied-by-hps', {RESULTCODE: getResultCode(result.maxCurrentDischargingPower, hps)}))
                            }
                        })
                        .catch(e => {
                            hps.error('Writing discharging limits failed: ' + e)
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

