import {Trigger} from '../trigger';
import {ValueChanged} from '../../model/value-changed';
import {Logger} from '../../internal-api/logger';
import {Device, FlowCardTriggerDevice} from 'homey';

export class SimpleValueChangedTrigger<T> implements Trigger<T> {

    constructor(
        private name: string,
        private device: Device,
        private card: FlowCardTriggerDevice,
        private logger: Logger) {
    }

    runIfChanged(input: ValueChanged<T> | undefined): any {
        this.logger.log(this.name + ' change trigger running:')
        this.logger.log(input)
        if (input && input.oldValue != null && input.newValue != null && input.oldValue != input.newValue) {
            const tokens = {
                'old': input.oldValue,
                'new': input.newValue
            }
            this.logger.log(this.name + ' change detected. Triggering changed card')
            this.card.trigger(this.device, tokens)
                .then(value => {
                    this.logger.error('Calling trigger card ' + this.name + ' success')
                })
                .catch(reason => {
                    this.logger.error('Calling trigger card ' + this.name + ' failed')
                    this.logger.error(reason)
                })
        }
    }

}
