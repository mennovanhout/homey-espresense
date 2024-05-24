import Homey from 'homey';
import { connect, MqttClient } from 'mqtt';

class ESPresenseApp extends Homey.App {

  public client: MqttClient|undefined;
  public rooms: string[] = [];

  async onInit() {
    this.log('ESPresenceApp has been initialized');
    this.log('Connecting to MQTT');

    const server = this.homey.settings.get('server');
    const port = this.homey.settings.get('port');
    const username = this.homey.settings.get('username');
    const password = this.homey.settings.get('password');

    this.client = connect(`mqtt://${server}`, {
      username,
      password,
      port,
    });

    this.client.on('connect', () => {
      this.log('Connected to MQTT');

      // Keep rooms updated
      this.client?.subscribe('espresense/rooms/#');
      this.client?.on('message', (topic, message) => {
        if (!topic.toString().includes('espresense/rooms/')) {
          return;
        }

        const room = topic.toString().replace('espresense/rooms/', '').split('/')[0];

        if (this.rooms.indexOf(room) === -1) {
          this.rooms.push(room);
          this.log(`Added room ${room}`);
        }
      });
    });
  }

}

module.exports = ESPresenseApp;
