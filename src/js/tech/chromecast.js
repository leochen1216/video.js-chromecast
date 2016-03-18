/**
 * @file chromecast.js
 * Chromecast Media Controller - Wrapper for HTML5 Media API
 */
import videojs from 'video.js';
import window from '../../../node_modules/global/window';

const Component = videojs.getComponent('Component');
const Tech = videojs.getComponent('Tech');

/**
 * Chromecast Media Controller - Wrapper for HTML5 Media API
 *
 * @param {Object=} options Object of option names and values
 * @param {Function=} ready Ready callback function
 * @extends Tech
 * @class Chromecast
 */

class Chromecast extends Tech {
  constructor(options, ready) {
    super(options, ready);
    this.apiMedia = this.options_.source.apiMedia;
    this.receiver = this.options_.source.receiver;

    this.apiMedia.addUpdateListener(::this.onMediaStatusUpdate);
    this.startProgressTimer();
    //if (this.selectedTrack) {
    //  this.activeTrackIds = [this.selectedTrack.trackId];
    //  this.tracksInfoRequest = new chrome.cast.media.EditTracksInfoRequest(this.activeTrackIds);
    //  media.editTracksInfo(this.tracksInfoRequest, ::this.onTrackSuccess, ::this.onTrackError);
    //}

    let mediatracks = this.apiMedia.media.tracks;
    let tracksList = this.textTracks();
    for (let i = 0; i < mediatracks.length; i++) {
      let track = mediatracks[i];
      tracksList.addTrack_(track);
    }
    this.update();
    this.triggerReady();
  }

  createEl() {
    let element;
    element = videojs.createEl('div', {
      id: this.options_.techId,
      className: 'vjs-tech vjs-tech-chromecast'
    });
    return element;
  }

  update() {
    this.el_.innerHTML = `<div class="casting-image" style="background-image: url('${this.options_.poster}')"></div><div class="casting-overlay"><div class="casting-information"><div class="casting-icon"></div><div class="casting-description"><small>${this.localize('CASTING TO')}</small><br>${this.receiver}</div></div></div>`;
  }

  incrementMediaTime() {
    if (this.apiMedia.playerState !== chrome.cast.media.PlayerState.PLAYING) {
      return;
    }
    if (this.apiMedia.currentTime) {
      this.trigger({type: 'timeupdate', target: this, manuallyTriggered: true});
    } else {
      this.clearInterval(this.timer);
    }
  }

  onMediaStatusUpdate() {
    if (!this.apiMedia) {
      return;
    }
    switch (this.apiMedia.playerState) {
      case chrome.cast.media.PlayerState.BUFFERING:
        this.trigger('waiting');
        break;
      case chrome.cast.media.PlayerState.IDLE:
        this.trigger('timeupdate');
        break;
      case chrome.cast.media.PlayerState.PAUSED:
        this.trigger('pause');
        this.paused_ = true;
        break;
      case chrome.cast.media.PlayerState.PLAYING:
        this.trigger('play');
        this.trigger('playing');
        this.paused_ = false;
        break;
    }
  }

  startProgressTimer() {
    this.clearInterval(this.timer);
    return this.timer = this.setInterval(::this.incrementMediaTime, this.timerStep);
  }

  /**
   * Set video
   *
   * @param {Object=} src Source object
   * @method setSrc
   */
  src(src) {
    if (src === undefined) {
      return this.el_.src;
    } else {
    }
  }


  onError() {
    return videojs.log('error');
  }

  play() {
    if (!this.apiMedia) {
      return;
    }
    if (this.paused_) {
      this.apiMedia.play(null, this.mediaCommandSuccessCallback.bind(this, 'Playing: ' + this.apiMedia.sessionId), ::this.onError);
    }
    return this.paused_ = false;
  }

  pause() {
    if (!this.apiMedia) {
      return;
    }
    if (!this.paused_) {
      this.apiMedia.pause(null, this.mediaCommandSuccessCallback.bind(this, 'Paused: ' + this.apiMedia.sessionId), this.onError);
      return this.paused_ = true;
    }
  }

  paused() {
    return this.paused_;
  }

  currentTime() {
    if (!this.apiMedia) {
      return 0;
    }
    return this.apiMedia.currentTime;
  }

  setCurrentTime(position) {

    if (!this.apiMedia) {
      return 0;
    }
    let request;
    request = new chrome.cast.media.SeekRequest();
    request.currentTime = position;
    //if (this.player_.controlBar.progressControl.seekBar.videoWasPlaying) {
    //  request.resumeState = chrome.cast.media.ResumeState.PLAYBACK_START;
    //}
    return this.apiMedia.seek(request, this.onSeekSuccess.bind(this, position), ::this.onError);
  }

  onSeekSuccess(position) {
    videojs.log('seek success' + position);
  }

  volume() {
    return this.volume_;
  }

  duration() {
    if (!this.apiMedia) {
      return 0;
    }
    return this.apiMedia.media.duration;
  }

  controls() {
    return false;
  }

  setVolume(level, mute = false) {
    let request;
    let volume;
    if (!this.apiMedia) {
      return;
    }
    volume = new chrome.cast.Volume();
    volume.level = level;
    volume.muted = mute;
    this.volume_ = volume.level;
    this.muted_ = mute;
    request = new chrome.cast.media.VolumeRequest();
    request.volume = volume;
    this.apiMedia.setVolume(request, this.mediaCommandSuccessCallback.bind(this, 'Volume changed'), ::this.onError);
    return this.trigger('volumechange');
  }

  mediaCommandSuccessCallback(information, event) {
    return videojs.log(information);
  }


  muted() {
    return this.muted_;
  }

  setMuted(muted) {
    return this.setVolume(this.volume_, muted);
  }

  supportsFullScreen() {
    return false;
  }


  resetSrc_(callback) {
    // In Chrome, MediaKeys can NOT be changed when a src is loaded in the video element
    // Dash.js has a bug where it doesn't correctly reset the data so we do it manually
    // The order of these two lines is important. The video element's src must be reset
    // to allow `mediaKeys` to changed otherwise a DOMException is thrown.
    if (this.el()) {
      this.el().src = '';
      if (this.el().setMediaKeys) {
        this.el().setMediaKeys(null).then(callback, callback);
      } else {
        callback();
      }
    }
  }

  dispose() {
    if (this.mediaPlayer_) {
      this.mediaPlayer_.reset();
    }
    this.resetSrc_(Function.prototype);
    super.dispose(this);
  }

}

Chromecast.prototype.paused_ = false;

Chromecast.prototype.options_ = {};

Chromecast.prototype.timerStep = 1000;

/* Dash Support Testing -------------------------------------------------------- */

Chromecast.isSupported = function () {
  return Html5.isSupported() && !!window.MediaSource;
}
;

// Add Source Handler pattern functions to this tech
Tech.withSourceHandlers(Chromecast);

/*
 * The default native source handler.
 * This simply passes the source to the video element. Nothing fancy.
 *
 * @param  {Object} source   The source object
 * @param  {Flash} tech  The instance of the Flash tech
 */
Chromecast.nativeSourceHandler = {};

/**
 * Check if Flash can play the given videotype
 * @param  {String} type    The mimetype to check
 * @return {String}         'probably', 'maybe', or '' (empty string)
 */
Chromecast.nativeSourceHandler.canPlayType = function (source) {

  const dashTypeRE = /^application\/(?:dash\+xml|(x-|vnd\.apple\.)mpegurl)/i;
  const dashExtRE = /^video\/(mpd|mp4|webm|m3u8)/i;

  if (dashTypeRE.test(source)) {
    return 'probably';
  } else if (dashExtRE.test(source)) {
    return 'maybe';
  } else {
    return '';
  }

};

/*
 * Check Flash can handle the source natively
 *
 * @param  {Object} source  The source object
 * @return {String}         'probably', 'maybe', or '' (empty string)
 */
Chromecast.nativeSourceHandler.canHandleSource = function (source) {

  // If a type was provided we should rely on that
  if (source.type) {
    return Chromecast.nativeSourceHandler.canPlayType(source.type);
  } else if (source.src) {
    return Chromecast.nativeSourceHandler.canPlayType(source.src);
  }

  return '';
};

/*
 * Pass the source to the flash object
 * Adaptive source handlers will have more complicated workflows before passing
 * video data to the video element
 *
 * @param  {Object} source    The source object
 * @param  {Flash} tech   The instance of the Flash tech
 */
Chromecast.nativeSourceHandler.handleSource = function (source, tech) {
  tech.src(source.src);
};

/*
 * Clean up the source handler when disposing the player or switching sources..
 * (no cleanup is needed when supporting the format natively)
 */
Chromecast.nativeSourceHandler.dispose = function () {
};

// Register the native source handler
Chromecast.registerSourceHandler(Chromecast.nativeSourceHandler);


/*
 * Set the tech's volume control support status
 *
 * @type {Boolean}
 */
Chromecast.prototype['featuresVolumeControl'] = true;

/*
 * Set the tech's playbackRate support status
 *
 * @type {Boolean}
 */
Chromecast.prototype['featuresPlaybackRate'] = false;

/*
 * Set the tech's status on moving the video element.
 * In iOS, if you move a video element in the DOM, it breaks video playback.
 *
 * @type {Boolean}
 */
Chromecast.prototype['movingMediaElementInDOM'] = false;

/*
 * Set the the tech's fullscreen resize support status.
 * HTML video is able to automatically resize when going to fullscreen.
 * (No longer appears to be used. Can probably be removed.)
 */
Chromecast.prototype['featuresFullscreenResize'] = false;

/*
 * Set the tech's progress event support status
 * (this disables the manual progress events of the Tech)
 */
Chromecast.prototype['featuresProgressEvents'] = true;

/*
 * Sets the tech's status on native text track support
 *
 * @type {Boolean}
 */
Chromecast.prototype['featuresNativeTextTracks'] = true;

/*
 * Sets the tech's status on native audio track support
 *
 * @type {Boolean}
 */
Chromecast.prototype['featuresNativeAudioTracks'] = true;

/*
 * Sets the tech's status on native video track support
 *
 * @type {Boolean}
 */
Chromecast.prototype['featuresNativeVideoTracks'] = false;


Chromecast.prototype['featuresTimeupdateEvents'] = false;


videojs.options.chromecast = {};

Component.registerComponent('Chromecast', Chromecast);
Tech.registerTech('Chromecast', Chromecast);
export default Chromecast;