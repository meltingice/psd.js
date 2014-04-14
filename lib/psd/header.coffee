module.exports = class Header
  # All of the color modes are stored internally as a short from 0-15.
  # This is a mapping of that value to a human-readable name.
  MODES = [
    'Bitmap'
    'GrayScale'
    'IndexedColor'
    'RGBColor'
    'CMYKColor'
    'HSLColor'
    'HSBColor'
    'Multichannel'
    'Duotone'
    'LabColor'
    'Gray16'
    'RGB48'
    'Lab48'
    'CMYK64'
    'DeepMultichannel'
    'Duotone16'
  ]

  constructor: (@file) ->
    @sig = null
    @version = null
    @channels = null
    @rows = @height = null
    @cols = @width = null
    @depth = null
    @mode = null

  parse: ->
    @sig = @file.readString(4)
    @version = @file.readUShort()

    @file.seek 6, true

    @channels = @file.readUShort()
    @rows = @height = @file.readUInt()
    @cols = @width = @file.readUInt()
    @depth = @file.readUShort()
    @mode = @file.readUShort()

    colorDataLen = @file.readUInt()
    @file.seek colorDataLen, true

  modeName: -> MODES[@mode]

  export: ->
    data = {}
    for key in ['sig', 'version', 'channels', 'rows', 'cols', 'depth', 'mode']
      data[key] = @[key]

    data
