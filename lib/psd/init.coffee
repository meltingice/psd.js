fs = require 'fs'
RSVP = require 'rsvp'

module.exports =
  extended: (PSD) ->
    @fromFile = (file) -> new PSD(fs.readFileSync(file))
    @open = (file) ->
      new RSVP.Promise (resolve, reject) ->
        fs.readFile file, (err, data) =>
          return reject(err) if err

          psd = new PSD(data)
          psd.parse()
          resolve(psd)