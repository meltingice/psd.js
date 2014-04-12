fs    = require 'fs'
RSVP  = require 'rsvp'

File  = require './psd/file.coffee'
Header = require './psd/header.coffee'

module.exports = class PSD
  @fromFile: (file) -> new PSD fs.readFileSync(file)

  constructor: (data) ->
    @file = new File(data)
    @parsed = false
    @header = null

  parse: ->
    new RSVP.Promise (resolve, reject) =>
      return resolve(@) if @parsed
      
      @parseHeader().then (header) =>
        @header = header
        resolve(@)

  parseHeader: -> new Header(@file).parse()
