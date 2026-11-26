/**
 * mux.js
 *
 * Copyright (c) Brightcove
 *
 *
 * Accepts program elementary stream (PES) data events and corrects
 * decode and presentation time stamps to account for a rollover
 * of the 33 bit value.
 */

'use strict';

var Stream = require('../utils/stream');

var MAX_TS = 8589934592;

var RO_THRESH = 4294967296;

var TYPE_SHARED = 'shared';

var handleRollover = function(value, reference) {
  var direction = 1;

  if (value > reference) {
    direction = -1;
  }

  while (Math.abs(reference - value) > RO_THRESH) {
    value += (direction * MAX_TS);
  }

  return value;
};

var TimestampRolloverStream = function(type) {
  var lastDTS, referenceDTS;

  TimestampRolloverStream.prototype.init.call(this);

  // The "shared" type is used in cases where a stream will contain muxed
  // video and audio. We could use `undefined` here, but having a string
  // makes debugging a little clearer.
  this.type_ = type || TYPE_SHARED;

  this.push = function(data) {
    /**
     * Rollover stream expects data from elementary stream.
     * Elementary stream can push forward 2 types of data
     * - Parsed Video/Audio/Timed-metadata PES (packetized elementary stream) packets
     * - Tracks metadata from PMT (Program Map Table)
     * Rollover stream expects pts/dts info to be available, since it stores lastDTS
     * We should ignore non-PES packets since they may override lastDTS to undefined.
     * lastDTS is important to signal the next segments
     * about rollover from the previous segments.
     */
    if (data.type === 'metadata') {
      this.trigger('data', data);
      return;
    }

    // Any "shared" rollover streams will accept _all_ data. Otherwise,
    // streams will only accept data that matches their type.
    if (this.type_ !== TYPE_SHARED && data.type !== this.type_) {
      return;
    }

    if (referenceDTS === undefined) {
      referenceDTS = data.dts;
    }

    data.dts = handleRollover(data.dts, referenceDTS);
    data.pts = handleRollover(data.pts, referenceDTS);

    lastDTS = data.dts;

    this.trigger('data', data);
  };

  this.flush = function() {
    referenceDTS = lastDTS;
    this.trigger('done');
  };

  this.endTimeline = function() {
    this.flush();
    this.trigger('endedtimeline');
  };

  this.discontinuity = function() {
    referenceDTS = void 0;
    lastDTS = void 0;
  };

  this.reset = function() {
    this.discontinuity();
    this.trigger('reset');
  };
};

TimestampRolloverStream.prototype = new Stream();

module.exports = {
  TimestampRolloverStream: TimestampRolloverStream,
  handleRollover: handleRollover
};
