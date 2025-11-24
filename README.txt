Finally, ESPresense is available for Homey!

Exactly know who is in the room and create flows according to this information.

You can create personal flows like:
- When my girlfriend enters the room, turn on white lights
- When I enter the room, turn on full RGB lights

For the ESPresense app to work you need at least:
- ESPresense Nodes (ESP devices with Wifi/BLE and ESPresense firmware installed)
- MQTT Broker (you can use the homey MQTT Broker app)
- Beacons (BLE devices like phones and watches)

We have created support for Nodes and Beacons with corresponding triggers. Add at least one Node and one Beacon device.
If you have a lot of BLE beacons, consider adding filters on your nodes to keep the MQTT traffic in check.
Creating mappings is no longer required, but still supported.

For more information about ESPresense, please go to the espresense.com website.
