File = require './psd/file.coffee'

module.exports = class PSD
  constructor: (data) ->
    @file = new File(data)