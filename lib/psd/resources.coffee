module.exports = class Resources
  constructor: (@file) ->
    @resources = {}
    @typeIndex = {}
    @length = null

  parse: ->
    @length = @file.readInt()
    @file.seek @length, true