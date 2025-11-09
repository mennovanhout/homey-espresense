import Homey from 'homey';

export enum LogLevel {
  None = 0,
  Error,
  Debug,
  Info
}

export interface BaseOptions {
  loglevel: LogLevel,
  device: Homey.Device,
}
