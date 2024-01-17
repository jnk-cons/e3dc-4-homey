import {RunListener} from '../run-listener';
import {ResultCode} from 'easy-rscp';
import {getResultCode} from '../../utils/i18n-utils';
import {HomePowerStation} from '../../model/home-power-station';

export class SetPowerLimitsToDefaultActionCard implements RunListener {
    run(args: any, state: any): Promise<any> {
        return new Promise<any>(async (resolve, reject) => {
            const hps: HomePowerStation = args.device;
            hps.log('Starting card to set all power limits to default')

            hps.getApi().readChargingConfiguration(true, hps.asSimple())
                .then(config => {
                    const limits = config.currentLimitations
                    limits.maxCurrentChargingPower = config.maxPossibleChargingPower
                    limits.maxCurrentDischargingPower = config.maxPossibleDischargingPower
                    limits.chargingLimitationsEnabled = false
                    limits.dischargeStartPower = config.defaultStartChargingThreshold

                    hps.getApi().writeChargingLimits(limits, true, hps)
                        .then(result => {
                            if (result.maxCurrentChargingPower == ResultCode.SUCCESS
                                && result.maxCurrentDischargingPower == ResultCode.SUCCESS
                                && result.chargingLimitationsEnabled == ResultCode.SUCCESS
                                && result.dischargeStartPower == ResultCode.SUCCESS) {
                                hps.log('Successful removal of limits')
                                const token = {
                                    'max charging limit': config.maxPossibleChargingPower,
                                    'max discharging limit': config.maxPossibleDischargingPower,
                                }
                                resolve(token)
                            }
                            else {
                                hps.error('Failed to remove all power limits allowed charging power: Charging limit=' + result.maxCurrentChargingPower
                                    + ', Discharging limit=' + result.maxCurrentDischargingPower
                                    + ', startPower=' + result.dischargeStartPower
                                    + ', switch=' + result.chargingLimitationsEnabled)
                                reject(hps.translate('messages.removal-of-all-powerlimits-denied-by-hps',
                                    {
                                        CHARGING_RESULTCODE: getResultCode(result.maxCurrentChargingPower, hps),
                                        DISCHARGING_RESULTCODE: getResultCode(result.maxCurrentDischargingPower, hps),
                                        START_RESULTCODE: getResultCode(result.dischargeStartPower, hps),
                                        SWITCH_RESULTCODE: getResultCode(result.chargingLimitationsEnabled, hps)
                                    }))
                            }
                        })
                        .catch(e => {
                            hps.error('Removing power limits failed: ' + e)
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

