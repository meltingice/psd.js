# The Node abstraction is one of the most important in PSD.js. It's the base for the
# tree representation of the document structure. Every layer and group is a node in
# the document tree. All common functionality is here, and both layers and groups extend
# this class with specialized functionality.
# 
# While you can access the layer data directly, the Node interface provides a somewhat
# higher-level API that makes it easier and less verbose to access the wealth of
# information that's stored in each PSD.
_        = require 'lodash'
{Module} = require 'coffeescript-module'

module.exports = class Node extends Module
  # We have a couple of important mixins that provide some really cool functionality.
  @includes require('./nodes/ancestry.coffee')
  @includes require('./nodes/search.coffee')
  @includes require('./nodes/build_preview.coffee')

  # There are some common properties that are shared by all Node types. We define them
  # here to DRY up the code a little, especially when exporting data.
  @PROPERTIES: ['name', 'left', 'right', 'top', 'bottom', 'height', 'width']

  # Each Node subclass defines a type, which makes it easier to idenfity what we're
  # dealing with, since `constructor.name` can get mangled during minification and
  # wreak havoc.
  type: 'node'

  # Every node gets a reference to the layer/group and its parent, which allows us to
  # traverse the tree structure. It also builds references to all of its children.
  constructor: (@layer, @parent = null) ->
    @layer.node = @
    @_children = []

    # We go ahead and copy the layer name to the node since it's such a commonly
    # accessed property.
    @name = @layer.name

    @forceVisible = null

    # We also store the coordinates on the node, especially since we'll eventually be
    # able to modify them based on layer comp data.
    @coords =
      top: @layer.top
      bottom: @layer.bottom
      left: @layer.left
      right: @layer.right

    @topOffset = 0
    @leftOffset = 0

    @createProperties()

  createProperties: ->
    # The coordinate properties take into consideration any offsets that might be set
    # by the current layer comp. This is not implemented yet, but will be in the future.
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

    # We take the tiny overhead of recalculating this every time since the offset could
    # change based on the layer comp.
    Object.defineProperty @, 'width',  get: -> @right - @left
    Object.defineProperty @, 'height', get: -> @bottom - @top

  # **All properties should be accessed through `get()`**. While many things can be
  # accessed without it, using `get()` provides 2 things:
  # 
  # * Consistency
  # * Access to both data on the Node and the Layer through the same interface.
  # 
  # This makes it much cleaner to access stuff like layer info blocks, since you just
  # give the name of the block you want to access. For example:
  # 
  # ``` coffeescript
  # node.get('typeTool').export()
  # 
  # # vs
  # 
  # node.layer.typeTool().export()
  # ```
  get: (prop) ->
    value = if @[prop]? then @[prop] else @layer[prop]
    if typeof value is 'function' then value() else value

  # Is this layer/group visible? This checks all possible places that could define
  # whether or not this is true, e.g. clipping masks. It also checks the current
  # layer comp visibility override (not implemented yet).
  visible: ->
    return false if @layer.clipped and not @clippingMask().visible()
    if @forceVisible? then @forceVisible else @layer.visible

  hidden: -> not @visible()

  isLayer: -> @type is 'layer'
  isGroup: -> @type is 'group'
  isRoot: ->  @type is 'root'

  # Retrieves the clipping mask for this node. Because a clipping mask can be applied
  # to multiple layers, we have to traverse the tree until we find the first node that
  # does not have the `clipped` flag. We can do it this way because all layers that
  # the clipping node affects must be siblings and in sequence.
  clippingMask: ->
    return null unless @layer.clipped
    @clippingMaskCached or= (
      maskNode = @nextSibling()
      maskNode = maskNode.nextSibling() while maskNode.clipped
      maskNode
    )

  clippedBy: -> @clippingMask()

  # We can export the most important information about this node as a plain object.
  # If we're exporting a group, it will recursively export itself and all of it's descendants as well.
  export: ->
    hash =
      type: null
      visible: @visible()
      opacity: @layer.opacity / 255.0
      blendingMode: @layer.blendingMode()

    hash[prop] = @[prop] for prop in Node.PROPERTIES
    hash

  # While the PSD document does not define explicit dimensions for groups, we can generate
  # them based on the bounding boxes of their layer children. When we build the tree structure,
  # we update the dimensions of the group whenever a layer is added so that we finish with
  # the actual bounding box of the group's contents.
  updateDimensions: ->
    return if @isLayer()

    child.updateDimensions() for child in @_children

    return if @isRoot()

    nonEmptyChildren = @_children.filter((c) -> not c.isEmpty())
    @left = _.min(nonEmptyChildren.map((c) -> c.left)) or 0
    @top = _.min(nonEmptyChildren.map((c) -> c.top)) or 0
    @bottom = _.max(nonEmptyChildren.map((c) -> c.bottom)) or 0
    @right = _.max(nonEmptyChildren.map((c) -> c.right)) or 0
