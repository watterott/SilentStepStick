// ****************** Start COM-Port ********************************

var serialPort = scriptThread.createSerialPort();
var baudrate = 115200; //115200 57600 9600
var anticollisionTime = 3*80*1000/baudrate;
var receivedData = Array();
var packetsSend = 0, packetsReceived = 0;

var settings = scriptThread.getMainInterfaceSerialPortSettings();
UI_COMPORT_comboBox.addItem(settings.name);

for(var i=1; i<50; i++)
{
	UI_COMPORT_comboBox.addItem("COM"+i);
}

function connectButtonClicked()
{
	if(UI_Connect_pushButton.text() == "Connect")
	{
		var x = UI_COMPORT_comboBox.currentText();
		
		serialPort.setPortName(UI_COMPORT_comboBox.currentText());
		if (serialPort.open())
		{
			serialPort.setBaudRate(baudrate);
			serialPort.setDataBits(8);
			serialPort.setParity("None");
			serialPort.setStopBits("1");
			serialPort.setFlowControl("None");
			serialPort.setDTR(true);
			serialPort.setRTS(true);
			
			UI_Connect_pushButton.setText("Disconnect");
			
			packetsSend = 0;
			packetsReceived = 0
			if(initAfterConnection())
			{
				UI_tabWidget.setEnabled(true);
				return;	 // connection successful
			}
		}
		else
		{
			scriptThread.messageBox("Critical", 'Error', 'Could not open serial port.');
		}
	}
	
	// disconnect or error on connection
	UI_DRV_STATUS_polling_checkBox.setChecked(false);
	DRV_STATUS_Timer.stop();
	TSTEP_Timer.stop();
	serialPort.close();
	UI_Connect_pushButton.setText("Connect");
	UI_tabWidget.setEnabled(false);
}

function showSendReceivedPackets()
{
	UI_RW_label.setText("Requests send: "+packetsSend+"   received: "+packetsReceived);
}

function waitReceived()
{
	var timeout = 400;
	
	while(packetsSend != packetsReceived)
	{
		scriptThread.sleepFromScript(10);
		timeout--;
		if(timeout <= 0)
		{
			scriptThread.messageBox("Critical", "Error", "Sending failed. Check if ScriptCommunicator is connected.");
			return false;
		}
	}
	
	return true;
}

// ****************** End COM-Port ********************************


function dialogFinished(e) //The dialog is closed.
{
	if(UI_Connect_pushButton.text() == "Disconnect")
	{
		DRV_STATUS_Timer.stop();
		TSTEP_Timer.stop();
		serialPort.close();
	}
	scriptThread.stopScript()
}

function calcCRC(datagram, datagramLength)
{
	var crc = 0;
	for (var i = 0; i < datagramLength; i++)
	{
		var currentByte = datagram[i];
		for (var j = 0; j < 8; j++) 
		{
			if ((crc >> 7) ^ (currentByte & 0x01))
			{
				crc = (crc << 1) ^ 0x07;
			}
			else
			{
				crc = (crc << 1);
			}
			crc &= 0xff;
			currentByte = currentByte >> 1;
		} 
	}
	return crc; //& 0xff;
}

function getSubBits(value32, start, len)
{	
	var mask = 0;
	
	for(var i=0; i<len; i++)
	{
		mask <<= 1;
		mask |= 0x01;
	}
	
	return (value32 >> start) & mask;
}

function decimalToHex(d, padding) 
{
    var hex = (Number(d) >>> 0).toString(16);  // >>> 0 makes an unsigned integer
    padding = typeof (padding) === "undefined" || padding === null ? padding = 2 : padding;

    while (hex.length < padding) {
        hex = "0" + hex;
    }
	
    return "0x" + hex;
}

function showRegister(register)
{
	var value32 = register.value;
	
	var oldText = register.treeItem.text(1);
	var newText =  decimalToHex(value32, 8);
	register.treeItem.setText(1, newText);
	if(oldText == newText)
		register.treeItem.setForegroundColor(1, "black");
	else
		register.treeItem.setForegroundColor(1, "red");
	
	for(var n=0; n<register.bitName.length; n++)
	{
		var value = getSubBits(value32, register.bitName[n].bit, register.bitName[n].len);
		register.bitName[n].value = value;

		var oldText = register.bitName[n].treeItem.text(1);
		var digits = 1 + ((register.bitName[n].len - 1) >> 2); // number of hex digits to display
		var newText =  "   " + decimalToHex(value, digits);
		register.bitName[n].treeItem.setText(1, newText);
		if(oldText == newText)
			register.bitName[n].treeItem.setForegroundColor(1, "black");
		else
			register.bitName[n].treeItem.setForegroundColor(1, "red");
		
		// optional callbacks to other check- or spin boxes
		if(register.bitName[n].checkBoxColor)
		{
			if(value)
				register.bitName[n].checkBoxColor.setBackgroundColor("red");
			else
				register.bitName[n].checkBoxColor.setBackgroundColor("white");
		}

		if(register.bitName[n].checkBox)
		{
			register.bitName[n].checkBox.blockSignals(true);  // block clickedSignal signal to avoid recursion
			register.bitName[n].checkBox.setChecked(value);
			register.bitName[n].checkBox.blockSignals(false); // unblock clickedSignal signal
		}
					
		if(register.bitName[n].spinBox)
		{
			register.bitName[n].spinBox.blockSignals(true);  // block valueChangedSignal signal to avoid recursion
			register.bitName[n].spinBox.setValue(value);
			register.bitName[n].spinBox.blockSignals(false); // unblock valueChangedSignal signal
		}
		
		if(register.bitName[n].callback)
			register.bitName[n].callback(value);		
	}
}

function updateTreeWidget(datagram)
{
	var regAddr = datagram[2];
	var value32 = (datagram[3]<<24) | (datagram[4]<<16) | (datagram[5]<<8) | datagram[6];
	
	for(var i=0; i<AllRegisters.length; i++)
	{
		if(AllRegisters[i].addr == regAddr)
		{
			AllRegisters[i].value = value32;
			showRegister(AllRegisters[i]);
			break;
		}
	}
}

function dataReceivedSlot()
{
	var data = serialPort.readAll();	
	for(var i = 0; i < data.length; i++)
	{
		receivedData.push(data[i]);
	}

	while(receivedData.length >= 4)
	{
		if((receivedData[0] & 0x0f) == 0x05)
		{
			if(receivedData[1] == 0) // echo datagram
			{
				if(receivedData[2] & 0x80) // write request
				{
					if(receivedData.length >= 8) 
					{
						for(var i = 0; i < 8; i++)  // remove echo datagram
							receivedData.shift();
						packetsReceived++;
						showSendReceivedPackets();
					}
					else
						return;  // skip decoding, not enougth data received
				}
				else // read request
				{
					for(var i = 0; i < 4; i++)  // remove echo datagram
						receivedData.shift();
				}
			}
			else // answer from TMC2208 to decode
			{
				if(receivedData.length >= 8) 
				{
					var datagram = receivedData.slice(0, 8);
					for(var i = 0; i < 8; i++)
						receivedData.shift();
					
					// check reply
					if(datagram[1] == 0xff && datagram[7] == calcCRC(datagram, 7))
					{
						updateTreeWidget(datagram);
						packetsReceived++;
						showSendReceivedPackets();
					}
					else
						scriptThread.messageBox("Critical", "Error", "Wrong CRC received.");
				}
				else
					return;  // skip decoding, not enougth data received			
			}
		}
		else
		{
			// somthing wrong received, remove 1 byte
			receivedData.shift();
		}
	}
}

function readRegister(addr)
{
	var datagram = [0x05, 0x00, addr, 0x00];
	
	datagram[3] = calcCRC(datagram, 3);		

	var bytesSend = serialPort.write(datagram);
	scriptThread.sleepFromScript(anticollisionTime);	
	
	if(bytesSend != datagram.length) 
	{
		scriptThread.messageBox("Critical", "Error", "Sending failed. Check if ScriptCommunicator is connected.");
		return false;
	}
	packetsSend++;
	showSendReceivedPackets();
	return true;
}

function writeRegister(addr, value32)
{
	var datagram = [0x05, 0x00, (0x80 | addr), 0x00, 0x00, 0x00, 0x00, 0x00];
	
	datagram[3] = (value32 >>> 24) & 0xff;
	datagram[4] = (value32 >>> 16) & 0xff;
	datagram[5] = (value32 >>> 8) & 0xff;
	datagram[6] = (value32 >>> 0) & 0xff;	
	datagram[7] = calcCRC(datagram, 7);	
	
	var bytesSend = serialPort.write(datagram);
	scriptThread.sleepFromScript(anticollisionTime);	
	
	if(bytesSend != datagram.length) 
	{
		scriptThread.messageBox("Critical", "Error", "Sending failed. Check if ScriptCommunicator is connected.");
		return false;
	}
	packetsSend++;
	showSendReceivedPackets();	
	return true;
}


function readAllRegisters()
{
	for(var i = 0; i < AllRegisters.length; i++)
	{
		if(AllRegisters[i].rw_info != "Write only")
			if(!readRegister(AllRegisters[i].addr)) 
				break;
	}
}

function updateRegister(addr, bit, len, value)
{
	for(var i=0; i<AllRegisters.length; i++)
	{
		if(AllRegisters[i].addr == addr)
		{
			var newValue = AllRegisters[i].value;
	
			var mask = (1 << bit);
			for(var b = 0; b < len; b++)
			{
				newValue &= ~mask;  // clear the bit
				if(value & (1 << b))
					newValue |= mask;  // set the bit
				mask <<= 1;
			}

			AllRegisters[i].value = newValue;
			showRegister(AllRegisters[i]);
			writeRegister(addr, newValue);
			break;
		}
	}
}

function treeWidgetItemClicked(item, column)
{
	if(column == 1)
	{
		var i = item.text(column).trim();
		var addr = item.data(1, 0);
		var bit  = item.data(1, 1);
		var len  = item.data(1, 2);
		
		if(i != "")
		{
			var digits = 1 + ((len - 1) >> 2); // number of hex digits to display
			var range;
			if (len<32)
				range = decimalToHex((1<<len)-1, digits);
			else
				range = "0xffffffff";
		
			var input = scriptThread.showTextInputDialog("Change Register", "Value range: 0x0..." +  range  + "", i);
			if(input != "")
			{
				var value = parseInt(input);
				if(value != Number.NaN)
				{
					updateRegister(addr, bit, len, value);
				}
			}
		}
	}	
}

function getRegisterByName(regName)
{
	regName = regName.toUpperCase();
	
	for(var i=0; i<AllRegisters.length; i++)
	{
		if(AllRegisters[i].name.toUpperCase() == regName)
		{
			return getSubBits(AllRegisters[i].value, 0, 32);
		}
		else
		{	
			for(var n=0; n<AllRegisters[i].bitName.length; n++)
			{
				if(AllRegisters[i].bitName[n].name.toUpperCase() == regName)
				{
					return getSubBits(AllRegisters[i].bitName[n].value, AllRegisters[i].bitName[n].bit, AllRegisters[i].bitName[n].len);
				}
			}
		}
	}
}

function setRegisterByName(regName, value)
{
	regName = regName.toUpperCase();
	
	for(var i=0; i<AllRegisters.length; i++)
	{
		if(AllRegisters[i].name.toUpperCase() == regName)
		{
			updateRegister(AllRegisters[i].addr, 0, 32, value);
			return true;
		}
		else
		{
			for(var n=0; n<AllRegisters[i].bitName.length; n++)
			{
				if(AllRegisters[i].bitName[n].name.toUpperCase() == regName)
				{
					updateRegister(AllRegisters[i].addr, AllRegisters[i].bitName[n].bit, AllRegisters[i].bitName[n].len, value);					
					return true;
				}
			}
		}
	}
	return false;
}

function initTreeWidget(Registers, treeWidget)
{
	for(var i=0; i<Registers.length; i++)
	{
		var treeItem1 = treeWidget.createScriptTreeWidgetItem();
		Registers[i].treeItem = treeItem1;
		treeItem1.setText(0, Registers[i].name.toUpperCase() + " (" + decimalToHex(Registers[i].addr, 2) + ")");
		treeItem1.setText(1, "");
		treeItem1.setText(2, Registers[i].rw_info);
		treeItem1.setData(1, 0, Registers[i].addr.toString());
		treeItem1.setData(1, 1, 0);  // bit
		treeItem1.setData(1, 2, 32); // len
		
		for(var n=0; n<Registers[i].bitName.length; n++)
		{
			var treeItem2 = treeWidget.createScriptTreeWidgetItem();
			treeItem2.setText(0, Registers[i].bitName[n].name.toUpperCase());
			treeItem2.setData(1, 0, Registers[i].addr.toString());
			treeItem2.setData(1, 1, Registers[i].bitName[n].bit.toString());  // bit
			treeItem2.setData(1, 2, Registers[i].bitName[n].len.toString()); // len
			Registers[i].bitName[n].treeItem = treeItem2;
			treeItem1.addChild(treeItem2);
		}
				
		treeWidget.addTopLevelItem(treeItem1);
		//treeWidget.expandItem(treeItem1);
	}
	//UI_treeWidget.setColumnWidth(0, 200);	
	treeWidget.itemClickedSignal.connect(treeWidgetItemClicked);
}

var OptRead = {
	otp_en_spreadCycle: 0,
	IHOLD: 0,
	IHOLDDELAY: 0,
	TPWMTHRS: 0,
};

// calculates the reset values from OTP_READ register
function OTP_READ_Decoder()
{
	OptRead.otp_en_spreadCycle = getRegisterByName("OTP_EN_SPREADCYCLE");
	
	var IHOLD_const = [16, 2, 8, 24];
	OptRead.IHOLD = IHOLD_const[getRegisterByName("OTP_IHOLD")];
	OptRead.IHOLDDELAY = 1 << getRegisterByName("OPT_IHOLDDELAY");
	if(OptRead.otp_en_spreadCycle == 0)
	{
		var TPWMTHRS_const = [0, 200, 300, 400, 500, 800, 1200, 4000];
		OptRead.TPWMTHRS = TPWMTHRS_const[getRegisterByName("OTP_TPWMTHRS")];
	}
}


var AllRegisters = 	[
	//********************* GeneralRegisters ******************
	{ 
		name : "GCONF",
		addr: 0x00,
		bitName: [
			{ name: "I_SCALE_ANALOG", bit: 0, len: 1},
			{ name: "INTERNAL_RSENSE", bit: 1, len: 1},
			{ name: "EN_SPREADCYCLE", bit: 2, len: 1, checkBox: UI_EN_SPREADCYCLE_checkBox},
			{ name: "SHAFT", bit: 3, len: 1},
			{ name: "INDEX_OTPW", bit: 4, len: 1},
			{ name: "INDEX_STEP", bit: 5, len: 1},
			{ name: "PDN_DISABLE", bit: 6, len: 1},
			{ name: "MSTEP_REG_SELECT", bit: 7, len: 1},
			{ name: "MULTISTEP_FILT", bit: 8, len: 1},
			{ name: "TEST_MODE", bit: 9, len: 1},
		],
		rw_info: "R/W"
	},
	{ 
		name : "GSTAT",
		addr: 0x01,
		bitName: [
			{ name: "RESET", bit: 0, len: 1},
			{ name: "DRV_ERR", bit: 1, len: 1, checkBoxColor: UI_checkBox_15},
			{ name: "UV_CP", bit: 2, len: 1,   checkBoxColor: UI_checkBox_16},
		],
		rw_info: "R/W Clear"
	},
	{ 
		name : "IFCNT",
		addr: 0x02,
		bitName: [
			{ name: "IFCNT", bit: 0, len: 8},
		],
		rw_info: "Read only"
	},
	{ 
		name : "SLAVECONF",
		addr: 0x03,
		bitName: [
			{ name: "SENDDELAY", bit: 8, len: 4},
		],
		rw_info: "Write only"
	},	
	{ 
		name : "OTP_PROG",
		addr: 0x04,
		bitName: [
			{ name: "OTPBIT", bit: 0, len: 3},
			{ name: "OTPBYTE", bit: 4, len: 2},
			{ name: "OTPMAGIC", bit: 8, len: 8},
		],
		rw_info: "Write only"
	},	
	{ 
		name : "OTP_READ",
		addr: 0x05,
		bitName: [
			{ name: "OTP_EN_SPREADCYCLE", bit: 23, len: 1},
			{ name: "OTP_IHOLD", bit: 21, len: 2},
			{ name: "OTP_IHOLDDELAY", bit: 19, len: 2},
			{ name: "OTP_PWM_FREQ", bit: 18, len: 1},
			{ name: "OTP_PWM_REG", bit: 17, len: 1},
			{ name: "OTP_PWM_OFS", bit: 16, len: 1},
			{ name: "OTP_TPWMTHRS", bit: 13, len: 3},
			{ name: "OTP_PWM_AUTOGRAD", bit: 12, len: 1},
			{ name: "OTP_PWM_GRAD", bit: 8, len: 4},
			{ name: "OTP_TBL", bit: 7, len: 1},
			{ name: "OTP_INTERNALRSENSE", bit: 6, len: 1},
			{ name: "OTP_OTTRIM", bit: 5, len: 1},
			{ name: "OTP_FCLKTRIM", bit: 0, len: 5},
		],
		rw_info: "Read only"
	},
	{ 
		name : "IOIN",
		addr: 0x06,
		bitName: [
			{ name: "ENN", bit: 0, len: 1},
//			{ name: "-", bit: 1, len: 1},
			{ name: "MS1", bit: 2, len: 1},
			{ name: "MS2", bit: 3, len: 1},
			{ name: "DIAG", bit: 4, len: 1},
//			{ name: "-", bit: 5, len: 1},
			{ name: "PDN_UART", bit: 6, len: 1},
			{ name: "STEP", bit: 7, len: 1},
			{ name: "SEL_A", bit: 8, len: 1},
			{ name: "DIR", bit: 9, len: 1},
			{ name: "VERSION", bit: 24, len: 8},
		],
		rw_info: "Read only"
	},	
	{ 
		name : "FACTORY_CONF",
		addr: 0x07,
		bitName: [
			{ name: "FCLKTRIM", bit: 0, len: 5},
			{ name: "OTTRIM", bit: 8, len: 2},
		],
		rw_info: "R/W"
	},		

	// *************** VelocityRegisters *****************
	{ 
		name : "IHOLD_IRUN",
		addr: 0x10,
		bitName: [
			{ name: "IHOLD", bit: 0, len: 5 , spinBox: UI_spinBox_I_HOLD, callback: UI_I_HOLD_callback},
			{ name: "IRUN", bit: 8, len: 5 , spinBox: UI_spinBox_I_RUN, callback: UI_I_RUN_callback},
			{ name: "IHOLDDELAY", bit: 16, len: 4 , spinBox: UI_spinBox_I_HOLD_DELAY, callback: UI_I_HOLD_DELAY_callback},
		],
		rw_info: "Write only"		
	},
	{ 
		name : "TPOWERDOWN",
		addr: 0x11,
		bitName: [
			{ name: "TPOWERDOWN", bit: 0, len: 8 , spinBox: UI_spinBox_T_POWER_DOWN, callback: UI_TPOWERDOWN_callback},
		],
		rw_info: "Write only"		
	},
	{ 
		name : "TSTEP",
		addr: 0x12,
		bitName: [
			{ name: "TSTEP", bit: 0, len: 20, callback: setTSTEP_PollValue},
		],
		rw_info: "Read only"
	},
	{ 
		name : "TPWMTHRS",
		addr: 0x13,
		bitName: [
			{ name: "TPWMTHRS", bit: 0, len: 20, spinBox: UI_TPWMTHRS_spinBox},
		],
		rw_info: "Write only"		
	},
	{ 
		name : "VACTUAL",
		addr: 0x22,
		bitName: [
			{ name: "VACTUAL", bit: 0, len: 24},
		],
		rw_info: "Write only"		
	},

	// **************** SequencerRegisters **************
	{ 
		name : "MSCNT",
		addr: 0x6A,
		bitName: [
			{ name: "MSCNT", bit: 0, len: 10},
		],
		rw_info: "Read only"		
	},
	{ 
		name : "MSCURACT",
		addr: 0x6B,
		bitName: [
			{ name: "CUR_A", bit: 0, len: 9},
			{ name: "CUR_B", bit: 16, len: 9},
		],
		rw_info: "Read only"		
	},

	//******************* ChopperRegisters *****************
	{ 
		name : "CHOPCONF",
		addr: 0x6C,
		bitName: [
			{ name: "DISS2VS", bit: 31, len: 1},
			{ name: "DISS2G", bit: 30, len: 1},
			{ name: "DEDGE", bit: 29, len: 1},
			{ name: "INTPOL", bit: 28, len: 1},
			{ name: "MRES", bit: 24, len: 4},
//			{ name: "-", bit: 18, len: 6},
			{ name: "VSENSE", bit: 17, len: 1},
			{ name: "TBL", bit: 15, len: 2, spinBox: UI_TBL_spinBox},
//			{ name: "-", bit: 11, len: 4},
			{ name: "HEND", bit: 7, len: 4, spinBox: UI_HEND_spinBox},
			{ name: "HSTRT", bit: 4, len: 3, spinBox: UI_HSTRT_spinBox},
			{ name: "TOFF", bit: 0, len: 4, spinBox: UI_TOFF_spinBox},
		],
		rw_info: "R/W"
	},
	{ 
		name : "DRV_STATUS",
		addr: 0x6F,
		bitName: [
			{ name: "STST", bit: 31, len: 1,    checkBoxColor: UI_checkBox_1},
			{ name: "STEALTH", bit: 30, len: 1, checkBoxColor: UI_checkBox_2},
//			{ name: "-", bit: 24, len: 6},
//			{ name: "-", bit: 21, len: 3},
			{ name: "CS_ACTUAL", bit: 16, len: 5},
//			{ name: "-", bit: 12, len: 4},
			{ name: "T157", bit: 11, len: 1,    checkBoxColor: UI_checkBox_3},
			{ name: "T150", bit: 10, len: 1,    checkBoxColor: UI_checkBox_4},
			{ name: "T143", bit: 9, len: 1,     checkBoxColor: UI_checkBox_5},
			{ name: "T120", bit: 8, len: 1,     checkBoxColor: UI_checkBox_6},
			{ name: "OLB", bit: 7, len: 1,      checkBoxColor: UI_checkBox_9},
			{ name: "OLA", bit: 6, len: 1,      checkBoxColor: UI_checkBox_10},
			{ name: "S2VSB", bit: 5, len: 1,    checkBoxColor: UI_checkBox_11},
			{ name: "S2VSA", bit: 4, len: 1,    checkBoxColor: UI_checkBox_12},
			{ name: "S2GB", bit: 3, len: 1,     checkBoxColor: UI_checkBox_13},
			{ name: "S2GA", bit: 2, len: 1,     checkBoxColor: UI_checkBox_14},
			{ name: "OT", bit: 1, len: 1,       checkBoxColor: UI_checkBox_7},
			{ name: "OTPW", bit: 0, len: 1,     checkBoxColor: UI_checkBox_8}
		],
		rw_info: "Read only"		
	},
	{ 
		name : "PWMCONF",
		addr: 0x70,
		bitName: [
			{ name: "PWM_LIM", bit: 28, len: 4, spinBox: UI_PWM_LIM_spinBox},
			{ name: "PWM_REG", bit: 24, len: 4, spinBox: UI_PWM_REG_spinBox},
//			{ name: "-", bit: 23, len: 1},
//			{ name: "-", bit: 22, len: 1},
			{ name: "FREEWHEEL", bit: 20, len: 2},
			{ name: "PWM_AUTOGRAD", bit: 19, len: 1, checkBox: UI_PWM_AUTOGRAD_checkBox},
			{ name: "PWM_AUTOSCALE", bit: 18, len: 1, checkBox: UI_PWM_AUTOSCALE_checkBox},
			{ name: "PWM_FREQ", bit: 16, len: 2, spinBox: UI_PWM_FREQ_spinBox, callback: UI_PWM_FREQ_callback},
			{ name: "PWM_GRAD", bit: 8, len: 8,  spinBox: UI_PWM_GRAD_spinBox},
			{ name: "PWM_OFS", bit: 0, len: 8, spinBox: UI_PWM_OFS_spinBox}
		],
		rw_info: "R/W"
	},
	{ 
		name : "PWM_SCALE",
		addr: 0x71,
		bitName: [
			{ name: "PWM_SCALE_SUM", bit: 0, len: 8},
			{ name: "PWM_SCALE_AUTO", bit: 16, len: 9},
		],
		rw_info: "Read only"		
	},
	{ 
		name : "PWM_AUTO",
		addr: 0x72,
		bitName: [
			{ name: "PWM_OFS_AUTO", bit: 0, len: 8},
			{ name: "PWM_GRAD_AUTO", bit: 16, len: 8},
		],
		rw_info: "Read only"		
	}	
];


// ****************** Start Motor Current ********************************

function UI_I_RUN_spinBoxValueChanged(value)
{
	setRegisterByName("IRUN", value);
	UI_I_RUN_callback(value);
}

function UI_I_RUN_callback(value)
{
	UI_I_RUN_Label.setText("Run current = " + parseFloat(((value+1.0)/32)*(0.325/(0.110+0.020))*0.707).toFixed(2) + " A RMS");	
}

function UI_I_HOLD_spinBoxValueChanged(value)
{
	setRegisterByName("IHOLD", value);
	UI_I_HOLD_callback(value);
}

function UI_I_HOLD_callback(value)
{
	UI_I_HOLD_Label.setText("Hold current = " + parseFloat(((value+1.0)/32)*(0.325/(0.110+0.020))*0.707).toFixed(2) + " A RMS");
}

function UI_I_HOLD_DELAY_spinBoxValueChanged(value)
{
	setRegisterByName("IHOLDDELAY", value);
	UI_I_HOLD_DELAY_callback(value);
}

function UI_I_HOLD_DELAY_callback(value)
{
	UI_IHOLDDELAY_Label.setText("Hold delay = " + parseFloat(value * (1<<18) / 12e6 ).toFixed(3) + " s per step");	
}

function UI_T_POWER_DOWN_spinBoxValueChanged(value)
{
	setRegisterByName("TPOWERDOWN", value);
	UI_TPOWERDOWN_callback(value);
}

function UI_TPOWERDOWN_callback(value)
{
	UI_TPOWERDOWN_Label.setText("Time = " + parseFloat(value * (1<<18) / 12e6 ).toFixed(3) + " s");
}

// ****************** End Motor Current ********************************


// ****************** Start StealthChop/SpreadCycle ********************************

function UI_EN_SPREADCYCLE_checkBoxValueChanged()
{
	setRegisterByName("EN_SPREADCYCLE", UI_EN_SPREADCYCLE_checkBox.isChecked() ? 1 : 0);
}

function UI_PWM_AUTOSCALE_checkBoxValueChanged()
{
	setRegisterByName("PWM_AUTOSCALE", UI_PWM_AUTOSCALE_checkBox.isChecked() ? 1 : 0);
}

function UI_PWM_AUTOGRAD_checkBoxValueChanged()
{
	setRegisterByName("PWM_AUTOGRAD", UI_PWM_AUTOGRAD_checkBox.isChecked() ? 1 : 0);
}

function UI_PWM_FREQ_spinBoxValueChanged(value)
{
	setRegisterByName("PWM_FREQ", value);
	UI_PWM_FREQ_callback(value);
}

function UI_PWM_FREQ_callback(value)
{
	var fpwm = [ 2/1024*12e3, 2/683*12e3, 2/512*12e3, 2/410*12e3];
	if(fpwm[value] < 20 || fpwm[value] > 50)
		UI_PWM_FREQ_spinBox.setBackgroundColor("red");   
	else
		UI_PWM_FREQ_spinBox.setBackgroundColor("white");
	UI_PWM_FREQ_Label.setText("Frequency = " + parseFloat(fpwm[value]).toFixed(1) + " kHz");
}

function UI_TOFF_spinBoxValueChanged(value)
{
	setRegisterByName("TOFF", value);
}

function UI_TBL_spinBoxValueChanged(value)
{
	setRegisterByName("TBL", value);
}

function UI_HSTRT_spinBoxValueChanged(value)
{
	setRegisterByName("HSTRT", value);
}

function UI_HEND_spinBoxValueChanged(value)
{
	setRegisterByName("HEND", value);
}

function UI_TPWMTHRS_spinBoxValueChanged(value)
{
	setRegisterByName("TPWMTHRS", value);
}

function UI_PWM_LIM_spinBoxValueChanged(value)
{
	setRegisterByName("PWM_LIM", value);
}

function UI_PWM_REG_spinBoxValueChanged(value)
{
	setRegisterByName("PWM_REG", value);
}

function UI_PWM_OFS_spinBoxValueChanged(value)
{
	setRegisterByName("PWM_OFS", value);
}

function UI_PWM_GRAD_spinBoxValueChanged(value)
{
	setRegisterByName("PWM_GRAD", value);
}

// ****************** End StealthChop/SpreadCycle ********************************


// ****************** Start DRV_STATUS polling ********************************

function poll_DRV_STATUS_function()
{
	readRegister(0x01);  // GSTAT
	readRegister(0x6F);  // DRV_STATUS
}

var DRV_STATUS_Timer = scriptThread.createTimer()
DRV_STATUS_Timer.timeoutSignal.connect(poll_DRV_STATUS_function);

function UI_DRV_STATUS_Polling_checkBox_Clicked()
{
	var enabled = UI_DRV_STATUS_polling_checkBox.isChecked();
	
	UI_DRV_STATUS_Polling_groupBox.setEnabled(enabled);
	UI_GSTAT_groupBox.setEnabled(enabled);

	UI_checkBox_1.setEnabled(enabled);
	UI_checkBox_2.setEnabled(enabled);
	UI_checkBox_3.setEnabled(enabled);
	UI_checkBox_4.setEnabled(enabled);
	UI_checkBox_5.setEnabled(enabled);
	UI_checkBox_6.setEnabled(enabled);
	UI_checkBox_7.setEnabled(enabled);
	UI_checkBox_8.setEnabled(enabled);
	UI_checkBox_9.setEnabled(enabled);
	UI_checkBox_10.setEnabled(enabled);
	UI_checkBox_11.setEnabled(enabled);
	UI_checkBox_12.setEnabled(enabled);
	UI_checkBox_13.setEnabled(enabled);
	UI_checkBox_14.setEnabled(enabled);
	UI_checkBox_15.setEnabled(enabled);
	UI_checkBox_16.setEnabled(enabled);
	
	if(enabled)
		DRV_STATUS_Timer.start(500);
	else
		DRV_STATUS_Timer.stop();
}
// ****************** End DRV_STATUS polling ********************************


// ****************** Start TSTEP recordng ********************************

function clearButtonPressed()
{
	plotWindow.clearGraphs();
}

function TSTEP_showGraph()
{
	plotWindow.show();
}

function poll_TSTEP_function()
{
	if(!readRegister(0x12))  // TSTEP
		TSTEPPollCounter = 1; // stop on error
	
	if(TSTEPPollCounter > 0)
	{
		TSTEPPollCounter--;
		if(TSTEPPollCounter == 0)
		{
			TSTEP_Timer.stop();
			UI_RecordingStart_pushButton.setEnabled(true);
			UI_RecordingStart_pushButton.setText("Start");
			plotWindow.show();
		}
	}
}

var TSTEPPollCounter = 0;
var TSTEPGraphXCounter = 0;
var TSTEP_Timer = scriptThread.createTimer()
TSTEP_Timer.timeoutSignal.connect(poll_TSTEP_function);

function TSTEP_startRecording()
{
	var pollInterval = 50;
	
	plotWindow.clearGraphs();
	UI_RecordingStart_pushButton.setEnabled(false);
	UI_RecordingStart_pushButton.setText("Recording...");
	TSTEPPollCounter = UI_RecordingTime_spinBox.value()*1000 / pollInterval;
	TSTEPGraphXCounter = 0;
	TSTEP_Timer.start(pollInterval);
	plotWindow.show();
}

function setTSTEP_PollValue(value)
{
	if(TSTEPPollCounter > 0)
	{
		if(value > 250)
			value = 250; // upper limit in graph
		plotWindow.addDataToGraph(plotWindowGraph1Index, TSTEPGraphXCounter, value);
		TSTEPGraphXCounter++;
	}
}

// ****************** End TSTEP recordng ********************************


// ****************** Start OTP programmer ********************************

function UI_OTPBYTE_spinBoxValueChanged(value)
{
	UI_OTP_Name_label.setText("Name: otp" + UI_OTPBYTE_spinBox.value() + "." + UI_OTPBIT_spinBox.value());
}

function UI_OTPBIT_spinBoxValueChanged(value)
{
	UI_OTP_Name_label.setText("Name: otp" + UI_OTPBYTE_spinBox.value() + "." + UI_OTPBIT_spinBox.value());
}

function UI_OTP_pushButtonClicked()
{
	var bi = UI_OTPBIT_spinBox.value();
	var by = UI_OTPBYTE_spinBox.value();
	
	if(scriptThread.showYesNoDialog("Critical", "WARNING", "Setting otp" + by + "." + bi + " to '1'?\n\nAre you absolutely shure?\nYou can not undo this bit writing!"))
	{
		var value32 = 0xbd00 | (by << 4) | bi;
		if(scriptThread.showYesNoDialog("Critical", "WARNING", "Double check:\n\nWriting "+decimalToHex(value32, 8) + " to OTP_PROG?")) 
		{
			writeRegister(0x04, value32); // OTP_PROG

			scriptThread.sleepFromScript(10);
			scriptThread.messageBox("Information", "OPT_PROG", "Bit programmed!\nRead all registers and check the result under OTP_READ.");
		}
	}
}

// ****************** End OTP programmer ********************************

function initAfterConnection()
{
	readAllRegisters();  
	if(waitReceived())
	{
		OTP_READ_Decoder();  // setting some reset values from otp-Registers
		if(waitReceived())
		{
			setRegisterByName("IRUN", 31);         // 31 = reset default
			setRegisterByName("IHOLD", OptRead.IHOLD);
			setRegisterByName("IHOLDDELAY", OptRead.IHOLDDELAY);
			setRegisterByName("TPOWERDOWN", 20);  // 20 = reset default
			setRegisterByName("TPWMTHRS", OptRead.TPWMTHRS);
			
			// init
			setRegisterByName("PDN_DISABLE", 1);
			return true;
		}
	}
	return false;
}


// ********************** Signal connections *****************************

UI_Connect_pushButton.clickedSignal.connect(connectButtonClicked);
serialPort.readyReadSignal.connect(dataReceivedSlot);

initTreeWidget(AllRegisters, UI_GeneralTreeWidget);
UI_ReadAllButton.clickedSignal.connect(readAllRegisters);

// Init Motor Current
UI_spinBox_I_RUN.valueChangedSignal.connect(UI_I_RUN_spinBoxValueChanged);
UI_spinBox_I_HOLD.valueChangedSignal.connect(UI_I_HOLD_spinBoxValueChanged);
UI_spinBox_I_HOLD_DELAY.valueChangedSignal.connect(UI_I_HOLD_DELAY_spinBoxValueChanged);
UI_spinBox_T_POWER_DOWN.valueChangedSignal.connect(UI_T_POWER_DOWN_spinBoxValueChanged);

UI_EN_SPREADCYCLE_checkBox.clickedSignal.connect(UI_EN_SPREADCYCLE_checkBoxValueChanged);
UI_PWM_AUTOSCALE_checkBox.clickedSignal.connect(UI_PWM_AUTOSCALE_checkBoxValueChanged);
UI_PWM_AUTOGRAD_checkBox.clickedSignal.connect(UI_PWM_AUTOGRAD_checkBoxValueChanged);
UI_PWM_FREQ_spinBox.valueChangedSignal.connect(UI_PWM_FREQ_spinBoxValueChanged);
UI_TOFF_spinBox.valueChangedSignal.connect(UI_TOFF_spinBoxValueChanged);
UI_TBL_spinBox.valueChangedSignal.connect(UI_TBL_spinBoxValueChanged);
UI_HSTRT_spinBox.valueChangedSignal.connect(UI_HSTRT_spinBoxValueChanged);
UI_HEND_spinBox.valueChangedSignal.connect(UI_HEND_spinBoxValueChanged);
UI_TPWMTHRS_spinBox.valueChangedSignal.connect(UI_TPWMTHRS_spinBoxValueChanged);
UI_PWM_LIM_spinBox.valueChangedSignal.connect(UI_PWM_LIM_spinBoxValueChanged);
UI_PWM_REG_spinBox.valueChangedSignal.connect(UI_PWM_REG_spinBoxValueChanged);
UI_PWM_OFS_spinBox.valueChangedSignal.connect(UI_PWM_OFS_spinBoxValueChanged);
UI_PWM_GRAD_spinBox.valueChangedSignal.connect(UI_PWM_GRAD_spinBoxValueChanged);

// DRV Status polling
UI_DRV_STATUS_polling_checkBox.clickedSignal.connect(UI_DRV_STATUS_Polling_checkBox_Clicked)

// TSTEP recording
var plotWindow = scriptThread.createPlotWindow();
plotWindow.setWindowTitle("plot window created/used by script");
plotWindow.setAxisLabels("x axis plot 1", "y axis plot 1");
plotWindow.showLegend(true);
plotWindow.setInitialAxisRanges(100, 0, 300);
var plotWindowGraph1Index = plotWindow.addGraph("blue", "solid", "TSETP");
plotWindow.showHelperElements(true, true, true, true, true, true, true);

UI_RecordingShow_pushButton.clickedSignal.connect(TSTEP_showGraph);
UI_RecordingStart_pushButton.clickedSignal.connect(TSTEP_startRecording);
plotWindow.clearButtonPressedSignal.connect(clearButtonPressed)

// OPT Programmer
UI_OTPBYTE_spinBox.valueChangedSignal.connect(UI_OTPBYTE_spinBoxValueChanged);
UI_OTPBIT_spinBox.valueChangedSignal.connect(UI_OTPBIT_spinBoxValueChanged);
UI_OTP_pushButton.clickedSignal.connect(UI_OTP_pushButtonClicked);

UI_Dialog.finishedSignal.connect(dialogFinished);
