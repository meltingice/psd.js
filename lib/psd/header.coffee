RSVP = require ('rsvp')

module.exports = class Header
  constructor: (@file) ->
    @sig = null
    @version = null
    @channels = null
    @rows = null
    @cols = null
    @depth = null
    @mode = null

  parse: ->
    new RSVP.Promise (resolve, reject) =>
      @sig = @file.readString(4)
      @version = @file.readUShort()

      resolve(@)