{jspack} = require 'jspack'
iconv = require 'iconv-lite'
Util = require './util.coffee'

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

  constructor: (@data) ->
    @pos = 0

  tell: -> @pos
  read: (length) -> (@data[@pos++] for i in [0...length])

  readf: (format, len = null) -> jspack.Unpack format, @read(len or jspack.CalcLength(format))

  seek: (amt, rel = false) -> if rel then @pos += amt else @pos = amt

  readString: (length) -> String.fromCharCode.apply(null, @read(length)).replace /\u0000/g, ""
  readUnicodeString: (length = null) ->
    length or= @readInt()
    iconv.decode(new Buffer(@read(length * 2)),'utf-16be').replace /\u0000/g, ""

  readByte: -> @read(1)[0]
  readBoolean: -> @readByte() isnt 0
