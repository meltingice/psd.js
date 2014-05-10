Util = require './util.coffee'

module.exports = class Resource
  @Section: require('./resource_section.coffee')

  constructor: (@file) ->
    @id = null
    @type = null
    @length = 0

  parse: ->
    @type = @file.readString(4)
    @id = @file.readShort()

    nameLength = Util.pad2(@file.readByte() + 1) - 1
    @name = @file.readString(nameLength)
    @length = Util.pad2(@file.readInt())