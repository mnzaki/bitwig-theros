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

// map each channel to a set of pages.
// channels left empty will be free to be mapped live
var channelPages = new Array(16);

channelPages[0] = [
  { name: 'Device - Macros',
    mappings: [Mappings.device.macros(controls.knobs)]},
  { name: 'Device - Parameters',
    mappings: [Mappings.device.parameters(controls.knobs)]},
  { name: 'Device - Common Parameters',
    mappings: [Mappings.device.commonParameters(controls.knobs)]},
  { name: 'Device - Envelope Parameters',
    mappings: [Mappings.device.envelopeParameters(controls.knobs)]}
];

channelPages[1] = [
  { name: 'Mixer - Volume',
    mappings: [Mappings.mixer.volume(controls.knobs)]},
  { name: 'Mixer - Pan',
    mappings: [Mappings.mixer.pan(controls.knobs)]}
];

// Global Mappings are active across channels
// if mapped in a page, the page takes precedence
var globalMappings = [
  Mappings.pageToggles.pressToAdvance(controls.c10, 1),
  Mappings.transport.play(controls.play),
  Mappings.transport.stop(controls.stop),
  Mappings.transport.record(controls.rec),
  Mappings.transport.loop(controls.loop)
];