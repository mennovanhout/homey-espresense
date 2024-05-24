import Homey from 'homey';
import PairSession from 'homey/lib/PairSession';
import { MqttClient } from 'mqtt';

class ESPresenseDriver extends Homey.Driver {

  async onInit() {
    this.log('ESPresenseDriver has been initialized');
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
