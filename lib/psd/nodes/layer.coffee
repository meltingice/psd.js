Node = require '../node.coffee'

module.exports = class Layer extends Node
  type: 'layer'
  
  isEmpty: -> @width is 0 or @height is 0