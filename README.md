# Theros
Theros is a bitwig controller script framework for The Rest Of uS.
It is designed from the ground up for flexibility and ease of customization.

### A Taste of Theros
Like most controller scripts, the basic idea behind Theros is to give you several
`pages` of Bitwig controls. Each [MIDI channel](http://github.com/mnzaki/bitwig-theros/wiki/faq#midi) contains a
set of `pages` and each `page` is a set of mappings from physical controls
([MIDI CC](http://github.com/mnzaki/bitwig-theros/wiki/faq#midi) messages) to
Bitwig parameters and values.

An example excerpt from a controller script:
```javascript
load('lib/theros.js');
load('discovery/oxygen25.js')
// control CCs
var controls = {
  knobs: [71, 72, 73, 74, 75, 76, 77, 78],
  slider: 7
};

var track_vol = Mappable.track.volume.to(controls.slider);
channelPages[0] = [
  { name: 'Device - Macros',
    mappings: [Mappable.device.macros.to(controls.knobs), track_vol]},
  { name: 'Device - Parameters',
    mappings: [Mappable.device.parameters.to(controls.knobs), track_vol]},
  { name: 'Device - Common Parameters',
    mappings: [Mappable.device.commonParameters.to(controls.knobs), track_vol]},
  { name: 'Device - Envelope Parameters',
    mappings: [Mappable.device.envelopeParameters.to(controls.knobs), track_vol]}
];
```
This creates 4 pages on channel 0, with fairly self explanatory purpose. Channels
left empty can be freely mapped live by using the 'Learn Controller Assignment'
feature of Bitwig. Note that mappings can also be overridden live in the same way.

There is a [full list of mappables](http://github.com/mnzaki/bitwig-theros/wiki/list-of-mappables)
and you can also [write your own](http://github.com/mnzaki/bitwig-theros/wiki/creating-mappings)
of course!

### Getting Theros
1. Download the zip file from [here](http://github.com/mnzaki/bitwig-theros/archive/master.zip)
2. Unzip it in your controller scripts directory ([where?](http://github.com/mnzaki/bitwig-theros/wiki/faq#controllers-dir))
   and keep the top-level `bitwig-theros` directory!
3. Copy one of the scripts inside the `bitwig-theros/controllers` directory to the
   top-level directory (`bitwig-theros/`) and rename it form `*.script.js` to `*.control.js`

Or make your own controller mappings by reading the [wiki](http://github.com/mnzaki/bitwig-theros/wiki)
and looking at the available scripts for inspiration.
