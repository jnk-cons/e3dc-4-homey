import {InternalDevice} from '../internal-api/internal-device';
import {WallboxPowerState} from 'easy-rscp';

export interface Wallbox extends InternalDevice{
    sync(state: WallboxPowerState): void
}
