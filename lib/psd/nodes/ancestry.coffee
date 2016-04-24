_ = require 'lodash'

module.exports =
  root: ->
    return @ if @isRoot()
    return @parent.root()

  isRoot: -> @depth() is 0

  children: -> @_children

  ancestors: ->
    return [] if not @parent? or @parent.isRoot()
    return @parent.ancestors().concat [@parent]

  hasChildren: -> @_children.length > 0
  childless: -> not @hasChildren()

  siblings: ->
    return [] unless @parent?
    @parent.children()

  nextSibling: ->
    return null unless @parent?
    index = @siblings().indexOf(@)
    @siblings()[index + 1]

  prevSibling: ->
    return null unless @parent?
    index = @siblings().indexOf(@)
    @siblings()[index - 1]

  hasSiblings: -> @siblings().length > 1
  onlyChild: -> not @hasSiblings()

  descendants: -> _.flatten @_children.map((n) -> n.subtree())

  subtree: -> [@].concat @descendants()

  depth: -> @ancestors().length + 1

  path: (asArray = false) ->
    path = @ancestors().map((n) -> n.name).concat([@name])
    if asArray then path else path.join('/')
