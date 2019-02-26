(function (root, factory) {
  if (typeof define === 'function' && define.amd) { define([], factory); }
  else if (typeof module === 'object' && module.exports) { module.exports = factory(); }
  else { root.MarkovChainImage = factory(); }
}(typeof self !== 'undefined' ? self : this, function () { 'use strict';

  var RandomQueue = function (size) {
    this.container = new Array(size);
    this.lastIdx = 0;

    this.length = function () {
      return this.lastIdx;
    };

    this.enqueue = function (e) {
      this.container[this.lastIdx++] = e;
    };

    this.dequeue = function () {
      if(this.lastIdx == 0) {
        return null;
      }
      let idx = Math.floor(Math.random() * this.lastIdx);
      let t = this.container[idx];
      this.container[idx] = this.container[--this.lastIdx];
      return t;
    }
  };

  var neighbors = [{x: -1, y: 0}, {x: 0, y: -1}, {x: 1, y: 0}, {x: 0, y: 1}];
  var colorCompression = 1;
  var model = {};

  function getColor(imgData, index) {
    return {r: imgData[index], g: imgData[index+1], b: imgData[index+2]};
  }

  function setColor(imgData, index, color) {
    imgData[index] = color.r;
    imgData[index+1] = color.g;
    imgData[index+2] = color.b;
    imgData[index+3] = 255;
  }

  function setCompression(k) {
    if (!isNaN(parseInt(k))) {
      colorCompression = parseInt(k);
    }
  }

  function compress(value) {
    return Math.floor(value / colorCompression) * colorCompression;
  }

  function compressColor(color) {
    return {r: compress(color.r), g: compress(color.g), b: compress(color.b)};
  }

  function keyFromColor(color) {
    return "" + color.r + "," + color.g + "," + color.b;
  }

  function colorFromKey(key) {
    let array = key.split(",");
    return {r: parseInt(array[0]), g: parseInt(array[1]), b: parseInt(array[2])};
  }

  function addColorTransition(firstColor, secondColor) {
    let firstKey = keyFromColor(compressColor(firstColor));
    let secondKey = keyFromColor(compressColor(secondColor));
    if (!model.hasOwnProperty(firstKey)) {
      model[firstKey] = new Array();
    }
    model[firstKey].push(secondKey);
  }

  function getColorTransition(color) {
    let firstKey = keyFromColor(color);
    if (!model.hasOwnProperty(key)) {
      return null;
    }
    let secondKey = model[firstKey][Math.floor(Math.random() * model[firstKey].length)];
    return colorFromKey(secondKey);
  }

  function getRandomColor() {
    let allKeys = Object.keys(model);
    if (allKeys.length == 0) {
      return null;
    }
    let firstKey = allKeys[Math.floor(Math.random() * allKeys.length)];
    let secondKey = model[firstKey][Math.floor(Math.random() * model[firstKey].length)];
    return colorFromKey(secondKey);
  }

  function feed(image) {
    let x = 0, y = 0, idx = 0, color = null;
    let xN = 0, yN = 0, idxN = 0, colorN = null;
    for (x = 0; x < image.width; x++) {
      for (y = 0; y < image.height; y++) {
        idx = (x + y * image.width) << 2;
        color = getColor(image.data, idx);
        for (let k = 0; k < neighbors.length; k++) {
          xN = x + neighbors[k].x;
          yN = y + neighbors[k].y;
          if (xN >= 0 && xN < image.width && yN >= 0 && yN < image.height) {
            idxN = (xN + yN * image.width) << 2;
            colorN = getColor(image.data, idxN);
            addColorTransition(color, colorN);
          }
        }
      }
    }
  }

  function feedAsync(image) {
    return new Promise(function(resolve, reject) {
      feed(image);
      resolve();
    });
  }

  function createImageData(ctx, width, height) {
    if (Object.keys(model).length == 0) {
      return null;
    }
    let imgData = ctx.createImageData(width, height);
    let queue = new RandomQueue(width*height * 0.001);
    // initialization
    let x = Math.floor(Math.random() * width);
    let y = Math.floor(Math.random() * height);
    let idx = (x + y * width) << 2;
    let color = getRandomColor();
    setColor(imgData, idx, color);
    queue.enqueue([x, y]);
    // creation loop
    let coords = null, i = 0;
    let xN = 0, yN = 0, idxN = 0, colorN = null;
    while (queue.length() > 0) {
      coords = queue.dequeue();
      x = coords[0];
      y = coords[1];
      idx = (x + y * width) << 2;
      color = getColor(imgData, index);
      for (i = 0; i < neighbors.length; i++) {
        xN = x + neighbors[i].x;
        yN = y + neighbors[i].y;
        if (xN >= 0 && xN < width && yN >= 0 && yN < height) {
          idxN = (xN + yN * width) << 2;
          if (imgData[idxN+3] != 255) {
            colorN = getColorTransition(color);
            setColor(imgData, idxN, colorN);
            queue.enqueue([xN, yN]);
          }
        }
      }
    }
    return imgData;
  }

  var MarkovChainImage = function () {
    this.resetModel = function () {
      model = {};
    };

    this.setCompression = setCompression;

    this.addColorTransition = addColorTransition;
    this.getColorTransition = getColorTransition;
    this.getRandomColor = getRandomColor;

    this.feed = feed;
    this.feedAsync = feedAsync;
    this.createImageData = createImageData;
  }


  // Worker message
  if (typeof self !== "undefined") {
    self.onmessage = function(e) {
      feedAsync(e.data.image).then(function () {
        postMessage({message: "ok", model: model});
      });
    }
  }

  return MarkovChainImage;
}));
