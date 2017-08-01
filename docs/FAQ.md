# Frequently Asked Questions

## Is the SilentStepStick 100% compatible with a StepStick or Pololu A4988?
The SilentStepStick is hardware/pin compatible with StepStick and Pololu A4988 drivers.
However the TMC21x0 has different and more settings, which can be set via the CFG/MS pins and the **DIR pin is inverted** (direction).
The TMC21x0 config pins also know three states: low (GND), high (VIO) and open (unconnected).
The TMC2130 can be configured via CFG pins or [SPI](https://en.wikipedia.org/wiki/Serial_Peripheral_Interface_Bus) and the TMC2208 via CFG pins or [UART](https://en.wikipedia.org/wiki/Universal_asynchronous_receiver/transmitter).


## Which operating mode should I use?
For most cases (except a 3D printer extruder) the **1/16 stealthChop** mode (TMC2100: CFG1=open CFG2=open, default on TMC2208) is suitable.
If you have problems like step losses then you can use a [slower acceleration](https://www.youtube.com/watch?v=c3v9E1AwDBE) or a bit higher current setting in stealthChop 
or you can use the more powerful and louder **1/16 spreadCycle** mode (TMC2100: CFG1=GND CFG2=open).

#### Boards with USB Power Supply
Only applicable for SilentStepSticks with variable 3-5V logic voltage (VIO):
If you use a control board with USB power supply (like Arduino + RAMPS) then always ensure that the motor voltage (VM) is present, when you connect the board via USB.
Otherwise the TMC2xxx is not powered via the internal voltage regulator and a high current can flow into VIO or the IOs and this can damage the internal logic.
As safety workaround you can disconnect the 5V signal in the USB cable, so that the board cannot be powered over USB.

#### RAMPS 1.4 and RUMBA Notes
For most cases the **1/16 stealthChop** mode is suitable and we recommend the TMC2100 SilentStepStick with 5V for RAMPS and RUMBA boards, because they use 5V logic.
If you remove all jumpers (or open all switches) for MS1+MS2+MS3 on the RAMPS/RUMBA, then the SilentStepStick TMC2100 driver will be in **1/16 spreadCycle mode** (CFG1=GND CFG2=open), because there is a pull-down resistor on MS1 on the RAMPS/RUMBA.
The pull-down is 100k and in most cases it will set the driver in spreadCycle mode correctly. However if there are problems then short CFG1 to GND or replace the resistor with one which is 30k or less.
If you have not an original [RAMPS 1.4](http://reprap.org/wiki/RAMPS_1.4) or [RUMBA](http://reprap.org/wiki/RUMBA), then your schematics can be different and you have to check the MS-Pin configurations on you board.


## Can I use a stepper motor with a lower voltage than the driver motor supply voltage?
Yes, because the TMC2xxx drivers use a chopper drive circuit to generate a constant current in each winding (motor phase) rather than applying a constant voltage.


## What is the difference between SilentStepSticks with 3-5V and 5V logic voltage?
The SilentStepSticks with a variable logic voltage (VIO) of 3-5V use the internal linear regulator of the TMC2xxx to generate from the motor voltage (VM) a 5V voltage for the internal digital and analog circuit (about 20mA).
Because it is a linear voltage regulator the power dissipation depends on the motor voltage (high motor voltage = high power dissipation/heat).
The 5V logic SilentStepSticks do not use the internal voltage regulator of TMC2xxx and therefor only a 5V supply voltage for VIO is possible and VM has not to be present before VIO.
Further infos about power-up and down can be found [here](https://github.com/watterott/SilentStepStick/blob/master/docs/FAQ.md#what-to-consider-when-turning-the-power-supply-on-or-off).

Power dissipation of the internal voltage regulator:
* 0.1W @ VM=12V
* 0.3W @ VM=24V
* 0.6W @ VM=36V
* 0.8W @ VM=45V


## Is the TMC2130 SilentStepStick in standalone mode like a TMC2100 SilentStepStick?
The configuration for TMC2130 in standalone mode (SPI jumper closed) is set via the CFG pins like the TMC2100.
On the TMC2100 SilentStepSticks the CFG0 pin is set to GND as default and this sets the chopper off time to 140 Tclk (most universal choice).
In contrast on the TMC2130 SilentStepSticks the CFG0 pin (also SDO) is open as default and this sets the chopper off time to 332 Tclk.
On the TMC2130 SilentStepSticks the CFG3 pin is also connected to the pin header and should be left unconnected/open (external reference voltage on AIN) in standalone mode.


## Where can I find more information on the settings and operation modes?
More information can be found in the [SilentStepStick schematics (PDF files)](https://github.com/watterott/SilentStepStick/tree/master/hardware) and
[TMC2100 datasheet](http://www.trinamic.com/products/integrated-circuits/details/tmc2100/),
[TMC2130 datasheet](http://www.trinamic.com/products/integrated-circuits/details/tmc2130/) or
[TMC2208 datasheet](http://www.trinamic.com/products/integrated-circuits/details/tmc2208-la/).

A configuration tool for the TMC2208 can be found [here](https://github.com/watterott/SilentStepStick/tree/master/docs/ScriptCommunicator#tmc2208-configurator).

Detailed information about the operating modes:
[stealthChop](https://www.trinamic.com/technology/adv-technologies/stealthchop/) and
[spreadCycle](https://www.trinamic.com/technology/adv-technologies/spreadcycle/).

#### Infos and Installation Guides for 3D Printers
* General: [English](http://reprap.org/wiki/TMC2100),
           [German](http://reprap.org/wiki/TMC2100/de),
           [French](http://reso-nance.org/wiki/materiel/silentstepstick/accueil),
           [Russian](http://3deshnik.ru/blogs/akdzg/chto-zhe-delat-belami-tmc2100),
           [Japanese](http://3dp0.com/silentstepstick)
* [Ultimaker UMO + TMC2100 (English)](https://ultimaker.com/en/community/11571-step-by-step-installation-of-silentstepstick-drivers-on-umo)
* [Ultimaker UMO + TMC2130 (English)](https://ultimaker.com/en/community/20090-step-by-step-installation-of-sss-tmc2130-on-umo)
* [TMC2130 (English)](http://hackaday.com/2016/09/30/3d-printering-trinamic-tmc2130-stepper-motor-drivers-shifting-the-gears/)


## How to set the stepper motor current?
The best way to set the motor current is by measuring the voltage on the ```Vref``` pin (0...2.5V) and
adjusting the voltage with the potentiometer.
The maximum motor current is 1.77A RMS and is set via the 0.11Ohm sense resistors.

```Irms = (Vref * 1.77A) / 2.5V = Vref * 0.71```

```Vref = (Irms * 2.5V) / 1.77A = Irms * 1.41 = Imax```

```Vref``` -> Voltage on Vref pin

```Irms``` -> RMS (Root Mean Square) current per phase (Irms = Imax / 1.41)

```Imax``` -> Maximum current per phase (Imax = Irms * 1.41)

**Example:**
A voltage of 1.0V on Vref sets the motor current to 0.71A RMS.

**Note:**
On some stepper motor drivers the maximum current (e.g. A4988) is set via Vref and on others the RMS current (e.g. TMC2100).
The Trinamic drivers have an automatic thermal shutdown (at about 150°C) if the chip gets to hot.


## What to consider when turning the power supply on or off?
**Power on:**

*SilentStepSticks with variable 3-5V logic voltage:*
The motor voltage VM should come up first and then the logic voltage VIO, because the internal logic of the TMC2xxx driver is powered from VM.

*SilentStepSticks with 5V logic voltage:*
There is no special power up sequence needed.

Only after the logic voltage VIO is present and stable, the driver inputs (STEP, DIR, EN, CFG...) can be driven with a high level.

A step pulse (moving) should only be done after the motor voltage VM is present and stable.

Because the motor voltage VM is a strong power supply with a high voltage, also ensure that there cannot occur voltage spikes on power up.
See [Pololu: Understanding Destructive LC Voltage Spikes](https://www.pololu.com/docs/0J16/all).

**Power off:**

*SilentStepSticks with variable 3-5V logic voltage:*
The logic voltage VIO should turned off at first and then the motor voltage VM, because the internal logic of the TMC2xxx driver is powered from VM.

*SilentStepSticks with 5V logic voltage:*
There is no special power off sequence needed.

If the motor is running/moving, then it is not allowed to switch off the power supply. Always make sure that the motor stands still on shutting down, otherwise the TMC2xxx driver can get damaged.

An **emergency stop** can be realized, when the EN/CFG6 pin is set to VIO (high). This will switch off all power drivers and will put the motor into freewheeling.
See also: [SilentStepStick Protector with flyback diodes](https://github.com/watterott/SilentStepStick#shop)


## The motor makes noise in spreadCycle mode when it is not moving?
A motor supply voltage of 12V is in most cases to low and in general the sound gets quieter if the motor supply voltage is above 18V.
As workaround it is possible to activate the TMC21x0 automatic current reduction on standstill. This is done by not connecting the EN pin (EN=open).


## The driver does not work or stopped working. What should I do?
On problems, check the wiring and power supply.
If this is okay, check the resistance of the logic supply VIO against GND, the digital pins EN, DIR, STEP against GND + VIO and the motor pins M1A, M1B, M2A, M2B against GND + VM.
When the resistance of the logic supply or a digital input is very low (<100 Ohm), then in general there is a problem with the power-up or power-down sequence.
Or if the resistance of a motor pin is very low (<100 Ohm) then there could be a problem with the motor wiring (loose connection) or the motor supply was removed during operation/moving.


## How to control the Trinamic stepper motor driver?
The SilentStepStick has a normal step+direction interface.
You set the direction with the DIR pin and on every pulse on the STEP pin the motor will move one step.
Here you can find an [Arduino example](https://github.com/watterott/SilentStepStick/tree/master/software) and [Arduino library](http://www.airspayce.com/mikem/arduino/AccelStepper/) (interface=DRIVER).


## Is it possible to connect the CFG pins from different SilentStepSticks?
It is possible to connect the CFG pins from two or more driver boards.
However then the pin state can only be GND (low) or VIO (high). The open state (unconnected) is not possible in this configuration.


## Why is the Trinamic driver chip on the bottom PCB side?
The TMC2xxx chip has a thermal pad on the bottom which is soldered to the PCB.
So the thermal resistance via the chip bottom is better than via the chip top.
That is why the chip is on the bottom PCB side.
A heat sink can be placed directly on the PCB.
Further infos [here](https://www.youtube.com/watch?time_continue=145&v=mYuZqx8xwTg).
