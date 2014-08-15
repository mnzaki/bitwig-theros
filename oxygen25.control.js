loadAPI(1);

/**** Constants ****/
var MIDI_MAX_VAL = 128;
//var ECHO_ID = "12";
var SYSEX_HEADER = "F0 42 40 00 01 04 00";

var noteInFilters = [];//"80????", "90????"];

/**** Device discovery ****/
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

/**** Mapping ****/
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
};

// MIDI CCs to labels
var controls = {
  knobs: [71, 72, 73, 74, 75, 76, 77, 78],
  sliders: [7],
  c10: 31,
  loop: 113,
  stop: 116,
  play: 117,
  rec: 118
};

// Page Definitions

// common reusable mappings
var globalMappings =
[{
  on: controls.c10,
  always: true, // call even when controls are disabled!
  callback: function (val) {
    if (val > 0)
      views.controlPages.selectNone();
    else
      views.controlPages.selectNext();
  }
}];

// pages
var pages =
[{
  name: 'device macros',
  mappings:
  [{
    on: controls.knobs,
    mapControlRel: function (idx) {
      return views.primaryInstrument.getMacro(idx).getAmount();
    }
  }]
},
{
  name: 'device parameters',
  mappings:
  [{
    on: controls.knobs,
    mapControlRel: function (idx) {
      views.cursorDevice.setParameterPage(0);
      return views.cursorDevice.getParameter(idx);
    }
  }]
},
{
  name: 'device common parameters',
  mappings:
  [{
    on: controls.knobs,
    mapControlRel: function (idx) {
      return views.cursorDevice.getCommonParameter(idx);
    }
  }]
},
{
  name: 'device common parameters',
  mappings:
  [{
    on: controls.knobs,
    mapControlRel: function (idx) {
      return views.cursorDevice.getEnvelopeParameter(idx);
    }
  }]
}];

for (var p in pages) {
  var mappings = pages[p].mappings;
  if (!mappings) pages[p].mappings = globalMappings;
  else pages[p].mappings =
          pages[p].mappings.concat(globalMappings);
}

/*mixerPage = new Page();
mixerPage.onKnob = function(index, val)
{
  trackBank.getTrack(index).getPan().set(val, 128);
}
mixerPage.onSlider = function(index, val)
{
  trackBank.getTrack(index).getVolume().set(val, 128);
}
mixerPage.updateIndications = function()
{
  for ( var p = 0; p < 8; p++)
  {
    macro = primaryInstrument.getMacro(p).getAmount();
    parameter = cursorDevice.getParameter(p);
    track = trackBank.getTrack(p);
    track.getVolume().setIndication(true);
    track.getPan().setIndication(true);
    parameter.setIndication(false);
    macro.setIndication(false);
  }
}*/

/*************************************************************/

function init()
{
  views.application = host.createApplication();
  views.transport = host.createTransport();
  views.trackBank = host.createTrackBank(8, 1, 0);
  views.cursorTrack = host.createCursorTrack(2, 0);
  views.primaryInstrument = views.cursorTrack.getPrimaryInstrument();
  views.cursorDevice = host.createCursorDevice();
  views.masterTrack = host.createMasterTrack(0);

  views.midiInPort = host.getMidiInPort(0);

  views.noteIn = views.midiInPort.createNoteInput.apply(views.midiInPort, ["Oxygen 25 Keyboard"].concat(noteInFilters));

  views.controlPages = new ControlPages(pages);
  views.midiInPort.setMidiCallback(
    function (status, data1, data2) {
      views.controlPages.onMidi(status, data1, data2)
  });
  //sendSysex(SYSEX_HEADER + "00 00 01 F7"); // Enter native mode
  // sendSysex(SYSEX_HEADER + "1F 10 00 F7"); //sysex dump request
}

function exit()
{
  //sendSysex(SYSEX_HEADER + "00 00 00 F7"); // Leave native mode
}

/*
function onMidi(status, data1, data2)
{
  var cc = data1;
  var val = data2;
  //printMidi(status, cc, val);

  if (status == 176)
  {
    if (withinRange(data1, CC.SLIDER1, CC.SLIDER5))
    {
      var index = data1 - CC.SLIDER1;
      activePage.onSlider(index, val);
      // trackBank.getTrack(index).getVolume().set(data2, 128);
    }

    else if (withinRange(data1, CC.SLIDER6, CC.SLIDER7))
    {
      var index = data1 - (CC.SLIDER1) - 1;
      activePage.onSlider(index, val);
    }
    else if (cc == CC.SLIDER8)
    {
      var index = 7;
      activePage.onSlider(index, val);
    }
    else if (cc == CC.SLIDER9)
    {
      masterTrack.getVolume().set(data2, 128);
    }

    else if (withinRange(data1, CC.KNOB1, CC.KNOB1 + 7))
    {
      var index = data1 - CC.KNOB1;
      activePage.onKnob(index, val);
    }
    else if (cc == CC.KNOB9)
    {
      // var tempo = Math.round((val * 0.5)+10);
      // transport.getTempo().set(val+30, 500);
    }

    if (val > 0) // deal with button presses here
    {
      if (withinRange(data1, CC.UPPER_BUTTON1, CC.UPPER_BUTTON8))
      {
        var index = data1 - CC.UPPER_BUTTON1;
        trackBank.getTrack(index).getMute().toggle();
      }
      else if (withinRange(data1, CC.LOWER_BUTTON1, CC.LOWER_BUTTON8))
      {
        var index = data1 - CC.LOWER_BUTTON1;
        trackBank.getTrack(index).getArm().toggle();
      }
      switch (data1)
      {
        case CC.TOGGLE_MODE_PAGE:
          switchPage();
          break;

        case CC.TOGGLE_VIEW:
          application.nextPerspective();
          break;

        case CC.PLAY:
          isPlay ? transport.restart() : transport.play();
          break;

        case CC.STOP:
          transport.stop();
          break;

        case CC.REC:
          transport.record();
          break;

        case CC.REW:
          transport.rewind();
          break;

        case CC.FF:
          transport.fastForward();
          break;

        case CC.LOOP:
          transport.toggleLoop();
          break;
      }
    }
  }
}*/

function onSysex(data)
{
  // printSysex(data);
}

var action_map = {
  mapControl: function (action_cb, cc_idx, val) {
    action_cb(cc_idx).set(val, MIDI_MAX_VAL);
  },
  mapControlRel: function (action_cb, cc_idx, val, hist) {
    if (hist)
      action_cb(cc_idx).inc(val-hist, MIDI_MAX_VAL);
  },
  callback: function (action_cb, cc_idx, val) {
    action_cb(val);
  },
  triggerCallback: function (action_cb, cc_idx, val) {
    if (val > 0) action_cb(val);
  }
};

function ControlPages(page_descs)
{
  self = this;
  self.enabled = true;
  self.pages = [];
  self.currentPageIdx = -1;
  self.currentPage = null;
  self.cc_val_history = {};

  this.action_map = action_map;

  for (var p in page_descs) {
    self.registerPage(page_descs[p]);
  }
  this.selectPage(0);
}

function Page(action_map, page_desc) {
  this.name = page_desc.name;
  this.cc_map = {};
  this.always_ccs = {}; // CCs that trigger even when controls are disabled
  for (action in action_map)
    this.cc_map[action] = {}
  this.indicate_cbs = [];

  for (var m in page_desc.mappings) {
    m = page_desc.mappings[m];
    if (!(m.on instanceof Array)) {
      m.on = [m.on];
    }
    for (var o in m.on) {
      for (var action in this.cc_map) {
        if (m[action])
          this.cc_map[action][m.on[o]] = [m[action], o];
          if (m.always) {
            for (var cc in m.on)
              this.always_ccs[m.on[cc]] = true;
          }
      }
    }
    if (m['indicate'])
      this.indicate_cbs.push(m.on[o]);
  }
}

ControlPages.prototype.registerPage = function (page_desc) {
  this.pages.push(new Page(this.action_map, page_desc));
};
ControlPages.prototype.selectNone = function () {
  this.setEnabled(false);
}
ControlPages.prototype.setEnabled = function (val) {
  this.enabled = val;
  this.indicateGUI(val);
}
ControlPages.prototype.selectPage = function (idx) {
  if (this.enabled) this.setEnabled(false);
  idx %= this.pages.length;
  if (idx < 0) idx += this.pages.length;
  this.currentPageIdx = idx;
  this.currentPage = this.pages[idx];
  this.setEnabled(true);
};
ControlPages.prototype.selectNext = function () {
  this.selectPage(this.currentPageIdx+1);
};
ControlPages.prototype.selectPrev = function () {
  this.selectPage(this.currentPageIdx-1);
};
ControlPages.prototype.indicateGUI = function (val) {
  if (!this.currentPage) return;
  // indicate all the controls from the 'mapControl' action
  var mapped_ctrls = ['mapControl', 'mapControlRel']
  for (var m in mapped_ctrls) {
    m = this.currentPage.cc_map[mapped_ctrls[m]];
    for (var cc in m) {
      var cb = m[cc][0],
          cc_idx = m[cc][1];
      cb(cc_idx).setIndication(val);
    }
  }
  // And also all registered indication callbacks
  for (var i in this.currentPage.indicate_cbs) {
    this.currentPage.indicate_cbs[i](val);
  }
};
ControlPages.prototype.onMidi = function (status, data1, data2) {
  if (!this.currentPage || !isChannelController(status)) return;

  var cc = data1, val = data2;
  // printMidi(status, data1, data2);

  if (!this.enabled && !this.currentPage.always_ccs[cc]) {
    return;
  } else { // operate normally, if enabled
    for (var action in this.currentPage.cc_map) {
      action_cb = this.currentPage.cc_map[action][cc];
      if (action_cb) {
        var cc_idx = action_cb[1];
        action_cb = action_cb[0];
        this.action_map[action](action_cb, cc_idx, val, this.cc_val_history[cc]);
      }
    }
    this.cc_val_history[cc] = val;
  }
};