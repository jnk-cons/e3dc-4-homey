import {Logger} from '../../internal-api/logger';
import {Device, FlowCardTriggerDevice} from 'homey';
import {TriggerCard} from '../trigger-card';

export class ManualBatteryChargingStartedTrigger implements TriggerCard<undefined>{

    constructor(
        private device: Device,
        private card: FlowCardTriggerDevice,
        private logger: Logger) {
    }

    trigger(input: undefined): void {
        this.logger.log('ManualBatteryChargingStartedTrigger: Triggering card')
        this.card.trigger(this.device)
            .then(value => {
                this.logger.error('Calling trigger card ManualBatteryChargingStartedTrigger success')
            })
            .catch(reason => {
                this.logger.error('Calling trigger card ManualBatteryChargingStartedTrigger failed')
                this.logger.error(reason)
            })
    }
}
