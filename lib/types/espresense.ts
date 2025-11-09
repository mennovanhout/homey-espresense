
export interface ESPresenseRoom {
  id: string,
  name: string;
  anonymous: boolean;
}

export interface ESPresenseDevice {
  id: string,
  name: string,
  anonymous: boolean;
  idType: number,
  distance: number,
  mac: string,
  'rssi@1m': number,
  rssi: number,
  raw: number,
  var: number,
  int: number
}

export type DeviceMessageFunction = (deviceId: string, deviceRoomId: string, device?: ESPresenseDevice) => void;
export type RoomMessageFunction = (roomId: string, roomProperty?: string, roomPayload? : string, room?: ESPresenseRoom) => void;

export type ESPresenseClientEvents = {
  deviceMessage: DeviceMessageFunction;
  roomMessage: RoomMessageFunction;
};
