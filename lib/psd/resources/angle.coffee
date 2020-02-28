module.exports = class Angle
  id: 1037
  name: 'angle'

  constructor: (@resource) ->
    @file = @resource.file

  parse: ->
    # 32-bit fixed-point number (16.16)
    @angle = @file.readUInt()

    @resource.data = @

  export: ->
    data = {}
    for key in ['angle']
      data[key] = @[key]

    data
