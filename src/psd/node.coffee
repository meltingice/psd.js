_        = require 'lodash'
{Module} = require 'coffeescript-module'

module.exports = class Node extends Module
  @includes require('./nodes/ancestry.coffee')
  @includes require('./nodes/search.coffee')
  @includes require('./nodes/build_preview.coffee')

  @PROPERTIES: ['name', 'left', 'right', 'top', 'bottom', 'height', 'width']

  type: 'node'

  constructor: (@layer, @parent = null) ->
    @layer.node = @
    @_children = []

    @name = @layer.name

    @forceVisible = null

    @coords =
      top: @layer.top
      bottom: @layer.bottom
      left: @layer.left
      right: @layer.right

    @topOffset = 0
    @leftOffset = 0

    @createProperties()

  createProperties: ->
    Object.defineProperty @, 'top',
      get: -> @coords.top + @topOffset
      set: (val) -> @coords.top = val

    Object.defineProperty @, 'right',
      get: -> @coords.right + @leftOffset
      set: (val) -> @coords.right = val

    Object.defineProperty @, 'bottom',
      get: -> @coords.bottom + @topOffset
      set: (val) -> @coords.bottom = val

    Object.defineProperty @, 'left',
      get: -> @coords.left + @leftOffset
      set: (val) -> @coords.left = val

    Object.defineProperty @, 'width',  get: -> @right - @left
    Object.defineProperty @, 'height', get: -> @bottom - @top

  get: (prop) ->
    value = if @[prop]? then @[prop] else @layer[prop]
    if typeof value is 'function' then value() else value

  visible: ->
    return false if @layer.clipped and not @clippingMask().visible()
    if @forceVisible? then @forceVisible else @layer.visible

  hidden: -> not @visible()

  isLayer: -> @type is 'layer'
  isGroup: -> @type is 'group'
  isRoot: ->  @type is 'root'

  clippingMask: ->
    return null unless @layer.clipped
    @clippingMaskCached or= (
      maskNode = @nextSibling()
      maskNode = maskNode.nextSibling() while maskNode.clipped
      maskNode
    )

  clippedBy: -> @clippingMask()

  export: ->
    hash =
      type: null
      visible: @visible()
      opacity: @layer.opacity / 255.0
      blendingMode: @layer.blendingMode()

    hash[prop] = @[prop] for prop in Node.PROPERTIES
    hash

  updateDimensions: ->
    return if @isLayer()

    child.updateDimensions() for child in @_children

    return if @isRoot()

    nonEmptyChildren = @_children.filter((c) -> not c.isEmpty())
    @left = _.min(nonEmptyChildren.map((c) -> c.left)) or 0
    @top = _.min(nonEmptyChildren.map((c) -> c.top)) or 0
    @bottom = _.max(nonEmptyChildren.map((c) -> c.bottom)) or 0
    @right = _.max(nonEmptyChildren.map((c) -> c.right)) or 0
