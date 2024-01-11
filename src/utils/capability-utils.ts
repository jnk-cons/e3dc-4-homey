import {ValueChanged} from '../model/value-changed';
import {Device} from 'homey';

export function updateCapabilityValue<T>(id: string, newValue: T, device: Device): ValueChanged<T> | undefined {
    if (device.hasCapability(id)) {
        return executeUpdateCapabilityValue(id, newValue, device)
    }
    else {
        device.log('Capability ' + id + ' not found on device. Adding it ...')
        device.addCapability(id)
            .then(value => executeUpdateCapabilityValue(id, newValue, device))
            .catch(reason => {
                device.error('Adding of capability ' + id + ' failed. Reason: ' + reason)
                device.error(reason)
            })
        return undefined
    }
}

function executeUpdateCapabilityValue<T>(id: string, newValue: T, device: Device): ValueChanged<T> | undefined {
    const oldValue = device.getCapabilityValue(id);
    if (newValue !== oldValue) {
        device.log(device.getName() + ": setting new value for " + id)
        device.setCapabilityValue(id, newValue).then(() => {
        })
        return {
            oldValue: oldValue,
            newValue: newValue
        }
    } else {
        device.log(device.getName() + ': skipping value for ' + id + ' -> no change')
        return undefined
    }
}
