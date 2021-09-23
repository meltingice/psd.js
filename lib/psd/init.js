/*
 * decaffeinate suggestions:
 * DS102: Remove unnecessary code created because of implicit returns
 * Full docs: https://github.com/decaffeinate/decaffeinate/blob/master/docs/suggestions.md
 */
const fs = require('fs');
const RSVP = require('rsvp');

// The init methods for the NodeJS version of PSD.js. When compiled for
// the web, browserify will overwrite this file with a browser-based shim.
module.exports = {
  extended(PSD) {
    // Instantiates a new PSD object synchronously from the given
    // file path.
    this.fromFile = file => new PSD(fs.readFileSync(file));

    // Instantiates a new PSD object asynchronously from the given
    // file path. This method also parses the PSD for you.
    return this.open = file => new RSVP.Promise((resolve, reject) => fs.readFile(file, (err, data) => {
      if (err) { return reject(err); }

      const psd = new PSD(data);
      psd.parse();
      return resolve(psd);
    }));
  }
};
