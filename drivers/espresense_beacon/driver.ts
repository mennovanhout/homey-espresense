import Homey from 'homey';

class MyDriver extends Homey.Driver {

  async onInit() {
    this.log('MyDriver has been initialized');
  }

  onPairListDevices(): Promise<any[]> {
    const mapping = this.homey.settings.get('mapping');

    return Promise.resolve(Object.values(mapping).map((device) => ({
      name: device,
      data: {
        id: device,
      },
    })));
  }

}

module.exports = MyDriver;
