import Homey from 'homey';

class MyApp extends Homey.App {

  /**
   * onInit is called when the app is initialized.
   */
  async onInit() {
    this.log('E3DC home-power-station has been initialized');
    // @ts-ignore
    const powerOverviewWidget = this.homey.dashboards.getWidget('power-overview')
    // @ts-ignore
    powerOverviewWidget.registerSettingAutocompleteListener('plantId', async (query, settings) => {
      let devices = await this.readHomePowerPlants()
      return devices.filter((item) => item.name.toLowerCase().includes(query.toLowerCase()));
    });

  }

  logFromWidget(widget: string, message: string) {
    this.log('[WIDGET] [' + widget + '] ' + message);

    // const homePowerStations = this.homey.drivers.getDriver('home-power-station').getDevices()
    // if (homePowerStations.length > 0) {
    //   let persistantLog: LogEntry[] | undefined = undefined
    //   if (homePowerStations[0].hasCapability('debug_log')) {
    //     persistantLog = JSON.parse(homePowerStations[0].getCapabilityValue('debug_log'))
    //   }
    //   else {
    //     persistantLog = []
    //   }
    //   if (persistantLog == undefined) {
    //     persistantLog = []
    //   }
    //   persistantLog.push({ timestamp: new Date(), message: message });
    //
    //   while (persistantLog.length > 30) {
    //     persistantLog.shift();
    //   }
    //   updateCapabilityValue('debug_log', JSON.stringify(persistantLog), homePowerStations[0])
    // }
  }

  async readHomePowerPlants(): Promise<HomePowerPlant[]> {
    return new Promise(async (resolve, reject) => {
      const homePowerStations = this.homey.drivers.getDriver('home-power-station').getDevices()
      let devices = []
      for(let i = 0; i < homePowerStations.length; i++) {
        let station = homePowerStations[i];
        const stationData = await station.getData();
        const stationId = stationData.id;
        const name = station.getName()
        let wallboxPower = 0;
        let wallboxSolarShare = 0
        if (station.hasCapability('measure_wallbox_consumption')) {
          wallboxPower = station.getCapabilityValue('measure_wallbox_consumption')
        }
        if (station.hasCapability('measure_wallbox_solarshare')) {
          wallboxSolarShare = station.getCapabilityValue('measure_wallbox_solarshare')
        }
        devices.push({
          name: name,
          id: stationId,
          powerState: {
            consumption: station.getCapabilityValue('measure_house_consumption'),
            pvPower: station.getCapabilityValue('measure_pv_delivery'),
            gridPower: station.getCapabilityValue('measure_grid_delivery') * -1,
            batteryPower: station.getCapabilityValue('measure_battery_delivery'),
            batteryLevel: station.getCapabilityValue('measure_battery'),
            wallboxPower: wallboxPower,
            wallboxSolarShare: wallboxSolarShare,
            externalPowerConnected: station.getCapabilityValue('external_power_delivery_connected'),
            externalPower: station.getCapabilityValue('measure_external_power_delivery'),
          }
        })
      }
      resolve(devices)
    })
  }

  async demoTest(): Promise<string> {
    return new Promise<string>((resolve, reject) => {
      resolve('real data')
    })
  }
}

interface HomePowerPlant {
  id: String,
  name: String,
  powerState: PowerStatus
}

interface PowerStatus {
  consumption: number,
  pvPower: number,
  gridPower: number,
  batteryPower: number,
  batteryLevel: number,
  wallboxPower: number,
  wallboxSolarShare: number
}

interface LogEntry {
  timestamp: Date,
  message: string,
}

module.exports = MyApp;
