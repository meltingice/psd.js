import _ from 'lodash'

// The Node abstraction is one of the most important in PSD.js. It's the base for the
// tree representation of the document structure. Every layer and group is a node in
// the document tree. All common functionality is here, and both layers and groups extend
// this class with specialized functionality.
//
// While you can access the layer data directly, the Node interface provides a somewhat
// higher-level API that makes it easier and less verbose to access the wealth of
// information that's stored in each PSD.

export default class Node {
  static PROPERTIES = ['name', 'left', 'right', 'top', 'bottom', 'height', 'width'];

  type = "node";

  constructor(layer, parent = null) {
    this.layer = layer;
    this.parent = parent;

    this.layer.node = this;
    this._children = [];

    this.name = this.layer.name;

    this.forceVisible = null

    this.coords = {
      top: this.layer.top,
      bottom: this.layer.bottom,
      left: this.layer.left,
      right: this.layer.right
    };

    this.topOffset = 0;
    this.leftOffset = 0;

    Object.defineProperty(this, 'top', {
      get: () => { this.coords.top + this.topOffset },
      set: (val) => this.coords.top = val
    });

    Object.defineProperty(this, 'right', {
      get: () => { this.coords.right + this.topOffset },
      set: (val) => this.coords.right = val
    });

    Object.defineProperty(this, 'bottom', {
      get: () => { this.coords.bottom + this.topOffset },
      set: (val) => this.coords.bottom = val
    });

    Object.defineProperty(this, 'left', {
      get: () => { this.coords.left + this.topOffset },
      set: (val) => this.coords.left = val
    });

    Object.defineProperty(this, 'width', { get: () => this.right - this.left });
    Object.defineProperty(this, 'height', { get: () => this.bottom - this.top });
  }

  info(name) {
    return this.layer.adjustments[name];
  }

  // Is this layer/group visible? This checks all possible places that could define
  // whether or not this is true, e.g. clipping masks. It also checks the current
  // layer comp visibility override (not implemented yet).
  visible() {
    if (this.layer.clipped && !this.clippingMask().visible) return false;
    return this.forceVisible !== null ? this.forceVisible : this.layer.visible;
  }

  hidden() {
    return !this.visible();
  }

  isLayer() { return this.type === "layer" }
  isGroup() { return this.type === "group" }
  isRoot() { return this.type === "root" }

  clippingMask() {
    if (!this.layer.clipped) return null;
    let maskNode = this.nextSibling();
    while (maskNode.clipped) {
      maskNode = maskNode.nextSibling();
    }

    return maskNode;
  }

  updateDimensions() {
    if (this.isLayer()) return;

    for (var i = 0; i < this._children.length; i++) {
      this._children[i].updateDimensions();
    }

    if (this.isRoot()) return;

    let nonEmptyChildren = this._children.filter(c => !c.isEmpty());
    if (nonEmptyChildren.length === 0) {
      this.left = this.top = this.bottom = this.right = 0;
    } else {
      this.left = Math.min(...nonEmptyChildren.map(c => c.left));
      this.top = Math.min(...nonEmptyChildren.map(c => c.top));
      this.bottom = Math.max(...nonEmptyChildren.map(c => c.bottom));
      this.right = Math.max(...nonEmptyChildren.map(c => c.right));
    }
  }

  //
  // Ancestry methods
  //

  root() {
    if (this.isRoot()) return this;
    return this.parent.root();
  }

  isRoot() {
    return this.depth() === 0;
  }

  children() {
    return this._children;
  }

  ancestors() {
    if (!this.parent || this.parent.isRoot()) return [];
    return this.parent.ancestors().concat([ this.parent ]);
  }

  hasChildren() {
    return this._children.length > 0;
  }

  childless() { return !this.hasChildren() }

  siblings() {
    if (!this.parent) return [];
    return this.parent.children();
  }

  nextSibling() {
    if (!this.parent) return null;
    return this.siblings()[this.siblings().indexOf(this) + 1];
  }

  prevSibling() {
    if (!this.parent) return null;
    return this.siblings()[this.siblings().indexOf(this) - 1];
  }

  hasSiblings() { return this.siblings().length > 1 }
  onlyChild() { return !this.hasSiblings() }

  descendants() {
    return _.flatten(this._children.map(n => n.subtree()));
  }

  subtree() {
    return [this].concat(this.descendants());
  }

  depth() {
    return this.ancestors().length + 1;
  }

  path(asArray = false) {
    const path = this.ancestors().map(n => n.name).concat([this.name]);
    return asArray ? path : path.join('/');
  }

  childrenAtPath(path, caseSensitive = true) {
    if (!Array.isArray(path)) {
      path = path.split('/').filter(p => p.length > 0);
    }

    let query = path.shift();
    if (!caseSensitive) query = query.toLowerCase();

    const matches = this.children().filter(c => {
      if (caseSensitive) {
        return c.name === query;
      } else {
        return c.name.toLowerCase() === query;
      }
    });

    if (path.length === 0) {
      return matches;
    }

    return _.flatten(
      matches.map(m => m.childrenAtPath(path, caseSensitive))
    );
  }
}
