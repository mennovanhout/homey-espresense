import Homey, { FlowCard, FlowCardTriggerDevice } from 'homey';
import PairSession from 'homey/lib/PairSession';

import { ESPresenseClient } from '../../lib/classes/espresense'
import { ESPresenseApp } from '../../app';

class ESPresenseNodeDriver extends Homey.Driver {
  private client?: ESPresenseClient = (this.homey.app as ESPresenseApp).client;

  private whenDeviceIsCloserThanXMetersCard: FlowCardTriggerDevice|undefined;
  private whenDeviceIsFurtherThanXMetersCard: FlowCardTriggerDevice|undefined;
  private whenDeviceIsNoLongerDetectedCard: FlowCardTriggerDevice|undefined;

  async deviceAutocompleteListener(query: string, args: any): Promise<FlowCard.ArgumentAutocompleteResults> {
    if (this.client) {
      const suggestions = Object.entries(this.client.devices).map(([key, device]) => {
        return {
         id: device.id,
         name: device.name
        };
      });

      return suggestions.filter((item) =>
        item.name.toLowerCase().includes(query.toLowerCase())
      );
    } else {
      return [];
    }
  }
  
  async onInit() {
    this.log('ESPresenseNodeDriver has been initialized');

    // Flows
    this.whenDeviceIsCloserThanXMetersCard = this.homey.flow.getDeviceTriggerCard('when-device-is-closer-than-x-meters');
    this.whenDeviceIsCloserThanXMetersCard.registerArgumentAutocompleteListener('deviceId', this.deviceAutocompleteListener.bind(this));
    this.whenDeviceIsCloserThanXMetersCard.registerRunListener(async (args: any, state: any) => {
      return state.distance < args.distance && args.deviceId.id === state.deviceId;
    });

    this.whenDeviceIsFurtherThanXMetersCard = this.homey.flow.getDeviceTriggerCard('when-device-is-further-than-x-meters');
    this.whenDeviceIsFurtherThanXMetersCard.registerArgumentAutocompleteListener('deviceId', this.deviceAutocompleteListener.bind(this));
    this.whenDeviceIsFurtherThanXMetersCard.registerRunListener(async (args: any, state: any) => {
      return state.distance > args.distance && args.deviceId.id === state.deviceId;
    });

    this.whenDeviceIsNoLongerDetectedCard = this.homey.flow.getDeviceTriggerCard('when-device-is-no-longer-detected');
    this.whenDeviceIsNoLongerDetectedCard.registerArgumentAutocompleteListener('deviceId', this.deviceAutocompleteListener.bind(this));
    this.whenDeviceIsNoLongerDetectedCard.registerRunListener(async (args: any, state: any) => {
      return args.deviceId.id === state.deviceId;
    });
  }

  async onPair(session: PairSession) {
    session.setHandler('showView', async (view: string) => {
      if (view === 'loading') {
        if (!this.client?.connected) {
          this.log('MQTT is not connected');
          await session.showView('mqtt_error');
          return;
        }

        // Show a specific view by ID
        await session.showView('list_devices');
      }
    });

    session.setHandler('list_devices', this.onPairListDevices.bind(this));
  }

  onPairListDevices(): Promise<any[]> {
    if (this.client) {
      const roomEntries = Object.entries(this.client.rooms);
      return Promise.resolve(
        roomEntries.map(([roomId, room]) => ({
          name: room.name,
          data: {
            id: roomId,
          },
        }))
      );
    } else {
      return Promise.resolve([]);
    }
  }
}

module.exports = ESPresenseNodeDriver;
