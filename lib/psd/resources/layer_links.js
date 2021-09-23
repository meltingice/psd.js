/*
 * decaffeinate suggestions:
 * DS102: Remove unnecessary code created because of implicit returns
 * DS206: Consider reworking classes to avoid initClass
 * Full docs: https://github.com/decaffeinate/decaffeinate/blob/master/docs/suggestions.md
 */
let LinkLayers;
module.exports = (LinkLayers = (function() {
  LinkLayers = class LinkLayers {
    static initClass() {
  
      this.prototype.id = 1026;
      this.prototype.name = 'LinkLayers';
    }

    constructor(resource) {
      this.resource = resource;
      this.file = this.resource.file;
      this.linkArray = [];
    }

    parse() {
      const end = this.file.tell() + this.resource.length;

      while (end > this.file.tell()) {
        this.linkArray.push(this.file.readShort());
      }
    
      //in the same order as layers
      return this.linkArray.reverse();
    }
  };
  LinkLayers.initClass();
  return LinkLayers;
})());