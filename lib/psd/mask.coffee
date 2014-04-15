module.exports = class Mask
  constructor: (@file) ->
    @top = 0
    @right = 0
    @bottom = 0
    @left = 0

  parse: ->
    @size = @file.readInt()
    return @ if @size is 0

    maskEnd = @file.tell() + @size

    @top = @file.readInt()
    @left = @file.readInt()
    @bottom = @file.readInt()
    @right = @file.readInt()

    @width = @right - @left
    @height = @bottom - @top

    @relative = (@flags & 0x01) > 0
    @disabled = (@flags & (0x01 << 1)) > 0
    @invert = (@flags & (0x01 << 2)) > 0

    @defaultColor = @file.readByte()
    @flags = @file.readByte()

    @file.seek maskEnd
    return @

  export: ->
    return {} if @size is 0

    top: @top
    left: @left
    bottom: @bottom
    right: @right
    width: @width
    height: @height
    defaultColor: @defaultColor
    relative: @relative
    disabled: @disabled
    invert: @invert