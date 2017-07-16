{Module} = require 'coffeescript-module'

# Represents the header of the PSD, which is the first thing always parsed.
# The header stores important information about the PSD such as the dimensions
# and the color depth.
module.exports = class Header extends Module
  @aliasProperty 'height', 'rows'
  @aliasProperty 'width', 'cols'

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

  # The signature of the PSD. Should be 8BPS.
  sig: null

  # The version of the PSD. Should be 1.
  version: null

  # The number of color channels in the PSD.
  channels: null

  # The height of the PSD. Can also be accessed with `height`.
  rows: null

  # The width of the PSD. Can also be accessed with `width`.
  cols: null

  # The bit depth of the PSD.
  depth: null

  # The color mode of the PSD.
  mode: null

  # Creates a new Header.
  # @param [File] file The PSD file.
  constructor: (@file) ->

  # Parses the header data.
  parse: ->
    @sig = @file.readString(4)
    if @sig != '8BPS'
      throw new Error('Invalid file signature detected. Got: '+@sig+'. Expected 8BPS.')
    @version = @file.readUShort()

    @file.seek 6, true

    @channels = @file.readUShort()
    @rows = @height = @file.readUInt()
    @cols = @width = @file.readUInt()
    @depth = @file.readUShort()
    @mode = @file.readUShort()

    colorDataLen = @file.readUInt()
    @file.seek colorDataLen, true

  # Converts the color mode key to a readable version.
  modeName: -> MODES[@mode]

  # Exports all of the header data in a basic object.
  export: ->
    data = {}
    for key in ['sig', 'version', 'channels', 'rows', 'cols', 'depth', 'mode']
      data[key] = @[key]

    data
