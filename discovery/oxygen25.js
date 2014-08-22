// Oxygen25 discovery code courtesy of Martin Wood-Mitrovski (https://github.com/Normalised/bitwig-control-scripts)

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
