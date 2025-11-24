import { EventEmitter } from 'events';
import { IPublishPacket } from 'mqtt';
import { LogLevel, BaseOptions } from '../types/base';
import { MQTTOptions } from '../types/mqttclient';
import { MQTTClient } from './mqttclient';
import { ESPresenseRoom, ESPresenseDevice, ESPresenseClientEvents } from '../types/espresense';

export class ESPresenseClient extends MQTTClient { 
  private eventEmitter: EventEmitter;
  
  public readonly rooms: { [key: string]: ESPresenseRoom } = {};
  public readonly devices: { [key: string]: ESPresenseDevice } = {};

  constructor(options : MQTTOptions & BaseOptions) {
    super(options as MQTTOptions & BaseOptions);

    this.eventEmitter = new EventEmitter();

    this.logMessage(LogLevel.Debug, "ESPresenseMQTTClient constructed");
  }

  // Implement the event binder
  public on<K extends keyof ESPresenseClientEvents>(event: K, listener: ESPresenseClientEvents[K]): this {
    this.eventEmitter.on(event, listener as (...args: any[]) => void);
    return this; // Important for chaining: client.on(...).on(...)
  }

  // Implement the remove binding
  public off<K extends keyof ESPresenseClientEvents>(event: K, listener?: ESPresenseClientEvents[K]): this {
    if (listener) {
      this.eventEmitter.removeListener(event, listener as (...args: any[]) => void);
    }
    return this;
  }

  // Implement the event emitter
  protected emit<K extends keyof ESPresenseClientEvents>(event: K, ...args: Parameters<ESPresenseClientEvents[K]>): boolean {
    return this.eventEmitter.emit(event, ...args);
  }

  public connect() {
    super.connect();

    // Subscribe to the rooms and devices topic
    this.client?.subscribe('espresense/rooms/#');
    this.client?.subscribe('espresense/devices/#');
  }

  public forceUpdate() {
    this.client?.unsubscribe('espresense/rooms/#');
    this.client?.unsubscribe('espresense/devices/#');

    this.client?.subscribe('espresense/rooms/#');
    this.client?.subscribe('espresense/devices/#');
  }

  public registerRoom(id: string, name: string) {
    const room = this.rooms[id];
    if (room) {
      room.name = name;
      room.anonymous = false;
      this.logMessage(LogLevel.Debug, `Room ${id} renamed to ${room.name}`);
    }
  }

  public registerDevice(id: string, name: string) {
    const device = this.devices[id];
    if (device) {
      device.name = name;
      device.anonymous = false;
      this.logMessage(LogLevel.Debug, `Device ${id} renamed to ${device.name}`);
    } else {
      // Add if not existed, this is for the legacy mapped devices
      let newDevice : ESPresenseDevice;
      newDevice = {
        id: id, 
        name: name, 
        anonymous: false
      };
      this.devices[id] = newDevice;
      this.logMessage(LogLevel.Debug, `Added mapped device ${id}, ${name}`);
    }
  }

  protected messageHandler (topic: string, payload: Buffer, packet: IPublishPacket) {
    if (topic.startsWith('espresense/rooms/')) {
      this.roomHandler(topic, payload, packet);
      return;
    }
  
    if (topic.startsWith('espresense/devices/')) {
      this.deviceHandler(topic, payload, packet);
      return;
    }
  }

  protected roomHandler (topic: string, payload: Buffer, packet: IPublishPacket) {
    const topicParts = topic.replace('espresense/rooms/', '').split('/');

    const roomId = topicParts[0];
    const roomProperty = topicParts.length > 1 ? topicParts[1] : undefined;

    let room : ESPresenseRoom;
    room = this.rooms[roomId];
    if (!room) {
      room = {
        id: roomId, 
        name: '', // Empty name, as we don't know the name yet
        anonymous: true
      };
      this.rooms[roomId] = room;
      this.logMessage(LogLevel.Debug, `Added room ${roomId}`);
    }
  
    this.emit('roomMessage', roomId, roomProperty, payload.toString('utf8'), room);

    return;
  }
  
  protected deviceHandler (topic: string, payload: Buffer, packet: IPublishPacket) {
    const topicParts = topic.replace('espresense/devices/', '').split('/');

    const deviceId = topicParts[0];
    const deviceRoom = topicParts[1];
    const deviceObj : ESPresenseDevice = JSON.parse(payload.toString('utf8'));

    const device = this.devices[deviceId];
    if (!device) {
      // Add new devices from the MQTT as anonymous
      deviceObj.anonymous = true;
      this.devices[deviceId] = deviceObj;
      this.logMessage(LogLevel.Debug, `Added device ${deviceId}`);
    } else {
      // Copy additional properties
      deviceObj.name = device.name;
      deviceObj.anonymous = device.anonymous;
    }

    this.emit('deviceMessage', deviceId, deviceRoom, deviceObj);

    return;
  }

  public setOptions (newOptions : MQTTOptions & BaseOptions) 
  {
    this.options = newOptions;
  }

  public disconnect() {
    this.client?.unsubscribe(`espresense/rooms/#`);
    this.client?.unsubscribe('espresense/devices/#');

    super.disconnect();
  }

  dispose() {
    this.disconnect();
    super.dispose();
    this.logMessage(LogLevel.Debug, "ESPresenseMQTTClient disposed");
  }
}