/*
  SilentStepStick TMC5160 Example
  Rsense: 0.075 Ohm
  
  TMCStepper library required:
  https://github.com/teemuatlut/TMCStepper

  Example source code free to use.
  Further information: https://learn.watterott.com/license/
*/

#include <TMCStepper.h>

// Note: You also have to connect GND, 5V/VIO and VM.
//       A connection diagram can be found in the schematics.
#define EN_PIN    7 //enable
#define DIR_PIN   8 //direction
#define STEP_PIN  9 //step

#define CS_PIN   10 //CS chip select
#define MOSI_PIN 11 //SDI/MOSI (ICSP: 4, Uno: 11, Mega: 51)
#define MISO_PIN 12 //SDO/MISO (ICSP: 1, Uno: 12, Mega: 50)
#define SCK_PIN  13 //CLK/SCK  (ICSP: 3, Uno: 13, Mega: 52)

#define R_SENSE   0.075f //TMC5160: 0.075 Ohm

TMC5160Stepper tmc = TMC5160Stepper(CS_PIN, R_SENSE); //use hardware SPI
//TMC5160Stepper tmc = TMC5160Stepper(CS_PIN, R_SENSE, MOSI_PIN, MISO_PIN, SCK_PIN); //use software SPI

void setup()
{
  //set pins
  pinMode(EN_PIN, OUTPUT);
  digitalWrite(EN_PIN, HIGH); //deactivate driver (LOW active)
  pinMode(DIR_PIN, OUTPUT);
  digitalWrite(DIR_PIN, LOW); //direction: LOW or HIGH
  pinMode(STEP_PIN, OUTPUT);
  digitalWrite(STEP_PIN, LOW);

  pinMode(CS_PIN, OUTPUT);
  digitalWrite(CS_PIN, HIGH);
  pinMode(MOSI_PIN, OUTPUT);
  digitalWrite(MOSI_PIN, LOW);
  pinMode(MISO_PIN, INPUT);
  digitalWrite(MISO_PIN, HIGH);
  pinMode(SCK_PIN, OUTPUT);
  digitalWrite(SCK_PIN, LOW);

  //init serial port
  Serial.begin(9600); //init serial port and set baudrate
  while(!Serial); //wait for serial port to connect (needed for Leonardo only)
  Serial.println("\nStart...");

  //set driver config
  tmc.begin();
  tmc.toff(4); //off time
  tmc.blank_time(24); //blank time
  //tmc.en_pwm_mode(1); //enable extremely quiet stepping
  tmc.microsteps(16); //16 microsteps
  tmc.rms_current(400); //400mA RMS

  //outputs on (LOW active)
  digitalWrite(EN_PIN, LOW);
}

void loop()
{
  static uint32_t last_time=0;
  uint32_t ms = millis();

  if((ms-last_time) > 1000) //run every 1s
  {
    last_time = ms;

    if(tmc.diag0_error()){ Serial.println(F("DIAG0 error"));    }
    if(tmc.ot())         { Serial.println(F("Overtemp."));      }
    if(tmc.otpw())       { Serial.println(F("Overtemp. PW"));   }
    if(tmc.s2ga())       { Serial.println(F("Short to Gnd A")); }
    if(tmc.s2gb())       { Serial.println(F("Short to Gnd B")); }
    if(tmc.ola())        { Serial.println(F("Open Load A"));    }
    if(tmc.olb())        { Serial.println(F("Open Load B"));    }
  }

  //make steps
  digitalWrite(STEP_PIN, HIGH);
  delayMicroseconds(10);
  digitalWrite(STEP_PIN, LOW);
  delayMicroseconds(10);
}
