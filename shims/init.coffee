RSVP = require 'rsvp'

module.exports =
  extended: (PSD) ->
    @fromURL = (url) ->
      new RSVP.Promise (resolve, reject) ->
        xhr = new XMLHttpRequest()
        xhr.open "GET", url, true
        xhr.responseType = "arraybuffer"
        xhr.onload = ->
          try
            data = new Uint8Array(xhr.response or xhr.mozResponseArrayBuffer)
            psd = new PSD(data)
            psd.parse()

            resolve(psd)
          catch error
            reject(error)

        xhr.send null

    @fromEvent = (e) ->
      new RSVP.Promise (resolve, reject) ->
        file = e.dataTransfer.files[0]
        reader = new FileReader()
        reader.onload = (e) ->
          psd = new PSD(new Uint8Array(e.target.result))
          psd.parse()

          resolve(psd)

        reader.onerror = reject
        reader.readAsArrayBuffer(file)

    @fromDroppedFile = (file) ->
      new RSVP.Promise (resolve, reject) ->
        reader = new FileReader()
        reader.onload = (e) ->
          psd = new PSD(new Uint8Array(e.target.result))
          psd.parse()

          resolve(psd)

        reader.onerror = reject
        reader.readAsArrayBuffer(file)
