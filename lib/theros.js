loadAPI(1);

// Constants
var MIDI_MAX_VAL = 128;
//var ECHO_ID = "12";
//var SYSEX_HEADER = "F0 42 40 00 01 04 00";

var NOTEIN_FILTERS = [];//"80????", "90????"];

var HIGHEST_CC = 119;
var LOWEST_CC = 1;
var NUM_CC = HIGHEST_CC - LOWEST_CC + 1;

var TRACKBANK_TRACKS = 8;
var TRACKBANK_SENDS = 1;
var TRACKBANK_SCENES = 16;

load('helpers.js');
load('controller.js');
load('pages.js');

// Views accessible to control callbacks
var views = {
  application: null,
  transport: null,
  trackBank: null,
  cursorTrack: null,
  primaryDevice: null,
  cursorDevice: null,
  masterTrack: null,

  midiInPort: null,
  noteIn: null,
  controller: null,
  userControls: null,
};

function init() {
  views.application = host.createApplication();
  views.transport = host.createTransport();
  views.trackBank = host.createTrackBank(TRACKBANK_TRACKS, TRACKBANK_SENDS, TRACKBANK_SCENES);
  views.cursorTrack = host.createCursorTrack(2, 0);
  views.primaryDevice = views.cursorTrack.getPrimaryDevice();
  views.cursorDevice = host.createCursorDevice();
  views.masterTrack = host.createMasterTrack(0);

  views.midiInPort = host.getMidiInPort(0);
  views.noteIn = views.midiInPort.createNoteInput.apply(views.midiInPort, ["Oxygen 25 Keyboard"].concat(NOTEIN_FILTERS));
  views.noteIn.setShouldConsumeEvents(false);

  views.controller = new Controller(globalMappings, channelPages);
  views.userControls = views.controller.userControls;

  views.midiInPort.setMidiCallback(onMidi);

  //sendSysex(SYSEX_HEADER + "00 00 01 F7"); // Enter native mode
  // sendSysex(SYSEX_HEADER + "1F 10 00 F7"); //sysex dump request
}

function onMidi(status, data1, data2) {
  views.controller.onMidi(status, data1, data2);
}
function exit() {
  //sendSysex(SYSEX_HEADER + "00 00 00 F7"); // Leave native mode
}

function onSysex(data) {
  // printSysex(data);
}

var channelPages = new Array(16);
