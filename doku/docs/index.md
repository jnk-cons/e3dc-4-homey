# E3DC 4 Homey

E3DC 4 Homey is an UNOFFICIAL app for the Homey smart home hub to access E3DC home power stations.

E3DC is a brand of HagerEnergy Gmbh ([website](https://www.e3dc.com/)). I have nothing to do with the company, except that I own a home power plant from E3DC and wanted to include it in my SmartHome. This "desire" gave birth to E3DC 4 Homey. 

## How it works
The E3DC house power plants provide a TCP/IP interface for read and write access. This interface and the content is completely proprietary and is called RSCP.
The interface must first be activated on the home power station itself. You can find instructions on how to do this in the [setup](setup/setup.md) area.

All data is read directly from or written to the in-house power plant. There is no communication with the E3DC Cloud.
The access data is only requested by the RSCP interface for authentication.

## Features
- Fully local communication between Homey and the home power station
- Provision of live energy data
- Provision of energy data from the past
- Control of various home power station functions (charging power, emergency power, etc.)
- Query the wallbox information
- Monitoring the battery module

## Help wanted!
The E3DC interface is not documented and I have to find out a lot by trial and error. I also only have one home power station and can therefore only test to a limited extent.
If you encounter a problem, have a different model or are missing a feature: Just let me know in the community thread or open a [ticket](https://github.com/jnk-cons/e3dc-4-homey/issues) here.
I will do my best to help you find a solution.
