// Pages
// A page is a set of mappings of MIDI CCs to bitwig controls,
// or MIDI CCs to callbacks

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
//                 Controller.setEnabled(false) was called
//    },
//    .....
//  ]
// }
//
// See the presets below for examples

// TODO give pages a callback to decide whether they are active
//      depending on the current instrument, current view, etc

// Presets
// don't edit these, but instead edit the variable 'channelPages'
// in the .control.js file. They are functions that return pages.
//
// you can of course create your own, directly in the .control.js file

var Mappings = {};

// each page handles a subset of device knobs
Mappings.device = {
  macros: function (ccs) {
    return {
      on: ccs,
      control: function (chan, idx) {
        return views.cursorDevice.getMacro(idx).getAmount();
      }
    };
  },
  parameters: function (ccs) {
    return {
      on: ccs,
      control: function (chan, idx) {
        return views.cursorDevice.getParameter(idx);
      }
    };
  },
  commonParameters: function (ccs) {
    return {
      on: ccs,
      control: function (chan, idx) {
        return views.cursorDevice.getCommonParameter(idx);
      }
    };
  },
  envelopeParameters: function (ccs) {
    return {
      on: ccs,
      control: function (chan, idx) {
        views.cursorDevice.setParameterPage(0);
        return views.cursorDevice.getEnvelopeParameter(idx);
      }
    };
  }
};

Mappings.track = {
  volume: function (ccs) {
    return {
      on: ccs,
      control: function (chan, idx) {
        return views.cursorTrack.getVolume();
      }
    };
  },
  pan: function (ccs) {
    return {
      on: ccs,
      control: function (chan, idx) {
        return views.cursorTrack.getPan();
      }
    };
  },
};

Mappings.mixer = {
  volumes: function (ccs) {
    return {
      on: ccs,
      control: function (chan, idx) {
        return views.trackBank.getTrack(idx).getVolume();
      }
    };
  },
  pans: function (ccs) {
    return {
      on: ccs,
      control: function (chan, idx) {
        return views.trackBank.getTrack(idx).getPan();
      }
    };
  }
};

Mappings.masterTrack = {
  volume: function (ccs) {
    return {
      on: ccs,
      control: function (chan, idx) {
        return views.masterTrack.getVolume();
      }
    };
  },
  pan: function (ccs) {
    return {
      on: ccs,
      control: function (chan, idx) {
        return views.masterTrack.getPan();
      }
    };
  },
};

Mappings.transport = {
  play: function (target_cc) {
    return {
      on: target_cc,
      always: true,
      callback: function (idx, chan, cc, val, prevVal) {
        if (isPress(val)) views.transport.play();
      }
    };
  },
  stop: function (target_cc) {
    return {
      on: target_cc,
      always: true,
      callback: function (idx, chan, cc, val, prevVal) {
        if (isPress(val)) views.transport.stop();
      }
    };
  },
  loop: function (target_cc) {
    return {
      on: target_cc,
      always: true,
      callback: function (idx, chan, cc, val, prevVal) {
        if (isPress(val)) views.transport.toggleLoop();
      }
    };
  },
  record: function (target_cc) {
    return {
      on: target_cc,
      always: true,
      callback: function (idx, chan, cc, val, prevVal) {
        if (isPress(val)) {
          views.cursorTrack.getArm().set(true);
          views.transport.record();
        }
      }
    };
  }
};

Mappings.pageToggles = {
  pressToAdvance: function (target_cc, offset) {
    return {
      on: target_cc,
      always: true, // call even when controls are disabled!
      callback: function (idx, chan, cc, val, prevVal) {
        if (isPress(val)) {
          // if channel has changed then the page is already switched
          if (chan == views.controller.channelHistory) {
            var idx = views.controller.currentPageIdx[chan] + offset;
            views.controller.selectPage(chan, idx);
          }
          views.controller.setEnabled(false);
        } else {
          views.controller.setEnabled(true);
        }
      }
    };
  }
};

