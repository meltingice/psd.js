/*
 * decaffeinate suggestions:
 * DS101: Remove unnecessary use of Array.from
 * DS102: Remove unnecessary code created because of implicit returns
 * DS206: Consider reworking classes to avoid initClass
 * Full docs: https://github.com/decaffeinate/decaffeinate/blob/master/docs/suggestions.md
 */
let ResourceSection;
const _ = require('lodash');

module.exports = (ResourceSection = (function() {
  let RESOURCES = undefined;
  ResourceSection = class ResourceSection {
    static initClass() {
      RESOURCES = [
        require('./resources/layer_comps.js'),
        require('./resources/layer_links.js'),
        require('./resources/resolution_info.js'),
        require('./resources/guides.js')
      ];
    }

    static factory(resource) {
      for (let Section of Array.from(RESOURCES)) {
        if (Section.prototype.id !== resource.id) { continue; }
        return _.tap(new Section(resource), s => s.parse());
      }

      return null;
    }
  };
  ResourceSection.initClass();
  return ResourceSection;
})());