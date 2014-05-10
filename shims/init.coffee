RSVP = require 'rsvp'

module.exports =
  extended: (PSD) ->
    @fromURL = (url) ->
      return new RSVP.Promise (resolve, reject) ->
        xhr = new XMLHttpRequest()
        xhr.open "GET", url, true
        xhr.responseType = "arraybuffer"
        xhr.onload = ->
          data = new Uint8Array(xhr.response or xhr.mozResponseArrayBuffer)
          psd = new PSD(data)
          resolve(psd)

        xhr.send null
