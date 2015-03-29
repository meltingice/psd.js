_ = require 'lodash'
TypeTool = require './typetool.coffee'

module.exports = class LegacyTypeTool extends TypeTool
  @shouldParse: (key) -> key is 'tySh'

  constructor: (layer, length) ->
    super(layer, length)

    @transform = {}
    @faces = []
    @styles = []
    @lines = []
    @type = 0
    @scalingFactor = 0
    @characterCount = 0
    @horzPlace = 0
    @vertPlace = 0
    @selectStart = 0
    @selectEnd = 0
    @color = null
    @antialias = null

  parse: ->
    @file.seek 2, true # Version
    @parseTransformInfo()

    # Font information
    @file.seek 2, true

    facesCount = @file.readShort()
    for i in [0...facesCount]
      @faces.push _({}).tap (face) =>
        face.mark = @file.readShort()
        face.fontType = @file.readInt()
        face.fontName = @file.readString()
        face.fontFamilyName = @file.readString()
        face.fontStyleName = @file.readString()
        face.script = @file.readShort()
        face.numberAxesVector = @file.readInt()
        face.vector = []

        for j in [0...face.numberAxesVector]
          face.vector.push @file.readInt()

    stylesCount = @file.readShort()
    for i in [0...stylesCount]
      @styles.push _({}).tap (style) =>
        style.mark = @file.readShort()
        style.faceMark = @file.readShort()
        style.size = @file.readInt()
        style.tracking = @file.readInt()
        style.kerning = @file.readInt()
        style.leading = @file.readInt()
        style.baseShift = @file.readInt()
        style.autoKern = @file.readBoolean()

        @file.seek 1, true

        style.rotate = @file.readBoolean()

    @type = @file.readShort()
    @scalingFactor = @file.readInt()
    @characterCount = @file.readInt()
    @horzPlace = @file.readInt()
    @vertPlace = @file.readInt()
    @selectStart = @file.readInt()
    @selectEnd = @file.readInt()

    linesCount = @file.readShort()
    for i in [0...linesCount]
      @lines.push _({}).tap (line) ->
        line.charCount = @file.readInt()
        line.orientation = @file.readShort()
        line.alignment = @file.readShort()
        line.actualChar = @file.readShort()
        line.style = @file.readShort()

    @color = @file.readSpaceColor()
    @antialias = @file.readBoolean()
