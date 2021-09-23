/*
 * decaffeinate suggestions:
 * DS102: Remove unnecessary code created because of implicit returns
 * Full docs: https://github.com/decaffeinate/decaffeinate/blob/master/docs/suggestions.md
 */
const RSVP = require('rsvp');

module.exports = { 
  toBase64() {
    // Draw the pixels to the canvas
    const canvas = document.createElement('canvas');
    canvas.width = this.width();
    canvas.height = this.height();
    const context = canvas.getContext('2d');

    const imageData = context.getImageData(0, 0, this.width(), this.height());
    const pixelData = imageData.data;

    for (let i = 0; i < this.pixelData.length; i++) { const pixel = this.pixelData[i]; pixelData[i] = pixel; }

    context.putImageData(imageData, 0, 0);

    return canvas.toDataURL('image/png');
  },

  toPng() {
    const dataUrl = this.toBase64();
    // Create the image and set the source to the
    // canvas data URL.
    const image = new Image();
    image.width = this.width();
    image.height = this.height();
    image.src = dataUrl;

    return image;
  },

  saveAsPng() {
    throw "Not available in the browser. Use toPng() instead.";
  }
};
