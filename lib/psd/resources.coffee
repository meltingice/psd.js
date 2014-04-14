module.exports = class Resources
  constructor: (@file) ->
    @resources = {}
    @typeIndex = {}
    @length = null

  skip: ->
    @length = @file.readInt()
    @file.seek @length, true

  parse: ->
    @length = @file.readInt()
    @file.seek @length, true