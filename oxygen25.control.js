load('lib/theros.js');

// Device discovery
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
      return views.cursorDevice.getMacro(idx).getAmount();
    }
  }]
},
{
  name: 'Device - Parameters',
  mappings:
  [{
    on: controls.knobs,
    control: function (chan, idx) {
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
      views.cursorDevice.setParameterPage(0);
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
  callback: function (idx, chan, cc, val, prevVal) {
    if (val > 0) {
      views.controlPages.setEnabled(false);
    } else {
      // always select prev channel, because channel has
      // already changed by this point (key release)
      chan = views.controlPages.channelHistory;
      var page_idx = views.controlPages.currentPageIdx[chan]
      views.controlPages.selectPage(chan, page_idx, true);
    }
  }
},
{
  on: controls.play,
  always: true,
  callback: function (idx, chan, cc, val, prevVal) {
    if (val > 0) views.transport.play();
  }
},
{
  on: controls.stop,
  always: true,
  callback: function (idx, chan, cc, val, prevVal) {
    if (val > 0) views.transport.stop();
  }
},
{
  on: controls.loop,
  always: true,
  callback: function (idx, chan, cc, val, prevVal) {
    if (val > 0) views.transport.toggleLoop();
  }
},
{
  on: controls.rec,
  always: true,
  callback: function (idx, chan, cc, val, prevVal) {
    if (val > 0) {
      views.cursorTrack.getArm().set(true);
      views.transport.record();
    }
  }
}];