import Homey, { FlowCard, FlowCardTriggerDevice } from 'homey';

import { ESPresenseClient } from '../../lib/classes/espresense'
import { ESPresenseApp } from '../../app';

class ESPresenseBeaconDriver extends Homey.Driver {
  private client?: ESPresenseClient = (this.homey.app as ESPresenseApp).client;

  private whenDeviceIsDetectedAfterXMinutesCard: FlowCardTriggerDevice|undefined;
  
  async onInit() {
    this.log('ESPresenseBeaconDriver has been initialized');

    this.whenDeviceIsDetectedAfterXMinutesCard = this.homey.flow.getDeviceTriggerCard('beacon-when-device-is-detected-after-x-minutes');
    this.whenDeviceIsDetectedAfterXMinutesCard.registerRunListener(async (args: any, state: any) => {
      return state.duration > args.duration * 60 * 1000; // Convert minutes to ms
    });
  }
  
  onPairListDevices(): Promise<any[]> {
    if (this.client) {
      const deviceEntries = Object.entries(this.client.devices);
      return Promise.resolve(
        deviceEntries.map(([deviceId, device]) => ({
          name: device.id,
          data: {
            id: deviceId,
          },
        }))
      );
    } else {
      return Promise.resolve([]);
    }
  }
}

module.exports = ESPresenseBeaconDriver;
