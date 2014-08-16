loadAPI(1);

/********************************* Constants *******************************/
var MIDI_MAX_VAL = 128;
//var ECHO_ID = "12";
var SYSEX_HEADER = "F0 42 40 00 01 04 00";

var noteInFilters = [];//"80????", "90????"];

var HIGHEST_CC = 119;
var LOWEST_CC = 1;

/****************************** Device discovery ***************************/
host.defineController("M-Audio", "Oxygen 25", "1.0", "2B6AB540-B75A-11E3-A5E2-0800200C9A66");
host.defineMidiPorts(1, 1);
host.addDeviceNameBasedDiscoveryPair(["Oxygen 25"], ["Oxygen 25"]);
//host.defineSysexDiscovery("F0 42 50 00" + ECHO_ID + "F7", "F0 42 50 01 ?? " + ECHO_ID + " 04 01 00 00 ?? ?? ?? ?? F7");

// Search after different naming-schemes for autodetection
for (var i = 1; i < 9; i++) {
  var name = i.toString() + "- Oxygen 25";
  host.addDeviceNameBasedDiscoveryPair([name], [name]);
  host.addDeviceNameBasedDiscoveryPair(["Oxygen 25 MIDI " + i.toString()], ["Oxygen 25 MIDI " + i.toString()]);
}

/********************************* Mappings ********************************/
// Views accessible to control callbacks
var views = {
  application: null,
  transport: null,
  trackBank: null,
  cursorTrack: null,
  primaryInstrument: null,
  cursorDevice: null,
  masterTrack: null,

  midiInPort: null,
  noteIn: null,
  controlPages: null,
  userControls: null,
};

// MIDI CCs to labels
var controls = {
  knobs: [71, 72, 73, 74, 75, 76, 77, 78],
  slider: 7,
  c10: 31,
  loop: 113,
  stop: 116,
  play: 117,
  rec: 118
};

/******************************** Pages ************************************/
// page definition:
// { name: 'Some Page',
//   mappings: [
//    {on: an array of CC values, eg: controls.knobs or [44,45,46]
//     control: function(chan, idx_in_cc_array) or bitwig control
//              if it's a function, it's evalued once for each cc
//              ONLY evaluted ONCE at startup
//     controlAbs: same as control, but the value is set to the
//                 absolute value in the CC message
//     callback: function(idx_in_cc_array, chan, cc, new_val, last_val)
//               callback to call when one there's a message with
//               a matching CC
//     always: true/false
//                 if true, then mapping is active even when
//                 ControlPages.setEnabled(false) was called
//    },
//    .....
//  ]
// }
//
// See the presets below for examples

// TODO give pages a callback to decide whether they are active
//      depending on the current instrument, current view, etc

// Presets
// don't edit these, but instead edit the variable 'pages' at the end of
// the configuration area

// each page handles a subset of device knobs
var separateDevicePages =
[{
  name: 'Device - Macros',
  mappings:
  [{
    on: controls.knobs,
    control: function (chan, idx) {
      return views.primaryInstrument.getMacro(idx).getAmount();
    }
  }]
},
{
  name: 'Device - Parameters',
  mappings:
  [{
    on: controls.knobs,
    control: function (chan, idx) {
      //views.cursorDevice.setParameterPage(0);
      return views.cursorDevice.getParameter(idx);
    }
  }]
},
{
  name: 'Device - Common Parameters',
  mappings:
  [{
    on: controls.knobs,
    control: function (chan, idx) {
      return views.cursorDevice.getCommonParameter(idx);
    }
  }]
},
{
  name: 'Device - Envelope Parameters',
  mappings:
  [{
    on: controls.knobs,
    control: function (chan, idx) {
      return views.cursorDevice.getEnvelopeParameter(idx);
    }
  }]
}];

var mixerPages =
[{
  name: 'Mixer - Volumes',
  mappings:
  [{
    on: controls.knobs,
    control: function (chan, idx) {
      return views.trackBank.getTrack(idx).getVolume();
    }
  }]
},
{
  name: 'Mixer - Pan',
  mappings:
  [{
    on: controls.knobs,
    control: function (chan, idx) {
      return views.trackBank.getTrack(idx).getPan();
    }
  }]
}];

// And finally, map each channel to a set of pages.
// channels left empty will be free to be mapped live
var channelPages = new Array(16);
channelPages[0] = separateDevicePages;
channelPages[1] = mixerPages

// Global Mappings are active across channels
// if mapped in a page, the page takes precedence
var globalMappings =
[{
  on: controls.c10,
  always: true, // call even when controls are disabled!
  callback: function (idx, chan, cc, val, hist) {
    if (val > 0)
      views.controlPages.setEnabled(false);
    else
      views.controlPages.selectNext(chan);
  }
},
{
  on: controls.play,
  always: true,
  callback: function (idx, chan, cc, val, hist) {
    if (val > 0) views.transport.play();
  }
},
{
  on: controls.stop,
  always: true,
  callback: function (idx, chan, cc, val, hist) {
    if (val > 0) views.transport.stop();
  }
},
{
  on: controls.loop,
  always: true,
  callback: function (idx, chan, cc, val, hist) {
    if (val > 0) views.transport.toggleLoop();
  }
},
{
  on: controls.rec,
  always: true,
  callback: function (idx, chan, cc, val, hist) {
    if (val > 0) {
      views.cursorTrack.getArm().set(true);
      views.transport.record();
    }
  }
}];

/***************************************************************************/
/***************************************************************************/

function init() {
  views.application = host.createApplication();
  views.transport = host.createTransport();
  views.trackBank = host.createTrackBank(8, 1, 0);
  views.cursorTrack = host.createCursorTrack(2, 0);
  views.primaryInstrument = views.cursorTrack.getPrimaryInstrument();
  views.cursorDevice = host.createCursorDevice();
  views.masterTrack = host.createMasterTrack(0);

  views.midiInPort = host.getMidiInPort(0);

  views.noteIn = views.midiInPort.createNoteInput.apply(views.midiInPort, ["Oxygen 25 Keyboard"].concat(noteInFilters));

  views.controlPages = new ControlPages(globalMappings, channelPages);
  views.userControls = views.controlPages.userControls;

  views.midiInPort.setMidiCallback(
    function (status, data1, data2) {
      views.controlPages.onMidi(status, data1, data2)
  });

  //sendSysex(SYSEX_HEADER + "00 00 01 F7"); // Enter native mode
  // sendSysex(SYSEX_HEADER + "1F 10 00 F7"); //sysex dump request
}

function exit() {
  //sendSysex(SYSEX_HEADER + "00 00 00 F7"); // Leave native mode
}

function onSysex(data) {
  // printSysex(data);
}

function Page(pageDesc, chan) {
  this.name = pageDesc.name;
  this.channel = chan;
  this.ccMap = {};
  this.ccCallback = {};
  this.ccAlways = {}; // CCs that trigger even when controls are disabled
  this.indicateCtrls = [];

  for (var m in pageDesc.mappings) {
    m = pageDesc.mappings[m];
    if (!(m.on instanceof Array)) {
      m.on = [m.on];
    }
    for (var o in m.on) {
      var cc = m.on[o];
      var ctrl;
      if (m.control) {
        if (m.control.call)
          ctrl = m.control(chan, o);
        else
          ctrl = m.control;
        this.ccMap[cc] = [ctrl, false];
      } else if (m.controlAbs) {
        this.ccMap[cc] = [ctrl, true];
      }
      if (m.callback) {
        this.ccCallback[cc] = [m.callback, o];
      }
      if (m.always) {
        this.ccAlways[cc] = true;
      }
      if (m.indicate) {
        if (m.indicate.call)
          ctrl = m.indicate(chan, o);
        else
          ctrl = m.indicate;
        this.indicateCtrls.push(ctrl);
      }
    }
  }
}

function ControlPages(globalMappings, channelPages) {
  // setup state
  this.enabled = false;
  var globalpageDesc = {name: 'Global', mappings: globalMappings};
  this.globalPage = new Page(globalpageDesc, 0);
  this.currentChannel = undefined;
  this.channelPages = new Array(16);
  this.currentPageIdx = new Array(16);
  for (var i = 0; i < this.currentPageIdx.length; i++)
    this.currentPageIdx[i] = 0;
  this.currentPage = null;
  this.ccValHistory = {};

  // register the pages
  for (var chan in channelPages)
    for (var p in channelPages[chan])
      this.registerPage(chan, channelPages[chan][p]);

  this.selectPage(0, 0);

  // create user controls
  this.userControls = host.createUserControls((HIGHEST_CC - LOWEST_CC + 1)*16);

  // label them
  for (var cc = LOWEST_CC; cc <= HIGHEST_CC; cc++) {
    for (var chan = 0; chan < 16; chan++)
      this.getUserControl(chan, cc).setLabel("CC"+cc);
  }

  for (var ctrl_name in controls) {
    if (controls[ctrl_name] instanceof Array) {
      for (var i in controls[ctrl_name]) {
          for (var chan = 0; chan < 16; chan++)
            this.getUserControl(chan, controls[ctrl_name][i]).setLabel(ctrl_name+i);
      }
    }
  }

  // add observers
  var self = this;
  views.application.addSelectedModeObserver(function (mode) {
    self.currentMode = mode;
  }, 100, "Unknown");
}

ControlPages.prototype.registerPage = function (chan, pageDesc) {
  if (!this.channelPages[chan]) this.channelPages[chan] = [];
  this.channelPages[chan].push(new Page(pageDesc, chan));
};
ControlPages.prototype.setEnabled = function (val) {
  this.enabled = val;
  this.indicateGUI(val);
};
ControlPages.prototype.selectPage = function (chan, idx) {
  if (this.enabled) this.setEnabled(false);
  var pages = this.channelPages[chan];
  if (pages) {
    idx %= pages.length;
    if (idx < 0) idx += pages.length;
    this.currentPageIdx[chan] = idx;
    this.currentPage = pages[idx];
  } else {
    this.currentPage = null;
  }
  this.setEnabled(true);

  var msg = "Ch" + chan;
  if (this.currentPage)
    msg += " Page: " + this.currentPage.name;
  host.showPopupNotification(msg);
};
ControlPages.prototype.selectNext = function (chan) {
  if (!chan) chan = this.currentPage.channel;
  if (chan != this.currentPage.channel)
    this.selectPage(chan, this.currentPageIdx[chan]);
  else
    this.selectPage(chan, this.currentPageIdx[chan]+1);

};
ControlPages.prototype.selectPrev = function (chan) {
  if (!chan) chan = this.currentPage.channel;
  if (chan != this.currentPage.channel)
      this.selectPage(chan, this.currentPageIdx[chan]);
  else
    this.selectPage(chan, this.currentPageIdx[chan]-1);
};
ControlPages.prototype.indicateGUI = function (val) {
  if (!this.currentPage) { // no page, indicate usercontrols
    for (var cc = LOWEST_CC; cc <= HIGHEST_CC; cc++) {
      this.getUserControl(this.currentChannel, cc).setIndication(val);
    }
  } else {
    // indicate all maped controls
    for (var cc in this.currentPage.ccMap) {
      var control_data = this.currentPage.ccMap[cc];
      // 0: is the function that returns the bitwig control
      // 1: is the index into the given cc array
      control_data[0].setIndication(val);
    }
    // indicate all other controls supplied
    for (var i in this.currentPage.indicateCtrls) {
      this.currentPage.indicateCtrls[i].setIndication(val);
    }
  }
};

ControlPages.prototype.getUserControl = function (channel, cc) {
  return this.userControls.getControl((cc - LOWEST_CC) + channel * 16);
}
ControlPages.prototype.setUserControlVal = function (channel, cc, val) {
  this.getUserControl(channel, cc).set(val, MIDI_MAX_VAL);
}

ControlPages.prototype.performAction = function (page, chan, cc, val, hist) {
  if (this.enabled || page.ccAlways[cc]) {
    var ctrl = page.ccMap[cc];
    // if it's a mapped ctrl, change it
    if (ctrl) {
      if (ctrl[1]) { // absolute control
        ctrl[0].set(val, MIDI_MAX_VAL);
      } else { // relative control
        //FIXME is this responsie enough??
        // this misses the first midi message (as there's no history)
        if (hist)
          ctrl[0].inc(val-hist, MIDI_MAX_VAL);
      }
      return true;
    }
    // if there's a callback, call it
    ctrl = page.ccCallback[cc];
    if (ctrl) {
      ctrl[0](ctrl[1], chan, cc, val, hist);
    }
  }
  return false;
}

ControlPages.prototype.onMidi = function (status, data1, data2) {
  var chan = status & 0xF, cc = data1, val = data2;
  var hist = this.ccValHistory[cc];
  var found_action = false;

  this.currentChannel = chan;

  if (this.currentPage && this.currentPage.channel == chan) {
    found_action = this.performAction(this.currentPage, chan, cc, val, hist);
  } else if (this.channelPages[chan]) {
    this.selectPage(chan, this.currentPageIdx[chan]);
    return this.onMidi(status, data1, data2);
  } else if (this.currentPage) {
    // no pages in this channel
    this.selectPage(chan, 0);
  }

  if (!found_action) {
    // this is a page-less channel or an un-mapped cc in this page
    // check for and try to perform globally mapped action
    if (!this.performAction(this.globalPage, chan, cc, val, hist))
      // otherwise map to a user-control
      this.setUserControlVal(chan, cc, val);
  }

  // save cc history
  this.ccValHistory[cc] = val;
};