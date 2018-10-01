(function (root, factory) {
  if (typeof define === 'function' && define.amd) {
      define([], factory);
  } else if (typeof module === 'object' && module.exports) {
      module.exports = factory();
  } else {
      root.MarkovChainImage = factory();
  }
}(typeof self !== 'undefined' ? self : this, function () {
  "use strict";

  var colorCompression = 1;

  const mask = [
    {dx: -1, dy: 0},
    {dx: 0, dy: -1},
    {dx: 1, dy: 0},
    {dx: 0, dy: 1}
  ];

  function compress(value) {
    return Math.floor(value / colorCompression) * colorCompression;
  }

  function compressColor(color) {
    return {
      r: compress(color.r),
      g: compress(color.g),
      b: compress(color.b)
    };
  }

  function keyFromColor(color) {
    return color.r + "," + color.g + "," + color.b;
  }

  function colorFromKey(key) {
    let array = key.split(",");
    return {
      r: parseInt(array[0]),
      g: parseInt(array[1]),
      b: parseInt(array[2])
    };
  }

  var MarkovChainImage = function () {
    this.model = {};
  }

  MarkovChainImage.prototype = {
    setCompression: function (k) {
      if (!isNaN(parseInt(k))) {
        colorCompression = parseInt(k);
      }
    },

    updateModel: function (key, color) {
      if (typeof(this.model[key]) === "undefined") {
        this.model[key] = [];
      }
      this.model[key].push(compressColor(color));
    },

    feed: function(img) {
      let width = img.width;
      let height = img.height;

      let id = 0, n_id = 0, key = "", color = {};
      for (let x = 0; x < width; x++) {
        for (let y = 0; y < height; y++) {

          id = (x + y * width) << 2;
          color = compressColor({
            r: img.data[id],
            g: img.data[id+1],
            b: img.data[id+2]
          });
          key = keyFromColor(color);

          for (let m of mask) {
            if(x + m.dx >= 0 && y + m.dy >= 0 && x + m.dx < width && y + m.dy < height) {
              n_id = (x+m.dx + (y+m.dy) * width) << 2;
              this.updateModel(key, {
                r: img.data[n_id],
                g: img.data[n_id+1],
                b: img.data[n_id+2]
              });
            }
          }
        }
      }
    },

    feed_async: function (img) {
      return new Promise(function(resolve, reject) {
        this.feed(img);
        resolve();
      }.bind(this));
    },

    getRandomColor: function () {
      let key_list = Object.keys(this.model);
      return colorFromKey( key_list[Math.floor(Math.random() * key_list.length)] );
    },

    getNeighbourColor: function (color) {
      let key = keyFromColor(color);
      if (typeof this.model[key] === "undefined") {
        return null;
      }
      return this.model[key][ Math.floor(Math.random() * this.model[key].length) ];
    }
  }

  // Worker message
  if (typeof self !== "undefined") {
    self.onmessage = function(e) {
      MarkovChainImage.feed_async(e.data.img).then(function () {
        postMessage({message: "ok"});
      });
    }
  }

  return MarkovChainImage;
}));
