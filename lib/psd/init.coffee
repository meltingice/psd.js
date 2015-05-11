fs = require 'fs'
RSVP = require 'rsvp'

# The init methods for the NodeJS version of PSD.js. When compiled for
# the web, browserify will overwrite this file with a browser-based shim.
module.exports =
  extended: (PSD) ->
    # Instantiates a new PSD object synchronously from the given
    # file path.
    @fromFile = (file) -> new PSD(fs.readFileSync(file))

    # Instantiates a new PSD object asynchronously from the given
    # file path. This method also parses the PSD for you.
    @open = (file) ->
      new RSVP.Promise (resolve, reject) ->
        fs.readFile file, (err, data) =>
          return reject(err) if err

          psd = new PSD(data)
          psd.parse()
          resolve(psd)
