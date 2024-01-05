import {ValueChanged} from '../model/value-changed';
import {Device} from 'homey';

export function updateCapabilityValue<T>(id: string, newValue: T, device: Device): ValueChanged<T> | undefined {
    const oldValue = device.getCapabilityValue(id);
    if (newValue !== oldValue) {
        device.log(device.getName() + ": setting new value for " + id)
        device.setCapabilityValue(id, newValue).then(() => {})
        return {
            oldValue: oldValue,
            newValue: newValue
        }
    }
    else {
        device.log(device.getName() + ': skipping value for ' + id + ' -> no change')
        return undefined
    }
}
