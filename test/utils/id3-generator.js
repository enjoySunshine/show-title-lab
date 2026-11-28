/**
 * Helper functions for creating ID3 metadata.
 */

'use strict';

var stringToInts, stringToCString, stringToUtf8Ints, id3Tag, id3Frame, syncSafeInteger,
    id3v23TagWithExtendedHeader, id3v24Tag;

stringToInts = function(string) {
  var result = [], i;
  for (i = 0; i < string.length; i++) {
    result[i] = string.charCodeAt(i);
  }
  return result;
};

stringToCString = function(string) {
  return stringToInts(string).concat([0x00]);
};

// encode a string as an array of UTF-8 bytes (text encoding byte 3 in ID3)
stringToUtf8Ints = function(string) {
  var encoded = encodeURIComponent(string),
    result = [],
    i;

  for (i = 0; i < encoded.length; i++) {
    if (encoded[i] === '%') {
      result.push(parseInt(encoded.substr(i + 1, 2), 16));
      i += 2;
    } else {
      result.push(encoded.charCodeAt(i));
    }
  }
  return result;
};

id3Tag = function() {
  var
    frames = Array.prototype.concat.apply([], Array.prototype.slice.call(arguments)),
    result = stringToInts('ID3').concat([
      0x03, 0x00,            // version 3.0 of ID3v2 (aka ID3v.2.3.0)
      0x40,                  // flags. include an extended header
      0x00, 0x00, 0x00, 0x00, // size. set later

      // extended header
      0x00, 0x00, 0x00, 0x06, // extended header size. no CRC
      0x00, 0x00,             // extended flags
      0x00, 0x00, 0x00, 0x02  // size of padding
    ], frames),
    size;

  // size is stored as a sequence of four 7-bit integers with the
  // high bit of each byte set to zero
  size = result.length - 10;

  result[6] = (size >>> 21) & 0x7f;
  result[7] = (size >>> 14) & 0x7f;
  result[8] = (size >>> 7) & 0x7f;
  result[9] = size & 0x7f;

  return result;
};

id3Frame = function(type) {
  var result = stringToInts(type).concat([
    0x00, 0x00, 0x00, 0x00, // size
    0xe0, 0x00 // flags. tag/file alter preservation, read-only
  ]),
      size = result.length - 10;

  // append the fields of the ID3 frame
  result = result.concat.apply(result, Array.prototype.slice.call(arguments, 1));

  // set the size
  size = result.length - 10;

  result[4] = (size >>> 21) & 0x7f;
  result[5] = (size >>> 14) & 0x7f;
  result[6] = (size >>> 7) & 0x7f;
  result[7] = size & 0x7f;

  return result;
};

// encode a non-negative integer as four 7-bit (synchsafe) bytes
syncSafeInteger = function(size) {
  return [
    (size >>> 21) & 0x7f,
    (size >>> 14) & 0x7f,
    (size >>> 7) & 0x7f,
    size & 0x7f
  ];
};

// Build an ID3v2.3 tag with an extended header.
// Layout matches id3Tag above: the extended header size field is 6 and it is
// followed by six bytes (two flag bytes and a four byte padding size).
id3v23TagWithExtendedHeader = function() {
  var
    frames = Array.prototype.concat.apply([], Array.prototype.slice.call(arguments)),
    result = stringToInts('ID3').concat([
      0x03, 0x00,            // version 3.0 of ID3v2 (aka ID3v.2.3.0)
      0x40,                  // flags. include an extended header
      0x00, 0x00, 0x00, 0x00, // size. set later

      // extended header
      0x00, 0x00, 0x00, 0x06, // extended header size
      0x00, 0x00,             // extended flags
      0x00, 0x00, 0x00, 0x00  // size of padding
    ], frames),
    size = result.length - 10;

  result[6] = (size >>> 21) & 0x7f;
  result[7] = (size >>> 14) & 0x7f;
  result[8] = (size >>> 7) & 0x7f;
  result[9] = size & 0x7f;

  return result;
};

// Build an ID3v2.4 tag. `extendedHeaderBytes` are the bytes that follow the
// ten byte tag header and make up the extended header; omit them for a tag
// without an extended header.
id3v24Tag = function(extendedHeaderBytes) {
  var
    // extendedHeaderBytes is always the first argument; pass null for a tag
    // without an extended header. Everything after it is frame data.
    frameArguments = Array.prototype.slice.call(arguments, 1),
    frames = Array.prototype.concat.apply([], frameArguments),
    hasExtendedHeader = !!extendedHeaderBytes,
    result = stringToInts('ID3').concat([
      0x04, 0x00,            // version 4.0 of ID3v2 (aka ID3v2.4.0)
      hasExtendedHeader ? 0x40 : 0x00, // flags
      0x00, 0x00, 0x00, 0x00 // size. set later
    ], hasExtendedHeader ? extendedHeaderBytes : [], frames),
    size = result.length - 10;

  result[6] = (size >>> 21) & 0x7f;
  result[7] = (size >>> 14) & 0x7f;
  result[8] = (size >>> 7) & 0x7f;
  result[9] = size & 0x7f;

  return result;
};

module.exports = {
  stringToInts: stringToInts,
  stringToCString: stringToCString,
  stringToUtf8Ints: stringToUtf8Ints,
  id3Tag: id3Tag,
  id3Frame: id3Frame,
  syncSafeInteger: syncSafeInteger,
  id3v23TagWithExtendedHeader: id3v23TagWithExtendedHeader,
  id3v24Tag: id3v24Tag
};
