function Page(pageDesc, chan) {
  this.name = pageDesc.name;
  this.channel = chan;
  this.ccMap = {};
  this.ccCallback = {};
  this.ccAlways = {}; // CCs that trigger even when controls are disabled
  this.indicateCtrls = [];

  for (var m in pageDesc.mappings) {
    var ccOffset = 0;
    m = pageDesc.mappings[m];
    if (m.onNote) {
      // add an offset to notes to not clash with CCs
      m.on = m.onNote;
      ccOffset = NUM_CC;
    } else if (!m.on) {
      continue;
    }
    if (!(m.on instanceof Array)) {
      m.on = [m.on];
    }
    for (var o in m.on) {
      var cc = m.on[o] + ccOffset;
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

function Controller(globalMappings, channelPages) {
  // setup state
  this.enabled = false;
  var globalpageDesc = {name: 'Global', mappings: globalMappings};
  this.globalPage = new Page(globalpageDesc, 0);
  this.channelPages = new Array(16);
  this.currentPageIdx = new Array(16);
  for (var i = 0; i < this.currentPageIdx.length; i++)
    this.currentPageIdx[i] = 0;
  this.currentPage = null;
  this.ccValHistory = {};
  this.channelHistory = 0;

  // various bits of bitwig state, updated through observers (below)
  this.bitwigState = {};

  // create user controls
  this.userControls = host.createUserControls(NUM_CC*16);

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

  // current mode
  self.bitwigState.currentMode = undefined;
  views.application.addSelectedModeObserver(function (mode) {
    self.bitwigState.currentMode = mode;
  }, 100, "Unknown");

  // clip selection history
  self.bitwigState.trackSelectedClip = {};
  for (var t = 0; t < TRACKBANK_TRACKS; t++) {
    var clips = views.trackBank.getTrack(t).getClipLauncherSlots();
    clips.addIsSelectedObserver(function (i, sel) {
      if (sel) self.bitwigState.trackSelectedClip[t] = i;
    });
  }

  // and finally, register the pages
  for (var chan in channelPages)
    for (var p in channelPages[chan])
      this.registerPage(chan, channelPages[chan][p]);

  this.selectPage(0, 0);
}

Controller.prototype.registerPage = function (chan, pageDesc) {
  if (!this.channelPages[chan]) this.channelPages[chan] = [];
  var page = new Page(pageDesc, chan);
  this.channelPages[chan].push(page);
};

Controller.prototype.setEnabled = function (val, chan) {
  if (this.enabled != val) {
    this.enabled = val;
    this.indicateGUI(val, chan);
  }
};

Controller.prototype.selectPage = function (chan, idx, silent) {
  this.setEnabled(false, this.channelHistory);

  var pages = this.channelPages[chan];
  if (pages) {
    idx %= pages.length;
    if (idx < 0) idx += pages.length;
    this.currentPageIdx[chan] = idx;
    this.currentPage = pages[idx];
  } else {
    this.currentPage = null;
  }
  this.setEnabled(true, chan);

  if (!silent) {
    var msg = "Ch" + (chan+1);
    if (this.currentPage)
      msg += ": " + this.currentPage.name;
    host.showPopupNotification(msg);
  }
};

Controller.prototype.selectNext = function (chan) {
  if (!chan) chan = this.currentPage.channel;
  if (this.currentPage && chan != this.currentPage.channel)
    this.selectPage(chan, this.currentPageIdx[chan]);
  else
    this.selectPage(chan, this.currentPageIdx[chan]+1);

};

Controller.prototype.selectPrev = function (chan) {
  if (!chan) chan = this.currentPage.channel;
  if (chan != this.currentPage.channel)
      this.selectPage(chan, this.currentPageIdx[chan]);
  else
    this.selectPage(chan, this.currentPageIdx[chan]-1);
};

Controller.prototype.indicateGUI = function (val, chan) {
  if (chan === undefined) chan = this.channelHistory;

  // indicate user controls
  for (var cc = LOWEST_CC; cc <= HIGHEST_CC; cc++) {
    this.getUserControl(chan, cc).setIndication(val);
  }

  if (this.currentPage) {
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

Controller.prototype.getUserControl = function (channel, cc) {
  return this.userControls.getControl((cc - LOWEST_CC) + channel * NUM_CC);
};

Controller.prototype.setUserControlVal = function (channel, cc, val) {
  this.getUserControl(channel, cc).set(val, MIDI_MAX_VAL);
};

Controller.prototype.performAction = function (page, chan, cc, val, prevVal) {
  if (this.enabled || page.ccAlways[cc]) {
    var ctrl = page.ccMap[cc];
    // if it's a mapped ctrl, change it
    if (ctrl) {
      if (ctrl[1]) { // absolute control
        ctrl[0].set(val, MIDI_MAX_VAL);
      } else { // relative control
        //FIXME is this responsie enough??
        // this misses the first midi message (as there's no history)
        if (prevVal)
          ctrl[0].inc(val-prevVal, MIDI_MAX_VAL);
      }
      return true;
    }
    // if there's a callback, call it
    ctrl = page.ccCallback[cc];
    if (ctrl) {
      ctrl[0](ctrl[1], chan, cc, val, prevVal);
    }
  }
  return false;
};

Controller.prototype.onMidi = function (status, data1, data2) {
  var chan = status & 0xF, cc = data1, val = data2;
  var prevVal;
  var found_action = false;

  //printMidi(status, data1, data2);

  // if this is a channel control message, not a note
  if ((status & 0xF0) == 0xB0) {
    prevVal = this.ccValHistory[cc];
    if (this.currentPage && this.currentPage.channel == chan) {
      found_action = this.performAction(this.currentPage, chan, cc, val, prevVal);
    } else if (this.channelPages[chan]) {
      this.selectPage(chan, this.currentPageIdx[chan]);
      return this.onMidi(status, data1, data2);
    } else if (this.channelHistory != chan) {
      // no pages in this channel
      this.selectPage(chan, 0);
    }
    if (!found_action) {
      // this is a page-less channel or an un-mapped cc in this page
      // check for and try to perform globally mapped action
      if (!this.performAction(this.globalPage, chan, cc, val, prevVal)) {
        // otherwise map to a user-control
        this.setUserControlVal(chan, cc, val);
      }
    }
    // save history
    this.channelHistory = chan;
    this.ccHistory = cc;
  } else if (this.channelPages[chan]) {
    // only controller messages affect channel and current page
    // otherwise we perform the action and pass the current channel
    // to the callback
    var page = this.channelPages[chan][this.currentPageIdx[chan]];
    var noteOn = ((status & 0xF0) == 0x90);
    cc += NUM_CC;
    prevVal = this.ccValHistory[cc];
    if (!this.performAction(page, this.channelHistory, cc, val, prevVal, noteOn))
      views.noteIn.sendRawMidiEvent(status, data1, data2);
  }

  this.ccValHistory[cc] = val;
};