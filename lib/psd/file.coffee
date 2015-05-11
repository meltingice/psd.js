{jspack} = require 'jspack'
iconv = require 'iconv-lite'
Color = require './color.coffee'
Util = require './util.coffee'

# A file abstraction that stores the PSD file data, and
# assists in parsing it.
module.exports = class File
  FORMATS =
    Int:
      code: '>i'
      length: 4
    UInt:
      code: '>I'
      length: 4
    Short:
      code: '>h'
      length: 2
    UShort:
      code: '>H'
      length: 2
    Float:
      code: '>f'
      length: 4
    Double:
      code: '>d'
      length: 8
    LongLong:
      code: '>q'
      length: 8

  for own format, info of FORMATS then do (format, info) =>
    @::["read#{format}"] = -> @readf(info.code, info.length)[0]

  # The current cursor position in the file.
  pos: 0

  # Creates a new File with the given Uint8Array.
  constructor: (@data) ->

  # Returns the current cursor position.
  tell: -> @pos

  # Reads raw file data with no processing.
  read: (length) -> (@data[@pos++] for i in [0...length])

  # Reads file data and processes it with the given unpack format string. If the length is
  # omitted, then it will be calculated automatically based on the format string.
  readf: (format, len = null) -> jspack.Unpack format, @read(len or jspack.CalcLength(format))

  # Moves the cursor without parsing data. If `rel = false`, then the cursor will be set to the
  # given value, which effectively sets the position relative to the start of the file. If
  # `rel = true`, then the cursor will be moved relative to the current position.
  seek: (amt, rel = false) -> if rel then @pos += amt else @pos = amt

  # Reads a String of the given length.
  readString: (length) -> String.fromCharCode.apply(null, @read(length)).replace /\u0000/g, ""

  # Reads a Unicode UTF-16BE encoded string.
  readUnicodeString: (length = null) ->
    length or= @readInt()
    iconv.decode(new Buffer(@read(length * 2)),'utf-16be').replace /\u0000/g, ""

  # Helper that reads a single byte.
  readByte: -> @read(1)[0]

  # Helper that reads a single byte and interprets it as a boolean.
  readBoolean: -> @readByte() isnt 0

  # Reads a 32-bit color space value.
  readSpaceColor: ->
    colorSpace = @readShort()
    colorComponent = (@readShort() >> 8) for i in [0...4]

    colorSpace: colorSpace, components: colorComponent

  # Adobe's lovely signed 32-bit fixed-point number with 8bits.24bits
  #   http://www.adobe.com/devnet-apps/photoshop/fileformatashtml/PhotoshopFileFormats.htm#50577409_17587
  readPathNumber: ->
    a = @readByte()
    
    arr = @read(3)
    b1 = arr[0] << 16
    b2 = arr[1] << 8
    b3 = arr[2]
    b = b1 | b2 | b3

    parseFloat(a, 10) + parseFloat(b / Math.pow(2, 24), 10)
