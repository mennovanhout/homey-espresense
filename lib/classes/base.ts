import { LogLevel, BaseOptions } from '../types/base';

export class Base {
  protected options! : BaseOptions;

  constructor(options : BaseOptions) {
    this.options = options;

    this.logMessage(LogLevel.Debug, "Loglevel: ", options.loglevel);
  }
  
  setInterval(callBackFunction : Function, interval : number) {
    if (this.options.device) {
      return this.options.device.homey.setInterval(callBackFunction, interval);
    } else {
      return setInterval(callBackFunction as () => void, interval);
    }
  }

  clearInterval(timerId: any) {
    if (this.options.device) {
      this.options.device.homey.clearInterval(timerId);
    } else {
      clearInterval(timerId);
    }
  }

  setTimeout(callBackFunction : Function, duration : number) {
    if (this.options.device) {
      return this.options.device.homey.setTimeout(callBackFunction, duration);
    } else {
      return setTimeout(callBackFunction as () => void, duration);
    }
  }  

  sleep(duration : number) {
    return new Promise((resolve) => this.setTimeout(resolve, duration));
  }

  logMessage(logLevel: LogLevel, ...msg: any[]) {
    // Only Log if the loglevel is high enough 
    if (this.options.loglevel >= logLevel) {
      this.#log(...msg);
    }
  }

  #log(...msg: any[]) {
    // Log to device if possible, else output to console
    if (this.options.device) {
         this.options.device.log(...msg);
     } else {
         console.log(...msg);
     }
  }
}
