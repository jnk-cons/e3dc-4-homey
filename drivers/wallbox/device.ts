import Homey, {SimpleClass} from 'homey';
import {Wallbox} from '../../src/model/wallbox';
import {WallboxPowerState} from 'easy-rscp';
import {updateCapabilityValue} from '../../src/utils/capability-utils';

class WallboxDevice extends Homey.Device implements Wallbox{

  async onInit() {
    this.log('WallboxDevice has been initialized');
  }

  async onAdded() {
    this.log('WallboxDevice has been added');
  }

  sync(state: WallboxPowerState): void {
    updateCapabilityValue('measure_wallbox_consumption', state.powerW, this)
    updateCapabilityValue('measure_wallbox_solarshare', state.solarPowerW, this)
  }

  async onSettings({
    oldSettings,
    newSettings,
    changedKeys,
  }: {
    oldSettings: { [key: string]: boolean | string | number | undefined | null };
    newSettings: { [key: string]: boolean | string | number | undefined | null };
    changedKeys: string[];
  }): Promise<string | void> {
    this.log("WallboxDevice settings where changed");
  }

  async onRenamed(name: string) {
    this.log('WallboxDevice was renamed');
  }

  async onDeleted() {
    this.log('WallboxDevice has been deleted');
  }

  asSimple(): SimpleClass {
    return this;
  }

  translate(key: string | Object, tags?: Object | undefined): string {
    return this.homey.__(key, tags);
  }

}

module.exports = WallboxDevice;
