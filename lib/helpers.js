// MIDI value semantics

// for buttons, the button down value is > 0, the button up value is 0
function isPress(val) {
  return val > 0;
}

function isRelease(val) {
  return val == 0;
}

var doublePressTimeStamp = 0;
var nextIsDoubleRelease = {};
function isDoublePress(maxIntervalMs, cc, val) {
  var now = new Date().getTime();
  if (views.controller.ccHistory == cc && val > 0 &&
      (now - doublePressTimeStamp) <= maxIntervalMs) {
    return true;
  }
  doublePressTimeStamp = now;
  return false;
}

function isDoubleRelease(maxIntervalMs, cc, val) {
  var now = new Date().getTime();
  if (views.controller.ccHistory == cc && val > 0 &&
      (now - doublePressTimeStamp) <= maxIntervalMs) {
    // this was a double press, next release is a double release
    nextIsDoubleRelease[cc] = true;
    return false;
  } else if (val == 0 && nextIsDoubleRelease[cc]) {
    // this is a double release
    nextIsDoubleRelease[cc] = false;
    return true;
  }
  return false;
}
