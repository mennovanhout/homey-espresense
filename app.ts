import Homey from 'homey';
import { ESPresenseClient } from './lib/classes/espresense'
import { LogLevel } from './lib/types/base'

export class ESPresenseApp extends Homey.App {

  public client?: ESPresenseClient;
  private ESPresenseClientOptions?: any;

  // Event handling
  private boundSetSettingHandler?: (key: string) => void;

  async onInit() {
    this.log('ESPresenceApp has been initialized');

    // Register events handlers
    await this.register();

    this.ESPresenseClientOptions = {
      host: this.homey.settings.get('server'),
      port: this.homey.settings.get('port'),
      username: this.homey.settings.get('username'),
      password: this.homey.settings.get('password'),
      loglevel: LogLevel.Debug,
      device: this
    }

    this.client = new ESPresenseClient(this.ESPresenseClientOptions);
    this.client.connect();
  }

  async updateSettings() {
    if (this.client) {
      this.client.disconnect();

      // Copy settings
      this.ESPresenseClientOptions.host = this.homey.settings.get('server');
      this.ESPresenseClientOptions.port = this.homey.settings.get('port');
      this.ESPresenseClientOptions.username = this.homey.settings.get('username');
      this.ESPresenseClientOptions.password = this.homey.settings.get('password');

      this.client.setOptions(this.ESPresenseClientOptions);

      // Use Legacy mapping for device names
      const mapping = this.homey.settings.get('mapping');
      if (mapping) {
        for (const key in mapping) {
          this.client.registerDevice(key, mapping[key]);
        }
      }

      this.client.connect();
    }
  }

  async register() {
    this.boundSetSettingHandler = this.setSettingHandler.bind(this);
    this.homey.settings.on('set', this.boundSetSettingHandler);
  }

  async unRegister() {
    if (this.boundSetSettingHandler) {
      this.homey.settings.off('set', this.boundSetSettingHandler);
    }
  }

  async setSettingHandler (key: string) {
    if (key == 'saved') {
      if (this.homey.settings.get(key) === true) {
        this.homey.settings.set(key, false);
        this.log('ESPresenceApp settings changed, reconnecting MQTT');
        await this.updateSettings();
      }
    }
  }

  async onUnInit() {
    await this.unRegister();

    this.client?.disconnect();
    this.client?.dispose();
  }
}

module.exports = ESPresenseApp;
