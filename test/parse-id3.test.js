'use strict';

var
  QUnit = require('qunit'),
  id3 = require('../lib/tools/parse-id3.js'),
  id3Generator = require('./utils/id3-generator'),
  stringToUtf8Ints = id3Generator.stringToUtf8Ints,
  id3Frame = id3Generator.id3Frame,
  syncSafeInteger = id3Generator.syncSafeInteger,
  id3v23TagWithExtendedHeader = id3Generator.id3v23TagWithExtendedHeader,
  id3v24Tag = id3Generator.id3v24Tag;

// a TIT2 frame carrying a UTF-8 (encoding byte 3) title
function tit2Frame(title) {
  return id3Frame('TIT2', [0x03].concat(stringToUtf8Ints(title)));
}

// ID3v2.4 extended header as written by the encoder from the bug report:
// the size field claims 6 (synchsafe) but only two header bytes follow
var malformedV24ExtendedHeader = [
  0x00, 0x00, 0x00, 0x06, // extended header size
  0x01,                   // one flag byte follows
  0x00                    // no flags set
];

// a spec-conformant minimal ID3v2.4 extended header, size 2
var minimalV24ExtendedHeader = [
  0x00, 0x00, 0x00, 0x02,
  0x01,
  0x00
];

QUnit.module('parseId3Frames extended headers');

QUnit.test('parses TIT2 from an ID3v2.4 tag with a size-6 extended header', function(assert) {
  var tag = new Uint8Array(id3v24Tag(malformedV24ExtendedHeader, tit2Frame('夜场')));
  var frames = id3.parseId3Frames(tag);

  assert.equal(frames.length, 1, 'parsed one frame');
  assert.equal(frames[0].key, 'TIT2', 'parsed the TIT2 frame');
  assert.equal(frames[0].value, '夜场', 'title is 夜场, not empty');
});

QUnit.test('parses a different title from the same ID3v2.4 layout', function(assert) {
  var tag = new Uint8Array(id3v24Tag(malformedV24ExtendedHeader, tit2Frame('返场')));
  var frames = id3.parseId3Frames(tag);

  assert.equal(frames[0].key, 'TIT2', 'parsed the TIT2 frame');
  assert.equal(frames[0].value, '返场', 'title is 返场');
});

QUnit.test('still parses TIT2 from an ID3v2.3 tag with an extended header', function(assert) {
  var tag = new Uint8Array(id3v23TagWithExtendedHeader(tit2Frame('夜场')));
  var frames = id3.parseId3Frames(tag);

  assert.equal(frames.length, 1, 'parsed one frame');
  assert.equal(frames[0].key, 'TIT2', 'parsed the TIT2 frame');
  assert.equal(frames[0].value, '夜场', 'title stays 夜场');
});

QUnit.test('still parses TIT2 from an ID3v2.4 tag without an extended header', function(assert) {
  var tag = new Uint8Array(id3v24Tag(null, tit2Frame('返场')));
  var frames = id3.parseId3Frames(tag);

  assert.equal(frames.length, 1, 'parsed one frame');
  assert.equal(frames[0].key, 'TIT2', 'parsed the TIT2 frame');
  assert.equal(frames[0].value, '返场', 'title stays 返场');
});

QUnit.test('walks ID3v2.4 extended header flags instead of trusting the size', function(assert) {
  var crcHeader = [
    0x00, 0x00, 0x00, 0x0b, // size
    0x01, 0x20,             // one flag byte: CRC data present
    0x00, 0x00, 0x00, 0x05, // five CRC bytes follow
    0x01, 0x02, 0x03, 0x04, 0x05
  ];
  var restrictionsHeader = [
    0x00, 0x00, 0x00, 0x07,
    0x01, 0x10,             // tag restrictions flag
    0x00, 0x00, 0x00, 0x01,
    0x00
  ];
  var updateHeader = [
    0x00, 0x00, 0x00, 0x06,
    0x01, 0x40,             // tag is an update flag, no data
    0x00, 0x00, 0x00, 0x00
  ];
  var twoFlagsHeader = [
    0x00, 0x00, 0x00, 0x0b,
    0x02, 0x40, 0x10,       // update flag followed by restrictions flag
    0x00, 0x00, 0x00, 0x00,
    0x00, 0x00, 0x00, 0x01,
    0x00
  ];

  [
    ['spec minimal header', minimalV24ExtendedHeader],
    ['crc header', crcHeader],
    ['restrictions header', restrictionsHeader],
    ['update header', updateHeader],
    ['two flags header', twoFlagsHeader]
  ].forEach(function(candidate) {
    var tag = new Uint8Array(id3v24Tag(candidate[1], tit2Frame('夜场')));
    var frames = id3.parseId3Frames(tag);

    assert.equal(frames.length, 1, candidate[0] + ': parsed one frame');
    assert.equal(frames[0].key, 'TIT2', candidate[0] + ': parsed TIT2');
    assert.equal(frames[0].value, '夜场', candidate[0] + ': title is 夜场');
  });
});

QUnit.test('parseExtendedHeader reports the frame start for both versions', function(assert) {
  var v24 = new Uint8Array(id3v24Tag(malformedV24ExtendedHeader, tit2Frame('夜场')));
  var v23 = new Uint8Array(id3v23TagWithExtendedHeader(tit2Frame('夜场')));

  // 10 byte tag header + 6 actual extended header bytes
  assert.equal(id3.parseExtendedHeader(v24).frameStart, 16, '2.4 frame start');
  assert.equal(id3.parseExtendedHeader(v24).paddingSize, 0, '2.4 has no padding field');

  // historical 2.3 behavior: 10 + 4 size bytes + declared size of 6
  assert.equal(id3.parseExtendedHeader(v23).frameStart, 20, '2.3 frame start');
});

QUnit.test('parseSyncSafeInteger decodes the four 7-bit bytes', function(assert) {
  assert.equal(id3.parseSyncSafeInteger(new Uint8Array([0, 0, 0, 0x06])), 6,
    'synchsafe 6 reads as 6');
  // round trip a larger value through the test helper
  assert.equal(id3.parseSyncSafeInteger(new Uint8Array(syncSafeInteger(0x123456))),
    0x123456, 'round trips a multi-byte synchsafe integer');
});
