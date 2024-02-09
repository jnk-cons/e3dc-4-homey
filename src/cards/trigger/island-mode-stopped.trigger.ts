import {Logger} from '../../internal-api/logger';
import {Device, FlowCardTriggerDevice} from 'homey';
import {TriggerCard} from '../trigger-card';

export class IslandModeStoppedTrigger implements TriggerCard<undefined>{

    constructor(
        private device: Device,
        private card: FlowCardTriggerDevice,
        private logger: Logger) {
    }

    trigger(input: undefined): void {
        this.logger.log('IslandModeStoppedTrigger: Triggering card')
        this.card.trigger(this.device)
            .then(value => {
                this.logger.error('Calling trigger card IslandModeStoppedTrigger success')
            })
            .catch(reason => {
                this.logger.error('Calling trigger card IslandModeStoppedTrigger failed')
                this.logger.error(reason)
            })
    }
}
