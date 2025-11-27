import Homey, { FlowCard, FlowCardTriggerDevice } from 'homey';

import { ESPresenseClient } from '../../lib/classes/espresense'
import { ESPresenseApp } from '../../app';

class ESPresenseBeaconDriver extends Homey.Driver {
  private client?: ESPresenseClient = (this.homey.app as ESPresenseApp).client;

  private whenDeviceIsNoLongerDetectedWithinXMinutesCard: FlowCardTriggerDevice|undefined;
  private whenDeviceIsDetectedAfterXMinutesCard: FlowCardTriggerDevice|undefined;
  
  async onInit() {
    this.log('ESPresenseBeaconDriver has been initialized');

     this.whenDeviceIsNoLongerDetectedWithinXMinutesCard = this.homey.flow.getDeviceTriggerCard('beacon-when-device-is-no-longer-detected');
     this.whenDeviceIsNoLongerDetectedWithinXMinutesCard.registerRunListener(async (args: any, state: any) => {
       return true;
     });

    this.whenDeviceIsDetectedAfterXMinutesCard = this.homey.flow.getDeviceTriggerCard('beacon-when-device-is-detected-after-x-minutes');
    this.whenDeviceIsDetectedAfterXMinutesCard.registerRunListener(async (args: any, state: any) => {
      return true;
    });
  }
  
  onPairListDevices(): Promise<any[]> {
    if (this.client) {
      const deviceEntries = Object.entries(this.client.devices);
      return Promise.resolve(
        deviceEntries.map(([deviceId, device]) => ({
          name: device.name ?? device.id,
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
