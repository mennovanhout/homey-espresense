import Homey, { FlowCardTriggerDevice } from 'homey';

import { ESPresenseClient } from '../../lib/classes/espresense'
import { ESPresenseDevice, DeviceMessageFunction, RoomMessageFunction } from '../../lib/types/espresense';
import { ESPresenseApp } from '../../app';

class ESPresenseBeaconDevice extends Homey.Device {
  private client?: ESPresenseClient = (this.homey.app as ESPresenseApp).client;

  private deviceId! : string;
  private lastseenTimestamp: number = 0;

  private whenDeviceIsNoLongerDetectedCard: FlowCardTriggerDevice|undefined;
  private whenDeviceIsDetectedAfterXMinutesCard: FlowCardTriggerDevice|undefined;
  
  private timers: {[key: string]: ReturnType<typeof setTimeout>} = {};
  private connectionLostTimeInSeconds = 30;

  private boundDeviceMessageHandler? : DeviceMessageFunction;
  private boundRoomMessageHandler? : RoomMessageFunction;

  async onInit() {
    this.log('ESPresenseBeaconDevice been initialized');

    if (!this.hasCapability('espresense_beacon_room')) {
      await this.addCapability('espresense_beacon_room');
    }
    if (!this.hasCapability('espresense_distance_capability')) {
      await this.addCapability('espresense_distance_capability');
    }

    // Store device id for easy access
    this.deviceId = this.getData().id;

    // Flows
    this.whenDeviceIsNoLongerDetectedCard = this.homey.flow.getDeviceTriggerCard('beacon-when-device-is-no-longer-detected');
    this.whenDeviceIsDetectedAfterXMinutesCard = this.homey.flow.getDeviceTriggerCard('beacon-when-device-is-detected-after-x-minutes');
    
    await this.register();
  }

  async onAdded() {
    this.log('ESPresenseBeaconDevice has been added');
    this.client?.forceUpdate();
  }

  async onRenamed(name: string) {
    let deviceName;

    // Use Legacy mapping for overruling device names
    const mapping = this.homey.settings.get('mapping');
    if (mapping) {
      deviceName = mapping[this.deviceId];
    }
    
    if (!deviceName) {
      deviceName = name;
    }

    this.client?.updateDeviceName(this.deviceId, deviceName);
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

  async roomMessageHandler(roomId: string, roomProperty?: string, roomPayload? : string) {
    return; 
  }

  async deviceMessageHandler(deviceId: string, deviceRoomId?: string, device?: ESPresenseDevice) {
    if (this.deviceId != deviceId) {
      return;
    }

    if (device) {
      if (!device.name) {
        // Register correct name if there is none
        this.onRenamed(this.getName());
      }

      const currentRoomId = await this.getCapabilityValue('espresense_beacon_room');
      const currentDistance = await this.getCapabilityValue('espresense_distance_capability');

      if (currentRoomId == deviceRoomId) {
        // Same room, update distance
        await this.setCapabilityValue('espresense_distance_capability', device.distance);
        //this.log("Beacon, update distance:", deviceId, deviceRoomId, "distance:", device.distance);
      } else if (device.distance < currentDistance) {
        // Nearest Room
        await this.setCapabilityValue('espresense_beacon_room', deviceRoomId);  

        //await this.setCapabilityOptions('espresense_beacon_room', { title: {"en": `${device.name}` } });

        await this.setCapabilityValue('espresense_distance_capability', device.distance);
        //this.log("Beacon, update room:", deviceId, deviceRoomId, "distance:", device.distance);
      }

      // Reactivated device
      const currentTimestamp = Date.now();
      if (this.lastseenTimestamp) {
        const deltaLastseenTimestamp = currentTimestamp - this.lastseenTimestamp;
        if (deltaLastseenTimestamp > 60*1000) { // minimum of 1 minute
           // Run device active again card
           await this.whenDeviceIsDetectedAfterXMinutesCard?.trigger(this, undefined, {
             deviceId: device.id,
             lastseenTimestamp: this.lastseenTimestamp,
             duration: deltaLastseenTimestamp
           });
        }
      }
      this.lastseenTimestamp = currentTimestamp

      // Add timer for losing connection
      if (this.timers[device.id]) {
        clearTimeout(this.timers[device.id]);
      }

      this.timers[device.id] = setTimeout(async () => {
        // Remove from object
        delete this.timers[device.id];

        // Run device not responding card
        await this.whenDeviceIsNoLongerDetectedCard?.trigger(this, undefined, {
          deviceId: device.id
        });
         
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
    this.log('ESPresenseBeaconDevice settings where changed');
  }

  async onDeleted() {
    this.log('ESPresenseBeaconDevice has been removed');
  }

  async onUninit(): Promise<void> {
    this.log('ESPresenseBeaconDevice has been uninit');
    await this.unRegister();
    return super.onUninit();
  }
}

module.exports = ESPresenseBeaconDevice;
