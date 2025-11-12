import Homey, { FlowCardTriggerDevice } from 'homey';
import { ESPresenseClient } from '../../lib/classes/espresense'
import { ESPresenseDevice, ESPresenseRoom, DeviceMessageFunction, RoomMessageFunction } from '../../lib/types/espresense';
import { ESPresenseApp } from '../../app';

class ESPresenseNodeDevice extends Homey.Device {
  private client?: ESPresenseClient = (this.homey.app as ESPresenseApp).client;

  private roomId! : string;
  
  private whenDeviceIsCloserThanXMetersCard: FlowCardTriggerDevice|undefined;
  private whenDeviceIsFurtherThanXMetersCard: FlowCardTriggerDevice|undefined;
  private whenDeviceIsNoLongerDetectedCard: FlowCardTriggerDevice|undefined;
  
  private timers: {[key: string]: ReturnType<typeof setTimeout>} = {};
  private connectionLostTimeInSeconds = 30;

  private boundDeviceMessageHandler? : DeviceMessageFunction;
  private boundRoomMessageHandler? : RoomMessageFunction;

  async onInit() {
    this.log('ESPresenseNodeDevice has been initialized');

    // Store device id for easy access
    this.roomId = this.getData().id;

    // Flows
    this.whenDeviceIsCloserThanXMetersCard = this.homey.flow.getDeviceTriggerCard('when-device-is-closer-than-x-meters');
    this.whenDeviceIsFurtherThanXMetersCard = this.homey.flow.getDeviceTriggerCard('when-device-is-further-than-x-meters');
    this.whenDeviceIsNoLongerDetectedCard = this.homey.flow.getDeviceTriggerCard('when-device-is-no-longer-detected');

    await this.register();
  }

  async onAdded() {
    this.log('ESPresenseNodeDevice has been added');
    this.client?.forceUpdate();
  }

  async onRenamed(name: string) {
    this.client?.registerRoom(this.roomId, name);
  }

  async register() {
    this.boundDeviceMessageHandler = this.deviceMessageHandler.bind(this);
    this.client?.on('deviceMessage', this.boundDeviceMessageHandler);
    this.boundRoomMessageHandler = this.roomMessageHandler.bind(this);
    this.client?.on('roomMessage', this.boundRoomMessageHandler); 
  }

  async unRegister() {
    this.client?.off('deviceMessage', this.boundDeviceMessageHandler);
    this.client?.off('roomMessage', this.boundRoomMessageHandler);

    // Clear all timers
    for (const timer in this.timers) {
      clearTimeout(this.timers[timer]);
    }
  }

  async cleanUpDevices() {
    const prefixCapability = 'espresense_distance_capability.'
    const currentTime = Date.now();

    const capabilities = this.getCapabilities().filter(capability => capability.startsWith(prefixCapability));
    capabilities.forEach(capability => {
      const deviceId = capability.replace(prefixCapability, '');
      const device = this.client?.devices[deviceId];

      if (!device || device.anonymous) {
        this.removeCapability(capability);
        this.log('Capability removed for anonymous or unknown device:', capability);
      } 
      
      //const lastChangeTime = this.getCapabilityOptions(capability)?.lastUpdated;
      //if (currentTime-lastChangeTime > xxx) remove....
    })
  }

  async roomMessageHandler(roomId: string, roomProperty?: string, roomPayload? : string, room? : ESPresenseRoom) {
    const currentRoomId = this.getData().id;
    if (currentRoomId != roomId) {
      return;
    }

    if (room) {
      if (!room.name) {
        // Register correct name if there is none
        this.onRenamed(this.getName());
      }
    }

    if (roomProperty == 'max_distance' && roomPayload) {
      await this.setCapabilityValue('espresense_max_distance_capability', parseFloat(roomPayload));
      //this.log("Room:", roomId, "max_distance:", roomPayload);
    }

    if (roomProperty == 'status' && roomPayload) {
      await this.setCapabilityValue('espresense_status_capability', roomPayload == 'online');
      //this.log("Room:", roomId, "status:", roomPayload);
    }
  }

  async deviceMessageHandler(deviceId: string, deviceRoomId?: string, device?: ESPresenseDevice) {
    const currentRoomId = this.getData().id;
    if (currentRoomId != deviceRoomId) {
      return;
    }

    // Only display registered devices
    if (device && !device.anonymous) {
      //this.log("Device:", deviceId, deviceRoomId, "distance:", device.distance);
      if (!this.hasCapability(`espresense_distance_capability.${deviceId}`)) {
        await this.addCapability(`espresense_distance_capability.${deviceId}`);
      }

      await this.setCapabilityValue(`espresense_distance_capability.${deviceId}`, device.distance);
      await this.setCapabilityOptions(`espresense_distance_capability.${deviceId}`, { title: {"en": `${device.name}` } });

      // Trigger flow cards
      await this.whenDeviceIsCloserThanXMetersCard?.trigger(this, {
        'device-distance': device.distance,
      }, {
        deviceId: device.id,
        distance: device.distance,
      });

      await this.whenDeviceIsFurtherThanXMetersCard?.trigger(this, {
        'device-distance': device.distance,
      }, {
        deviceId: device.id,
        distance: device.distance,
      });

      // Add timer for losing connection
      if (this.timers[device.id]) {
        clearTimeout(this.timers[device.id]);
      }

      this.timers[device.id] = setTimeout(async () => {
        // Remove from object
        delete this.timers[device.id];

        // Run further card
        await this.whenDeviceIsFurtherThanXMetersCard?.trigger(this, {
          'device-distance': device.distance,
        }, {
          deviceId: device.id,
          distance: this.getCapabilityValue('espresense_max_distance_capability'),
        });

        // Run device not responding card
        await this.whenDeviceIsNoLongerDetectedCard?.trigger(this, undefined, {
          deviceId: device.id
        });

        // Device timeout, check devices
        this.cleanUpDevices();
         
      }, this.connectionLostTimeInSeconds * 1000);
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
    this.log('ESPresenseNodeDevice settings where changed');
  }

  async onDeleted() {
    this.log('ESPresenseNodeDevice has been removed');
  }

  async onUninit(): Promise<void> {
    this.log('ESPresenseNodeDevice has been uninit');
    await this.unRegister();
    return super.onUninit();
  }

}

module.exports = ESPresenseNodeDevice;
