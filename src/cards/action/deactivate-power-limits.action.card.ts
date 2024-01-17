import {RunListener} from '../run-listener';
import {ResultCode} from 'easy-rscp';
import {getResultCode} from '../../utils/i18n-utils';
import {HomePowerStation} from '../../model/home-power-station';

export class DeactivatePowerLimitsActionCard implements RunListener {
    run(args: any, state: any): Promise<any> {
        return new Promise<any>(async (resolve, reject) => {
            const hps: HomePowerStation = args.device;
            hps.log('Starting card to deactivate preconfigured power limits')

            hps.getApi().readChargingConfiguration(true, hps.asSimple())
                .then(config => {
                    const limits = config.currentLimitations
                    if (!limits.chargingLimitationsEnabled) {
                        hps.log('Limits already deactivated')
                        const token = {
                            'max charging limit': config.maxPossibleChargingPower,
                            'max discharging limit': config.maxPossibleDischargingPower,
                        }
                        resolve(token)
                    }
                    else {
                        limits.chargingLimitationsEnabled = false

                        hps.getApi().writeChargingLimits(limits, true, hps)
                            .then(result => {
                                if (result.chargingLimitationsEnabled == ResultCode.SUCCESS) {
                                    hps.log('Successful deactivated the limits')
                                    const token = {
                                        'max charging limit': config.maxPossibleChargingPower,
                                        'max discharging limit': config.maxPossibleDischargingPower,
                                    }
                                    resolve(token)
                                } else {
                                    hps.error('Deactivation of preconfigured power limits failed by HPS: ' + result.chargingLimitationsEnabled)
                                    reject(hps.translate('messages.deactivating-of-powerlimits-failed-by-hps',
                                        {
                                            RESULTCODE: getResultCode(result.chargingLimitationsEnabled, hps)
                                        }))
                                }
                            })
                            .catch(e => {
                                hps.error('Deactivating preconfigured power limits failed: ' + e)
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

        })
    }

}

