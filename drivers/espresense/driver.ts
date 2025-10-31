import Homey, { FlowCard, FlowCardTriggerDevice } from 'homey';
import PairSession from 'homey/lib/PairSession';
import { MqttClient } from 'mqtt';

class ESPresenseDriver extends Homey.Driver {

  private whenDeviceIsCloserThanXMetersCard: FlowCardTriggerDevice|undefined;
  private whenDeviceIsFurtherThanXMetersCard: FlowCardTriggerDevice|undefined;
  private whenDeviceIsNoLongerDetectedCard: FlowCardTriggerDevice|undefined;

  async deviceAutocompleteListener(query: string, args: any): Promise<FlowCard.ArgumentAutocompleteResults> {
    const names: any = (Object.values(this.homey.settings.get('mapping')) || []).map((name) => {
      return {
        name,
      };
    });

    return names.filter((result: any) => result.name.toLowerCase().includes(query.toLowerCase()));
  }
  
  async onInit() {
    this.log('ESPresenseDriver has been initialized');

    // Flows
    this.whenDeviceIsCloserThanXMetersCard = this.homey.flow.getDeviceTriggerCard('when-device-is-closer-than-x-meters');
    this.whenDeviceIsCloserThanXMetersCard.registerArgumentAutocompleteListener('deviceId', this.deviceAutocompleteListener.bind(this));
    this.whenDeviceIsCloserThanXMetersCard.registerRunListener(async (args: any, state: any) => {
      return state.distance < args.distance && args.deviceId.name === state.deviceId;
    });

    this.whenDeviceIsFurtherThanXMetersCard = this.homey.flow.getDeviceTriggerCard('when-device-is-further-than-x-meters');
    this.whenDeviceIsFurtherThanXMetersCard.registerArgumentAutocompleteListener('deviceId', this.deviceAutocompleteListener.bind(this));
    this.whenDeviceIsFurtherThanXMetersCard.registerRunListener(async (args: any, state: any) => {
      return state.distance > args.distance && args.deviceId.name === state.deviceId;
    });

    this.whenDeviceIsNoLongerDetectedCard = this.homey.flow.getDeviceTriggerCard('when-device-is-no-longer-detected');
    this.whenDeviceIsNoLongerDetectedCard.registerArgumentAutocompleteListener('deviceId', this.deviceAutocompleteListener.bind(this));
    this.whenDeviceIsNoLongerDetectedCard.registerRunListener(async (args: any, state: any) => {
      return args.deviceId.name === state.deviceId;
    });
  }

  async onPair(session: PairSession) {
    session.setHandler('showView', async (view: string) => {
      if (view === 'loading') {
        // @ts-ignore
        const { client }: MqttClient = this.homey.app;

        if (!client.connected) {
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
    // @ts-ignore
    const { rooms }: { rooms: string[] } = this.homey.app;

    return Promise.resolve(rooms.map((room) => ({
      name: room,
      data: {
        id: room,
      },
    })));
  }

}

module.exports = ESPresenseDriver;
