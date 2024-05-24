import Homey from 'homey';
import { MqttClient } from 'mqtt';

class MyDevice extends Homey.Device {

  // @ts-ignore
  private client: MqttClient = this.homey.app.client;
  private myCode: string = '';

  async onInit() {
    this.log('ESPresense beacon been initialized');

    const mapping = this.homey.settings.get('mapping');
    this.myCode = Object.keys(mapping).find((key) => mapping[key] === this.getData().id) ?? '';

    this.client.subscribe('espresense/devices/#');
    this.client.on('message', this.messageReceived.bind(this));
  }

  async messageReceived(topic: any, message: any) {
    if (!topic.toString().includes('devices') || !topic.toString().includes(this.myCode)) {
      return;
    }

    const json = JSON.parse(message.toString());

    this.log(topic);
    this.log(message);
  }

  /**
   * onSettings is called when the user updates the device's settings.
   * @param {object} event the onSettings event data
   * @param {object} event.oldSettings The old settings object
   * @param {object} event.newSettings The new settings object
   * @param {string[]} event.changedKeys An array of keys changed since the previous version
   * @returns {Promise<string|void>} return a custom message that will be displayed
   */
  async onSettings({
    oldSettings,
    newSettings,
    changedKeys,
  }: {
    oldSettings: { [key: string]: boolean | string | number | undefined | null };
    newSettings: { [key: string]: boolean | string | number | undefined | null };
    changedKeys: string[];
  }): Promise<string | void> {
    this.log('MyDevice settings where changed');
  }

  async onDeleted() {
    this.client.off('message', this.messageReceived);
    this.client.unsubscribe(`espresense/rooms/${this.getData().id}/#`);
    this.client.unsubscribe('espresense/devices/#');
  }

  onUninit(): Promise<void> {
    this.client.off('message', this.messageReceived);
    this.client.unsubscribe(`espresense/rooms/${this.getData().id}/#`);
    this.client.unsubscribe('espresense/devices/#');
    return super.onUninit();
  }

}

module.exports = MyDevice;
