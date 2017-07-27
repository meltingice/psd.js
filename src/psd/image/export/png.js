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

export { imageToPng }
