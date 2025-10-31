import Homey, { FlowCard, FlowCardTriggerDevice } from 'homey';
import { MqttClient } from 'mqtt';

class MyDevice extends Homey.Device {

  // @ts-ignore
  private client: MqttClient = this.homey.app.client;

  private whenDeviceIsCloserThanXMetersCard: FlowCardTriggerDevice|undefined;
  private whenDeviceIsFurtherThanXMetersCard: FlowCardTriggerDevice|undefined;
  private whenDeviceIsNoLongerDetectedCard: FlowCardTriggerDevice|undefined;
  private timers: {[key: string]: ReturnType<typeof setTimeout>} = {};
  private connectionLosTimeInSeconds = 30;

  async onInit() {
    this.log('MyDevice has been initialized');

    // MQTT
    this.client.subscribe(`espresense/rooms/${this.getData().id}/#`);
    this.client.subscribe('espresense/devices/#');
    this.client.on('message', this.messageReceived.bind(this));

    // Flows
    this.whenDeviceIsCloserThanXMetersCard = this.homey.flow.getDeviceTriggerCard('when-device-is-closer-than-x-meters');
    this.whenDeviceIsFurtherThanXMetersCard = this.homey.flow.getDeviceTriggerCard('when-device-is-further-than-x-meters');
    this.whenDeviceIsNoLongerDetectedCard = this.homey.flow.getDeviceTriggerCard('when-device-is-no-longer-detected');
  }

  async messageReceived(topic: any, message: any) {
    if (topic.toString().includes(`espresense/rooms/${this.getData().id}/max_distance`)) {
      await this.setCapabilityValue('espresense_max_distance_capability', parseFloat(message.toString()));
    }

    if (topic.toString().includes(`espresense/rooms/${this.getData().id}/status`)) {
      await this.setCapabilityValue('espresense_status_capability', message.toString());
    }

    if (topic.toString().includes('devices') && topic.toString().includes(this.getData().id)) {
      const espresenseId = topic.toString().replace('espresense/devices/', '').split('/')[0];

      // Get device name
      const deviceName = this.homey.settings.get('mapping')[espresenseId];

      if (!deviceName) {
        return;
      }

      if (!this.hasCapability(`espresense_distance_capability.${deviceName}`)) {
        await this.addCapability(`espresense_distance_capability.${deviceName}`);
      }

      const json = JSON.parse(message.toString());
      await this.setCapabilityValue(`espresense_distance_capability.${deviceName}`, json.distance);
      await this.setCapabilityOptions(`espresense_distance_capability.${deviceName}`, {title: {"en": `${deviceName}` } });
      
      // this.log(deviceName);
      // this.log(json.distance);
      // Trigger flow cards
      await this.whenDeviceIsCloserThanXMetersCard?.trigger(this, {
        'device-distance': json.distance,
      }, {
        deviceId: deviceName,
        distance: json.distance,
      });

      await this.whenDeviceIsFurtherThanXMetersCard?.trigger(this, {
        'device-distance': json.distance,
      }, {
        deviceId: deviceName,
        distance: json.distance,
      });

      // Add timer for losing connection
      if (this.timers[deviceName]) {
        clearTimeout(this.timers[deviceName]);
      }

      this.timers[deviceName] = setTimeout(async () => {
        // Remove from object
        delete this.timers[deviceName];

        // Run further card
        await this.whenDeviceIsFurtherThanXMetersCard?.trigger(this, {
          'device-distance': json.distance,
        }, {
          deviceId: deviceName,
          distance: this.getCapabilityValue('espresense_max_distance_capability'),
        });

        // Run device not responding card
        await this.whenDeviceIsNoLongerDetectedCard?.trigger(this, undefined, {
          deviceId: deviceName
        });
         
      }, this.connectionLosTimeInSeconds * 1000);
    }
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
