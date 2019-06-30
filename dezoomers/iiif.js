// IIIF Image API 2.1
var iiif = (function(){
  return {
    "name" : "IIIF",
    "description": "International Image Interoperability Framework",
    "urls" : [
      /\/info.json$/
    ],
    "contents" : [
      /https?:\/\/[^\s"']*\/info\.json/
    ],
    "findFile" : function getInfoFile (baseUrl, callback) {
      if (baseUrl.match(/info\.json$/)) {
        return callback(baseUrl);
      }
      ZoomManager.getFile(baseUrl, {type:"htmltext"}, function (text) {
          var infoMatch = text.match(/https?:\/\/[^\s"']*\/info\.json/);
          if (infoMatch) {
            return callback(infoMatch[0]);
          }
          throw new Error("No IIIF URL found.");
      });
    },
    "open" : function (url) {
      ZoomManager.getFile(url, {type:"json"}, function (data, xhr) {
        function min(array){return Math.min.apply(null, array)}
        function searchWithDefault(array, search, defaultValue) {
          // Return the searched value if it's in the array.
          // Else, return the first value of the array, or defaultValue if the array is empty or invalid
          var array = (array && array.length) ? array : [defaultValue];
          return ~array.indexOf(search) ? search : array[0];
        }

        var tiles =
          (data.tiles && data.tiles.length)
            ? data.tiles.reduce(function(red, val){
                  return min(red.scaleFactors) < min(val.scaleFactors) ? red : val;
              })
            : {"width": data.tile_width || 512, "scaleFactors": [1]};

        var returned_data = {
          "origin": data["@id"] || url.replace(/\/info\.json$/, ''),
          "width" : parseInt(data.width),
          "height" : parseInt(data.height),
          "tileSize" : tiles.width,
          "maxZoomLevel" : Math.min.apply(null, tiles.scaleFactors),
          "quality" : searchWithDefault(data.qualities, "native", "default"),
          "format" : searchWithDefault(data.formats, "png", "jpg")
        };
        var img = new Image; // Load a tile to find out the real tile size
        img.src = getTileURL(0, 0, returned_data.maxZoomLevel, returned_data);
        img.addEventListener("load", function(){
          returned_data.tileSize = Math.max(img.width, img.height);
          ZoomManager.readyToRender(returned_data);
        });
        img.addEventListener("error", function(){
          ZoomManager.readyToRender(returned_data); // Try rendering anyway
          ZoomManager.error("Unable to load first tile: " + img.src);
        });
      });
    },
    "getTileURL" : getTileURL
  };

  function getTileURL (x, y, zoom, data) {
    var s = data.tileSize,
        pxX = x*s, pxY = y*s;
        //The image size is adjusted for edges
        //width
        if (pxX + s > data.width) {
          sx = data.width - pxX;
        } else {
          sx = s;
        }
        //height
        if (pxY + s > data.height) {
          sy = data.height - pxY;
        } else {
          sy = s;
        }
    return data.origin + "/" +
                        pxX    + "," + // source image X
                        pxY    + "," + // source image Y
                        sx      + "," + // source image width
                        sy      + "/" + // source image height
                        sx      + "," + // returned image width
                        ""      + "/" + // returned image height
                        "0"    + "/" + //rotation
                        data.quality + "." + //quality
                        data.format; //format
  }
})();
ZoomManager.addDezoomer(iiif);
