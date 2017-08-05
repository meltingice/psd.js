import Node from '../node'

import Group from './group'
import Layer from './layer'

export default class Root extends Node {
  static layerForPsd(psd) {
    let layer = {};
    for (var i = 0; i < Node.PROPERTIES.length; i++) {
      layer[Node.PROPERTIES[i]] = null;
    }

    layer.top = 0;
    layer.left = 0;
    layer.right = psd.header.width;
    layer.bottom = psd.header.height;
    return layer;
  }

  type = "root";

  constructor(psd) {
    super(Root.layerForPsd(psd))

    this.psd = psd;

    debugger;
    let currentGroup = this;
    let parseStack = [];

    let layer = null, parent = null;
    for (var i = 0; i < this.psd.layerMask.layers.length; i++) {
      layer = this.psd.layerMask.layers[i];

      if (layer.isFolder()) {
        parseStack.push(currentGroup);
        currentGroup = new Group(layer, parseStack[parseStack.length - 1]);
      } else if (layer.isFolderEnd()) {
        parent = parseStack.pop();
        parent.children().push(currentGroup);
        currentGroup = parent;
      } else {
        currentGroup.children().push(new Layer(layer, currentGroup));
      }
    }

    this.updateDimensions();
  }

  documentDimensions() {
    return [this.width, this.height];
  }
}
