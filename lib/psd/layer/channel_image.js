/*
 * decaffeinate suggestions:
 * DS102: Remove unnecessary code created because of implicit returns
 * Full docs: https://github.com/decaffeinate/decaffeinate/blob/master/docs/suggestions.md
 */
const ChannelImage = require('../channel_image.coffee');
const LazyExecute  = require('../lazy_execute.coffee');

module.exports = {
  parseChannelImage() {
    const image = new ChannelImage(this.file, this.header, this);
    return this.image = new LazyExecute(image, this.file)
      .now('skip')
      .later('parse')
      .get();
  }
};
