import {ValueChanged} from '../model/value-changed';
import {TriggerCard} from './trigger-card';

export interface ValueChangedTrigger<T> extends TriggerCard<ValueChanged<T>>{
    runIfChanged(input: ValueChanged<T> | undefined):any
}
