# TMC2208 Configurator

With the TMC2208 Configurator you can change the settings and program the OTP memory of a Trinamic TMC2208 via the UART interface.

To run the program:
* Install [ScriptCommunicator](https://sourceforge.net/projects/scriptcommunicator/)
* Download [TMC2208.scez](https://github.com/watterott/SilentStepStick/raw/master/docs/ScriptCommunicator/TMC2208.scez)
* Start the *TMC2208.scez* file with the ScriptCommunicator: ```ScriptCommunicator TMC2208.scez```
* Choose the right serial port and click *Connect*
* Modifications in the Configurator are directly transmitted


#### Hardware Connection

![Hardware Connection](https://github.com/watterott/SilentStepStick/raw/master/docs/ScriptCommunicator/hw_connection.png)

You can use every RS232 serial adapter with 0-5V logic levels (e.g. FTDI-Breakout).
A connection adapter can be found here: [SilentStepStick Tester/Programmer](https://github.com/watterott/SilentStepStick#shop).

Note: The jumper J2 next to the PDN_UART pin has to be closed on the TMC2208 SilentStepStick.

#### Screenshot

![Screenshot](https://github.com/watterott/SilentStepStick/raw/master/docs/ScriptCommunicator/screenshot.png)
