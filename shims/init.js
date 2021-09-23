/*
 * decaffeinate suggestions:
 * DS102: Remove unnecessary code created because of implicit returns
 * Full docs: https://github.com/decaffeinate/decaffeinate/blob/master/docs/suggestions.md
 */
const RSVP = require('rsvp');

module.exports = {
  extended(PSD) {
    this.fromURL = url => new RSVP.Promise(function(resolve, reject) {
      const xhr = new XMLHttpRequest();
      xhr.open("GET", url, true);
      xhr.responseType = "arraybuffer";
      xhr.onload = function() {
        const data = new Uint8Array(xhr.response || xhr.mozResponseArrayBuffer);
        const psd = new PSD(data);
        psd.parse();

        return resolve(psd);
      };

      return xhr.send(null);
    });

    this.fromEvent = e => new RSVP.Promise(function(resolve, reject) {
      const file = e.dataTransfer.files[0];
      const reader = new FileReader();
      reader.onload = function(e) {
        const psd = new PSD(new Uint8Array(e.target.result));
        psd.parse();

        return resolve(psd);
      };

      reader.onerror = reject;
      return reader.readAsArrayBuffer(file);
    });

    return this.fromDroppedFile = file => new RSVP.Promise(function(resolve, reject) {
      const reader = new FileReader();
      reader.onload = function(e) {
        const psd = new PSD(new Uint8Array(e.target.result));
        psd.parse();

        return resolve(psd);
      };

      reader.onerror = reject;
      return reader.readAsArrayBuffer(file);
    });
  }
};
