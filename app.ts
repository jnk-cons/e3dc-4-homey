import Homey from 'homey';
import {DefaultHomePowerPlantConnection, HomePowerPlantConnection} from '../easy-rscp-js';

class MyApp extends Homey.App {

  /**
   * onInit is called when the app is initialized.
   */
  async onInit() {
    this.log('E3DC home-power-station has been initialized');
  }

}

module.exports = MyApp;
