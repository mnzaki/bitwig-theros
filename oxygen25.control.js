load('lib/theros.js');
load('discovery/oxygen25.js');


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

var track_vol = Mappings.track.volume(controls.slider);
channelPages[0] = [
  { name: 'Device - Macros',
    mappings: [Mappings.device.macros(controls.knobs), track_vol]},
  { name: 'Device - Parameters',
    mappings: [Mappings.device.parameters(controls.knobs), track_vol]},
  { name: 'Device - Common Parameters',
    mappings: [Mappings.device.commonParameters(controls.knobs), track_vol]},
  { name: 'Device - Envelope Parameters',
    mappings: [Mappings.device.envelopeParameters(controls.knobs), track_vol]}
];

channelPages[1] = [
  { name: 'Mixer - Volume',
    mappings: [Mappings.mixer.volumes(controls.knobs),
               Mappings.masterTrack.volume(controls.slider)]},
  { name: 'Mixer - Pan',
    mappings: [Mappings.mixer.pans(controls.knobs),
               Mappings.masterTrack.pan(controls.slider)]}
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
