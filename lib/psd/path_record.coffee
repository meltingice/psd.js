_ = require 'lodash'

# A path record describes a single point in a vector path. This is used
# in a couple of different places, but most notably in vector shapes.
module.exports = class PathRecord
  constructor: (@file) ->
    @recordType = null

  parse: ->
    @recordType = @file.readShort()

    switch @recordType
      when 0, 3 then @_readPathRecord()
      when 1, 2, 4, 5 then @_readBezierPoint()
      when 7 then @_readClipboardRecord()
      when 8 then @_readInitialFill()
      else @file.seek(24, true)

  export: ->
    _.merge { recordType: @recordType }, switch @recordType
      when 0, 3 then { numPoints: @numPoints }
      when 1, 2, 4, 5
        linked: @linked
        closed: (@recordType in [1, 2])
        preceding:
          vert: @precedingVert
          horiz: @precedingHoriz
        anchor:
          vert: @anchorVert
          horiz: @anchorHoriz
        leaving:
          vert: @leavingVert
          horiz: @leavingHoriz
      when 7
        clipboard:
          top: @clipboardTop
          left: @clipboardLeft
          bottom: @clipboardBottom
          right: @clipboardRight
          resolution: @clipboardResolution
      when 8 then { initialFill: @initialFill }
      else {}

  isBezierPoint: -> @recordType in [1, 2, 4, 5]

  _readPathRecord: ->
    @numPoints = @file.readShort()
    @file.seek 22, true

  _readBezierPoint: ->
    @linked = @recordType in [1, 4]

    @precedingVert = @file.readPathNumber()
    @precedingHoriz = @file.readPathNumber()

    @anchorVert = @file.readPathNumber()
    @anchorHoriz = @file.readPathNumber()

    @leavingVert = @file.readPathNumber()
    @leavingHoriz = @file.readPathNumber()

  _readClipboardRecord: ->
    @clipboardTop = @file.readPathNumber()
    @clipboardLeft = @file.readPathNumber()
    @clipboardBottom = @file.readPathNumber()
    @clipboardRight = @file.readPathNumber()
    @clipboardResolution = @file.readPathNumber()
    @file.seek 4, true

  _readInitialFill: ->
    @initialFill = @file.readShort()
    @file.seek 22, true
