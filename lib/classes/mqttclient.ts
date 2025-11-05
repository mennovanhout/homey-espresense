import MQTT, { IPublishPacket } from 'mqtt';
import { Base } from './base';
import { BaseOptions, LogLevel } from '../types/base';
import { MQTTOptions } from '../types/mqttclient';

export class MQTTClient extends Base {

  public client?: MQTT.MqttClient;
  
  // Override inherited options type
  protected options! : MQTTOptions & BaseOptions;
  
  constructor(options : MQTTOptions & BaseOptions) {
    super(options as BaseOptions);
    this.logMessage(LogLevel.Debug, "MqttClient constructed");
  }

  protected connect() {
    this.logMessage(LogLevel.Debug, "MqttClient connecting");

    this.client = MQTT.connect({
      host:this.options.host,
      protocol: 'mqtt',
      username: this.options.username,
      password: this.options.password,
      port: this.options.port
    });

    this.client?.on('connect', () => {
      this.logMessage(LogLevel.Debug, "MqttClient connected");

      // Bind callback handler
      this.client?.on('message', this.messageHandler.bind(this));
    });
  }

  public connected() : boolean {
    return this.client ? this.client.connected : false;
  }
  
  protected disconnect() {
    this.client?.off('message', this.messageHandler);
    this.client = undefined;
  }

  protected messageHandler (topic: string, payload: Buffer, packet: IPublishPacket) {
    // virtual abstract, implement in child classes
  }
 
  dispose() {
    this.disconnect();
    this.logMessage(LogLevel.Debug, "MqttClient disposed");
  }

}