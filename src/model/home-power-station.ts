import {RscpApi} from '../rscp-api';
import {CardUnit} from '../../drivers/home-power-station/device';
import {InternalDevice} from '../internal-api/internal-device';

export interface HomePowerStation extends InternalDevice{
    getApi(): RscpApi
    getId(): string
    validateUnit(value: number, unit: CardUnit): string | undefined
}
