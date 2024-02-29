# Home power station
This is the main device and must be set up first.

The device provides some live measurement values. Most of them should be self-explanatory, the more specific ones
explained here:

- Firmware: This is the currently installed software version on your home power station. If E3DC carries out an update here, you can be informed via an IF card
- Remaining (discharge) charging time: Indication in hours and minutes of how long it will take for the battery to be fully charged or discharged under current conditions.
- Power: Current power consumption of all connected wallboxes. Only visible if at least one wallbox is connected
- Solar share: Share of solar energy delivered to all wallboxes. Only visible if at least one wallbox is connected

## Incorrect Battery storage size
Unfortunately, some home power plants provide incorrect battery storage size data. As long as E3DC does not fix this, the affected
users will unfortunately have to live with it. Please check in the settings of the Homey device whether the correct storage size is displayed. If not, you can
you can set the value yourself. Sorry for the inconvenience, E3DC has to deliver a patch.
