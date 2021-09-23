/*
 * decaffeinate suggestions:
 * DS002: Fix invalid constructor
 * DS101: Remove unnecessary use of Array.from
 * DS102: Remove unnecessary code created because of implicit returns
 * DS205: Consider reworking code to avoid use of IIFEs
 * DS206: Consider reworking classes to avoid initClass
 * DS207: Consider shorter variations of null checks
 * Full docs: https://github.com/decaffeinate/decaffeinate/blob/master/docs/suggestions.md
 */
// The Node abstraction is one of the most important in PSD.js. It's the base for the
// tree representation of the document structure. Every layer and group is a node in
// the document tree. All common functionality is here, and both layers and groups extend
// this class with specialized functionality.
// 
// While you can access the layer data directly, the Node interface provides a somewhat
// higher-level API that makes it easier and less verbose to access the wealth of
// information that's stored in each PSD.
let Node;
const _        = require('lodash');
const {Module} = require('coffeescript-module');

module.exports = (Node = (function() {
  Node = class Node extends Module {
    static initClass() {
      // We have a couple of important mixins that provide some really cool functionality.
      this.includes(require('./nodes/ancestry.coffee'));
      this.includes(require('./nodes/search.coffee'));
      this.includes(require('./nodes/build_preview.coffee'));
  
      // There are some common properties that are shared by all Node types. We define them
      // here to DRY up the code a little, especially when exporting data.
      this.PROPERTIES = ['name', 'left', 'right', 'top', 'bottom', 'height', 'width'];
  
      // Each Node subclass defines a type, which makes it easier to idenfity what we're
      // dealing with, since `constructor.name` can get mangled during minification and
      // wreak havoc.
      this.prototype.type = 'node';
    }

    // Every node gets a reference to the layer/group and its parent, which allows us to
    // traverse the tree structure. It also builds references to all of its children.
    constructor(layer, parent = null) {
      this.layer = layer;
      this.parent = parent;
      this.layer.node = this;
      this._children = [];

      // We go ahead and copy the layer name to the node since it's such a commonly
      // accessed property.
      this.name = this.layer.name;

      this.forceVisible = null;

      // We also store the coordinates on the node, especially since we'll eventually be
      // able to modify them based on layer comp data.
      this.coords = {
        top: this.layer.top,
        bottom: this.layer.bottom,
        left: this.layer.left,
        right: this.layer.right
      };

      this.topOffset = 0;
      this.leftOffset = 0;

      this.createProperties();
    }

    createProperties() {
      // The coordinate properties take into consideration any offsets that might be set
      // by the current layer comp. This is not implemented yet, but will be in the future.
      Object.defineProperty(this, 'top', {
        get() { return this.coords.top + this.topOffset; },
        set(val) { return this.coords.top = val; }
      }
      );

      Object.defineProperty(this, 'right', {
        get() { return this.coords.right + this.leftOffset; },
        set(val) { return this.coords.right = val; }
      }
      );

      Object.defineProperty(this, 'bottom', {
        get() { return this.coords.bottom + this.topOffset; },
        set(val) { return this.coords.bottom = val; }
      }
      );

      Object.defineProperty(this, 'left', {
        get() { return this.coords.left + this.leftOffset; },
        set(val) { return this.coords.left = val; }
      }
      );

      // We take the tiny overhead of recalculating this every time since the offset could
      // change based on the layer comp.
      Object.defineProperty(this, 'width',  {get() { return this.right - this.left; }});
      return Object.defineProperty(this, 'height', {get() { return this.bottom - this.top; }});
    }

    // **All properties should be accessed through `get()`**. While many things can be
    // accessed without it, using `get()` provides 2 things:
    // 
    // * Consistency
    // * Access to both data on the Node and the Layer through the same interface.
    // 
    // This makes it much cleaner to access stuff like layer info blocks, since you just
    // give the name of the block you want to access. For example:
    // 
    // ``` coffeescript
    // node.get('typeTool').export()
    // 
    // # vs
    // 
    // node.layer.typeTool().export()
    // ```
    get(prop) {
      const value = (this[prop] != null) ? this[prop] : this.layer[prop];
      if (typeof value === 'function') { return value(); } else { return value; }
    }

    // Is this layer/group visible? This checks all possible places that could define
    // whether or not this is true, e.g. clipping masks. It also checks the current
    // layer comp visibility override (not implemented yet).
    visible() {
      if (this.layer.clipped && !this.clippingMask().visible()) { return false; }
      if (this.forceVisible != null) { return this.forceVisible; } else { return this.layer.visible; }
    }

    hidden() { return !this.visible(); }

    isLayer() { return this.type === 'layer'; }
    isGroup() { return this.type === 'group'; }
    isRoot() {  return this.type === 'root'; }

    // Retrieves the clipping mask for this node. Because a clipping mask can be applied
    // to multiple layers, we have to traverse the tree until we find the first node that
    // does not have the `clipped` flag. We can do it this way because all layers that
    // the clipping node affects must be siblings and in sequence.
    clippingMask() {
      let maskNode;
      if (!this.layer.clipped) { return null; }
      return this.clippingMaskCached || (this.clippingMaskCached = (
        (maskNode = this.nextSibling()),
        (() => {
          const result = [];
          while (maskNode.clipped) {
            result.push(maskNode = maskNode.nextSibling());
          }
          return result;
        })(),
        maskNode
      ));
    }

    clippedBy() { return this.clippingMask(); }

    // We can export the most important information about this node as a plain object.
    // If we're exporting a group, it will recursively export itself and all of it's descendants as well.
    export() {
      const hash = {
        type: null,
        visible: this.visible(),
        opacity: this.layer.opacity / 255.0,
        blendingMode: this.layer.blendingMode()
      };

      for (let prop of Array.from(Node.PROPERTIES)) { hash[prop] = this[prop]; }
      return hash;
    }

    // While the PSD document does not define explicit dimensions for groups, we can generate
    // them based on the bounding boxes of their layer children. When we build the tree structure,
    // we update the dimensions of the group whenever a layer is added so that we finish with
    // the actual bounding box of the group's contents.
    updateDimensions() {
      if (this.isLayer()) { return; }

      for (let child of Array.from(this._children)) { child.updateDimensions(); }

      if (this.isRoot()) { return; }

      const nonEmptyChildren = this._children.filter(c => !c.isEmpty());
      this.left = _.min(nonEmptyChildren.map(c => c.left)) || 0;
      this.top = _.min(nonEmptyChildren.map(c => c.top)) || 0;
      this.bottom = _.max(nonEmptyChildren.map(c => c.bottom)) || 0;
      return this.right = _.max(nonEmptyChildren.map(c => c.right)) || 0;
    }
  };
  Node.initClass();
  return Node;
})());
