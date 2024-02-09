import {Logger} from '../../internal-api/logger';
import {Device, FlowCardTriggerDevice} from 'homey';
import {TriggerCard} from '../trigger-card';

export class ManualBatteryChargingStoppedTrigger implements TriggerCard<number>{

    constructor(
        private device: Device,
        private card: FlowCardTriggerDevice,
        private logger: Logger) {
    }

    trigger(input: number): void {
        this.logger.log('ManualBatteryChargingStoppedTrigger: Triggering card with ' + input)
        const tokens = {
            loadedEnergy: input
        }
        this.card.trigger(this.device, tokens)
            .then(value => {
                this.logger.error('Calling trigger card ManualBatteryChargingStoppedTrigger success')
            })
            .catch(reason => {
                this.logger.error('Calling trigger card ManualBatteryChargingStoppedTrigger failed')
                this.logger.error(reason)
            })
    }
}
