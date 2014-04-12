module.exports = class File
  constructor: (@data) ->
    @pos = 0

  tell: -> @pos
  read: (length) ->
    data = @data[@pos...@pos+length]
    @pos += length
    return data

  seek: (amt, rel = false) -> if rel then @pos += amt else @pos = amt

  readString: (length) -> @read(length).toString()