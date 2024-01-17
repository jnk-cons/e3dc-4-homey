import {ValueChanged} from '../model/value-changed';

export interface Trigger<T> {
    runIfChanged(input: ValueChanged<T> | undefined):any
}
