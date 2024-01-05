import {RscpApi} from '../rscp-api';

export interface HomePowerStation {
    getApi(): RscpApi
    getId(): string
}
