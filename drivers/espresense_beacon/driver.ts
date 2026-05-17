import Homey, { FlowCard, FlowCardTriggerDevice } from 'homey';

import { ESPresenseClient } from '../../lib/classes/espresense'
import { ESPresenseApp } from '../../app';

class ESPresenseBeaconDriver extends Homey.Driver {
  private client?: ESPresenseClient = (this.homey.app as ESPresenseApp).client;

  private whenDeviceIsNoLongerDetectedWithinXMinutesCard: FlowCardTriggerDevice|undefined;
  private whenDeviceIsDetectedAfterXMinutesCard: FlowCardTriggerDevice|undefined;
  private whenRoomChangesCard: FlowCardTriggerDevice|undefined;
  private beaconIsInRoomCard: FlowCard|undefined;

  private getRoomIdFromArgument(roomArgument: any): string|undefined {
    if (!roomArgument) {
      return undefined;
    }

    if (typeof roomArgument === 'string') {
      return roomArgument;
    }

    return roomArgument.id;
  }

  private getRoomSuggestions(): FlowCard.ArgumentAutocompleteResults {
    const suggestionsById: { [key: string]: { id: string; name: string; description?: string } } = {};

    try {
      const nodeDriver = this.homey.drivers.getDriver('espresense');
      nodeDriver.getDevices().forEach((device: Homey.Device) => {
        const roomId = device.getData().id;
        if (roomId) {
          suggestionsById[roomId] = {
            id: roomId,
            name: device.getName(),
            description: roomId,
          };
        }
      });
    } catch (error) {
      this.log('Could not read paired ESPresense nodes for room autocomplete', error);
    }

    if (this.client) {
      Object.values(this.client.rooms).forEach((room) => {
        if (room.id && !suggestionsById[room.id]) {
          suggestionsById[room.id] = {
            id: room.id,
            name: room.name || room.id,
            description: room.id,
          };
        }
      });
    }

    return Object.values(suggestionsById).sort((first, second) => first.name.localeCompare(second.name));
  }

  async roomAutocompleteListener(query: string, args: any): Promise<FlowCard.ArgumentAutocompleteResults> {
    const normalizedQuery = (query || '').toLowerCase();
    const suggestions = this.getRoomSuggestions();

    if (!normalizedQuery) {
      return suggestions;
    }

    return suggestions.filter((item) => item.name.toLowerCase().includes(normalizedQuery) || item.id.toLowerCase().includes(normalizedQuery));
  }
  
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

    this.whenRoomChangesCard = this.homey.flow.getDeviceTriggerCard('beacon-when-room-changes');
    this.whenRoomChangesCard.registerRunListener(async (args: any, state: any) => {
      return true;
    });

    this.beaconIsInRoomCard = this.homey.flow.getConditionCard('beacon-is-in-room');
    this.beaconIsInRoomCard.registerArgumentAutocompleteListener('roomId', this.roomAutocompleteListener.bind(this));
    this.beaconIsInRoomCard.registerRunListener(async (args: any, state: any) => {
      const roomId = this.getRoomIdFromArgument(args.roomId);
      const beaconDevice = args.device as Homey.Device|undefined;

      if (!roomId || !beaconDevice) {
        return false;
      }

      return await beaconDevice.getCapabilityValue('espresense_beacon_room') === roomId;
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
