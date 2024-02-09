import {Logger} from '../../internal-api/logger';
import {Device, FlowCardTriggerDevice} from 'homey';
import {TriggerCard} from '../trigger-card';

export class IslandModeStartedTrigger implements TriggerCard<undefined>{

    constructor(
        private device: Device,
        private card: FlowCardTriggerDevice,
        private logger: Logger) {
    }

    trigger(input: undefined): void {
        this.logger.log('IslandModeStartedTrigger: Triggering card')
        this.card.trigger(this.device)
            .then(value => {
                this.logger.error('Calling trigger card IslandModeStartedTrigger success')
            })
            .catch(reason => {
                this.logger.error('Calling trigger card IslandModeStartedTrigger failed')
                this.logger.error(reason)
            })
    }
}
