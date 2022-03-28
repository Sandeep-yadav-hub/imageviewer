var url = "http://localhost:5500/test.tiff";

var url2 =
  "https://media.geeksforgeeks.org/wp-content/uploads/20200327230544/g4gicon.png";

loadMockTiffImage = async () => {
  // Create a new XMLHttpRequest object to read the mock TIFF image as ArrayBuffer
  const xhr = new XMLHttpRequest();

  // Configure it: GET-request for the URL
  xhr.open("GET", url, true);
  xhr.responseType = "arraybuffer";
  xhr.timeout = 10000; // timeout in ms, 10 seconds

  // Send the request over the network
  xhr.send();

  // After the response is received, load it
  xhr.onload = () => {
    // analyze HTTP status of the response
    if (xhr.status !== 200) {
      // throw error incase status is not 200
      console.log(`Error ${xhr.status}: ${xhr.statusText}`);
    } else {
      // Show the result
      console.log(`Done, got ${xhr.response.byteLength} bytes`);
      console.log(xhr.response);
      // Add to canvas the XHR response which is of type ArrayBuffer
      addTiffImageOnCanvas(xhr.response);
    }
  };

  // Show progress of loading the bytes
  xhr.onprogress = (event) => {
    if (event.lengthComputable) {
      console.log(`Received ${event.loaded} of ${event.total} bytes`);
    } else {
      console.log(`Received ${event.loaded} bytes`); // no Content-Length
    }
  };

  // Log any network request errors
  xhr.onerror = () => {
    console.log("Request failed!");
  };
};

function imagedata_to_image(imagedata) {
  var canvas = document.createElement("canvas");
  var ctx = canvas.getContext("2d");
  canvas.width = imagedata.width;
  canvas.height = imagedata.height;
  ctx.putImageData(imagedata, 0, 0);

  var image = new Image();
  image.src = canvas.toDataURL();
  return image;
}

addTiffImageOnCanvas = async (buffer) => {
  /// Using UTIF.js to decode the array buffer and convert it to ImageData
  const ifds = UTIF.decode(buffer);
  const timage = ifds[0];
  UTIF.decodeImage(buffer, timage);
  const array = new Uint8ClampedArray(UTIF.toRGBA8(timage));
  // Forming image Data
  const imageData = new ImageData(array, timage.width, timage.height);
  var image = imagedata_to_image(imageData);
  //   document.body.appendChild(image);
  var canvas = new fabric.Canvas("c");
  var imgElement = document.getElementById("mySrc");
  imgElement.src = image.src;
  new fabric.Image.fromURL(image.src, function (myImg) {
    var img1 = myImg.set({ left: 0, top: 0, width: 600, height: 600 });
    canvas.add(img1);
  });
};
