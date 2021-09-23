/*
 * decaffeinate suggestions:
 * DS102: Remove unnecessary code created because of implicit returns
 * DS207: Consider shorter variations of null checks
 * Full docs: https://github.com/decaffeinate/decaffeinate/blob/master/docs/suggestions.md
 */
const _ = require('lodash');

module.exports = {
  childrenAtPath(path, opts) {
    if (opts == null) { opts = {}; }
    if (!Array.isArray(path)) {
      path = path.split('/').filter(p => p.length > 0);
    }

    path = _.clone(path);
    const query = path.shift();
    const matches = this.children().filter(function(c) {
      if (opts.caseSensitive) {
        return c.name === query;
      } else {
        return c.name.toLowerCase() === query.toLowerCase();
      }
    });

    if (path.length === 0) {
      return matches;
    } else {
      return _.flatten(matches.map(m => m.childrenAtPath(_.clone(path), opts))
      );
    }
  }
};