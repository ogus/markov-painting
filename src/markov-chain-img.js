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
      var idx = Math.floor(Math.random() * this.lastIdx);
      var t = this.container[idx];
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
    var array = key.split(",");
    return {r: parseInt(array[0]), g: parseInt(array[1]), b: parseInt(array[2])};
  }

  function addColorTransition(firstColor, secondColor) {
    var firstKey = keyFromColor(compressColor(firstColor));
    var secondKey = keyFromColor(compressColor(secondColor));
    if (!model.hasOwnProperty(firstKey)) {
      model[firstKey] = new Array();
    }
    model[firstKey].push(secondKey);
  }

  function getColorTransition(color) {
    var keyColor = keyFromColor(color);
    if (!model.hasOwnProperty(keyColor)) {
      return null;
    }
    var newKeyColor = model[keyColor][Math.floor(Math.random() * model[keyColor].length)];
    return colorFromKey(newKeyColor);
  }

  function getRandomColor() {
    var allKeys = Object.keys(model);
    if (allKeys.length == 0) {
      return null;
    }
    var key = allKeys[Math.floor(Math.random() * allKeys.length)];
    return colorFromKey(key);
  }

  function feed(imageData) {
    var x = 0, y = 0, idx = 0, color = null;
    var xN = 0, yN = 0, idxN = 0, colorN = null;
    for (x = 0; x < imageData.width; x++) {
      for (y = 0; y < imageData.height; y++) {
        idx = (x + y * imageData.width) << 2;
        color = getColor(imageData.data, idx);
        for (var k = 0; k < neighbors.length; k++) {
          xN = x + neighbors[k].x;
          yN = y + neighbors[k].y;
          if (xN >= 0 && xN < imageData.width && yN >= 0 && yN < imageData.height) {
            idxN = (xN + yN * imageData.width) << 2;
            colorN = getColor(imageData.data, idxN);
            addColorTransition(color, colorN);
          }
        }
      }
    }
  }

  function createImageData(width, height) {
    var imgData = new Uint8ClampedArray((width * height) << 2);
    var queue = new RandomQueue(width*height * 0.001);
    // initialization
    var x = Math.floor(Math.random() * width);
    var y = Math.floor(Math.random() * height);
    var idx = (x + y * width) << 2;
    var color = getRandomColor();
    setColor(imgData, idx, color);
    queue.enqueue([x, y]);
    // creation loop
    var coords = null, i = 0;
    var xN = 0, yN = 0, idxN = 0, colorN = null;
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

    this.setCompression = function () {
      if (!isNaN(parseInt(k))) {
        colorCompression = parseInt(k);
      }
    };

    this.feed = function (imageData, async) {
      if (!async) {
        return feed(imageData);
      }
      return new Promise(function(resolve, reject) {
        feed(imageData);
        resolve();
      });
    };

    this.createImageData = function (width, height) {
      if (Object.keys(model).length == 0) {
        return null;
      }
      return createImageData(width, height);
    };

    this.addColorTransition = addColorTransition;
    this.getColorTransition = getColorTransition;
    this.getRandomColor = getRandomColor;
  };

  // Worker message
  if (typeof self !== "undefined") {
    self.onmessage = function(e) {
      model = {};
      var inputData = e.data;
      feed(inputData);
      var outputData = createImageData(inputData.width, inputData.height)
      postMessage(outputData);
    }
  }

  return MarkovChainImage;
}));
