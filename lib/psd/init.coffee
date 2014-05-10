fs = require 'fs'

module.exports =
  extended: (PSD) ->
    @fromFile = (file) -> new PSD(fs.readFileSync(file))
    @open = (file, cb) ->
      fs.readFile file, (err, data) =>
        throw err if err?
        psd = new PSD(data)
        psd.parse()

        cb(psd)