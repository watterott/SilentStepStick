/*
  SilentStepStick TMC2208/TMC2209 Example
  Rsense: 0.11 Ohm

  Other examples/libraries can be found here:
  https://github.com/teemuatlut/TMCStepper
  https://github.com/trinamic/TMC-API
  https://github.com/manoukianv/TMC2208Pilot

  Example source code free to use.
  Further information: https://learn.watterott.com/license/
*/

// Note: You also have to connect GND, 5V/VIO and VM.
//       A connection diagram can be found in the schematics.
#define EN_PIN    7 //enable (CFG6)
#define DIR_PIN   8 //direction
#define STEP_PIN  9 //step

void setup()
{
  //set pin modes
  pinMode(EN_PIN, OUTPUT);
  digitalWrite(EN_PIN, HIGH); //deactivate driver (LOW active)
  pinMode(DIR_PIN, OUTPUT);
  digitalWrite(DIR_PIN, LOW); //LOW or HIGH
  pinMode(STEP_PIN, OUTPUT);
  digitalWrite(STEP_PIN, LOW);

  digitalWrite(EN_PIN, LOW); //activate driver
}

void loop()
{
  //make steps
  digitalWrite(STEP_PIN, HIGH);
  delay(2);
  digitalWrite(STEP_PIN, LOW);
  delay(2);
}
