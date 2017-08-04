import { PNG } from 'pngjs'

function imageToPng(image) {
  const png = new PNG({
    filterType: 4,
    width: image.width,
    height: image.height
  });

  png.data = image.pixelData;
  return png;
}

function toBase64(image) {
  const canvas = document.createElement('canvas');
  canvas.width = image.width;
  canvas.height = image.height;

  const context = canvas.getContext('2d');
  const imageData = context.getImageData(0, 0, image.width, image.height);
  const pixelData = imageData.data;

  for (var i = 0, len = image.pixelData.length; i < len; i++) {
    pixelData[i] = image.pixelData[i];
  }

  context.putImageData(imageData, 0, 0);
  return canvas.toDataURL('image/png');
}

function toDOMImage(image) {
  const dataUrl = toBase64(image);

  // Create the image and set the source to the
  // canvas data URL.
  const img = document.createElement('img');
  img.width = image.width;
  img.height = image.height;
  img.src = dataUrl;

  return img;
}

export {
  imageToPng,
  toBase64,
  toDOMImage
}
