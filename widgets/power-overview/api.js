'use strict';

module.exports = {
  async readHomePowerPlants({homey, query}) {
    return await homey.app.readHomePowerPlants()
  },

  async log({homey, body}) {
    return homey.app.logFromWidget(body.widget, body.message)
  },

};
