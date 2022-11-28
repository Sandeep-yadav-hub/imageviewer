// note clean up document selcor and parent selctor with created function function and $parent (search:"'$scopes'"), if have free time

pdfReader = window.pdfjsLib;
pdfReader.workerSrc = window.pdfjsWorker;

var pageNumber = 1;
var TotalpageNumber = 1;
var selector = undefined
var crop = {}
var SCALE_FACTOR = 1.3;
var zoomMax = 10;
var scope = 1
var rotateBy = 90
var currentZoom = 1
var currentRotation = 0
var currentImageInView = undefined
var CurrentFileinView = undefined
var currentTiffBuffer = undefined;
var OCRMode = false;
var mousePointer = false;
var fileDetails = {};


// '$scopes'
const $selector = function(selctor){
  return document.querySelector(selctor)
}
const $parent = window.parent;



const notification = document.querySelector(".notification")
const message = document.querySelector(".message")
const PageNumber = document.getElementById("pages").innerHTML;
const TotalPageNumber = document.getElementById("totalpageNumber");
const Parent = window.parent

$selector("#pages").innerHTML = pageNumber;
$selector("#totalpageNumber").innerHTML = TotalpageNumber;



var rect, isDown, origX, origY;
const cursorUrl = "./assets/iconsAndImages/figma-cursor.png";
const CANVAS = new fabric.Canvas("c", { selection: false });
CANVAS.defaultCursor = `url(" ${cursorUrl} "), auto`;
CANVAS.hoverCursor = `url(" ${cursorUrl} "), auto`;
CANVAS.hoverCursor = `pointer, auto`;
CANVAS.moveCursor = `url(" ${cursorUrl} "), auto`;
CANVAS.backgroundColor = "grey";
// logicForfreeDrawRectInsideFabricCanvas

CANVAS.on("mouse:down", function (o) {
  console.log(o)
  isDown = true;
  var pointer = CANVAS.getPointer(o.e);
  origX = pointer.x;
  origY = pointer.y;
  var pointer = CANVAS.getPointer(o.e);
  crop.left = origX;
  crop.top = origY;
  rect = new fabric.Rect({
    left: origX,
    top: origY,
    originX: "left",
    originY: "top",
    width: pointer.x - origX,
    height: pointer.y - origY,
    strokeDashArray: [10, 3],
    stroke: "red",
    angle: 0,
    fill: "#e6b1fc",
    opacity: 0.4,
  });
  selector = rect
  CANVAS.add(rect);
});

CANVAS.on("mouse:move", function (o) {
  if (!isDown) return;
  var pointer = CANVAS.getPointer(o.e);
  mousePointer = pointer; 
  if (origX > pointer.x) {
    selector.set({ left: Math.abs(pointer.x) });
  }
  if (origY > pointer.y) {
    selector.set({ top: Math.abs(pointer.y) });
  }


  selector.set({ width: Math.abs(origX - pointer.x) });
  selector.set({ height: Math.abs(origY - pointer.y) });

  CANVAS.renderAll();

});



CANVAS.on("mouse:up", async (o) =>{
  isDown = false;
  var toCrop = {
    format: "png",
    left: (crop.left + 2 /scale) * CANVAS.getZoom(), // to hide the stoke (2)
    top: (crop.top + 2 /scale) * CANVAS.getZoom(), // to hide the stoke (2)
    width: selector.width,
    height: selector.height,
  }; 
  var cropped = await cropImage(toCrop)
  if (selector.width>0 ||selector.height>0){
    var message = {
      typ: "cropped",
      base64Encoded: cropped.image,
      height: cropped.fromData.height,
      width: cropped.fromData.width,
    };
    sendcroppedFrameToParent(message);
    Parent.postMessage(
      {
        typ: "toCrop",
        toCrop,
      },
      "*"
    );
  }

  CANVAS.remove(selector)
  CANVAS.renderAll();
});

try{
  path = window.location.search.split("?")[1].split("=")[1];
}catch{
  path = undefined
}

window.addEventListener("message",async(event)=>{
  console.log("event recived",event)
  if (event.data.typ=="cropThis"){
    var cropThis = await cropImage(event.data.toCrop);
    var message = {
      typ: "showCroppedaskedFromParent",
      base64Encoded: cropThis.image,
      height: cropThis.fromData.height,
      width: cropThis.fromData.width,
    };
    sendcroppedFrameToParent(message);

  }
  if(event.data.typ=="openImage"){
    loadfile(event.data.flPath);
  }
})


const Flash = async({message,status,timeout=2000})=>{
  notification.classList.remove("hide")
  notification.classList.add(status)
  notification.textContent = message
  setTimeout(() => {
    notification.classList.add("hide")
  }, timeout);
}

const ProgressBar = document.querySelector(".progessBarContainer");
const TaskInProgress = document.querySelector(".taskInProgress");
const ProgressValue = document.querySelector(".taskInProgress");

loadMockTiffImage = async (path) => {
  // Create a new XMLHttpRequest object to read the mock TIFF image as ArrayBuffer
  ProgressBar.classList.add("flex");
  TaskInProgress.textContent = "Fetching";


  const xhr = new XMLHttpRequest();

  // Configure it: GET-request for the URL
  if (path){
    xhr.open("GET", path, true);
  }else{
    xhr.open("GET", url, true);
  }
  xhr.responseType = "arraybuffer";
  xhr.timeout = 10000; // timeout in ms, 10 seconds

  // Send the request over the network
  xhr.send();

  // After the response is received, load it
  xhr.onload = () => {
    // analyze HTTP status of the response
    if (xhr.status !== 200) {
      // throw error incase status is not 200
      document.querySelector(".progressValue").textContent = "Error";
      // console.log(`Error ${xhr.status}: ${xhr.statusText}`);
    } else {
      // Show the result
      document.querySelector(".progressValue").textContent = "Completed";
      document.querySelector(".progessBarContainer").classList.remove("flex");
      // console.log(`Done, got ${xhr.response.byteLength} bytes`);
      // console.log(xhr.response);
      
      // Add to canvas the XHR response which is of type ArrayBuffer
      openTiffFile(xhr.response);
    }
  };

  // Show progress of loading the bytes
  xhr.onprogress = (event) => {
    if (event.lengthComputable) {
      document.querySelector(".progress").value =
        (event.loaded / event.total) * 100;
      document.querySelector(".progressValue").textContent = (
        (event.loaded / event.total) *
        100
      ).toFixed(2);
      // console.log(`Received ${event.loaded} of ${event.total} bytes`);
    } else {
      // console.log(`Received ${event.loaded} bytes`); // no Content-Length
    }
  };

  // Log any network request errors
  xhr.onerror = () => {
    console.log("Request failed!");
  };
};

reduceDimension = function (width, height){
  var maxWidth = window.screen.width; // Max width for the image
  var maxHeight = window.screen.height; // Max height for the image
  var ratio = 0; // Used for aspect ratio
  var width = width; // Current image width
  var height = height; // Current image height:
  // Check if the current width is larger than the max
  if (width > height) {
    if (width > maxWidth) {
      height = height * (maxWidth / width);
      width = maxWidth;
    }
  } else {
    if (height > maxHeight) {
      width = width * (maxHeight / height);
      height = maxHeight;
    }
  }

  return {width,height};
};

compressingOnProgress = async(progess)=>{
  console.log(progess);
  if (progess){
    document.querySelector(".progress").value = progess;
    document.querySelector(".progressValue").textContent = progess;
    if (progess==100){
      document.querySelector(".progessBarContainer").classList.remove("flex");
    }
  }
}

const options = {
  maxSizeMB:4, // (default: Number.POSITIVE_INFINITY)
  maxWidthOrHeight: 1000, // compressedFile will scale down by ratio to a point that width or height is smaller than maxWidthOrHeight (default: undefined)
  onProgress: compressingOnProgress, // optional, a function takes one progress argument (percentage from 0 to 100)
  useWebWorker: true, // optional, use multi-thread web worker, fallback to run in main-thread (default: true)
};

renderTiff = async(canvas,imageData)=>{
  canvas.toBlob(async (blob)=> {
    console.log(blob)
    var newImg = document.createElement("img");
    // console.log("originalFile instanceof Blob", blob instanceof Blob); // true
    // console.log(`originalFile size ${blob.size / 1024 / 1024} MB`);
    document.querySelector(".taskInProgress").textContent = "Compressing";
    document.querySelector(".progessBarContainer").classList.add("flex");
    compress = await imageCompression(blob,options)
    // console.log("compressedFile instanceof Blob", compress instanceof Blob); // true
    // console.log(`compressedFile size ${compress.size / 1024 / 1024} MB`); // smaller than maxSizeMB
    url = URL.createObjectURL(compress);
    
    newImg.onload = function () {
      // no longer need to read the blob so it's revoked
      URL.revokeObjectURL(url);
    };

    newImg.src = url;
    fabric.Image.fromURL(newImg.src, function (myImg) {
      var img1 = myImg.set({
        // width: imageData.width,
        // height: imageData.height,
        selectable: false,
        left: 0,
        top: 0,
        angle: 0,
      });
      document.getElementById("pages").textContent = pageNumber + 1;
      
      CANVAS.add(img1);
      CANVAS.setHeight(img1.height+60);
      if (img1.height<window.innerHeight){
        CANVAS.setHeight(window.innerHeight-100);
      }
      CANVAS.setWidth(window.innerWidth);
      CANVAS.centerObject(img1);
      CANVAS.renderAll();
      currentImageInView = img1;
      document.querySelector(".spinner").classList.add("hide");
      document.querySelector(".textLayer").innerHTML = " ";
      document.getElementById("OCR").checked = true;
      document.querySelector(".textLayer").style.display = "none";
      Flash({ message: "Loaded", status: "success"});
      scale = 1
    });
  },"image/png");
}

addTiffImageOnCanvas = async () => {

  CANVAS.remove(currentImageInView);
  CANVAS.getObjects().map((item) => {
    CANVAS.remove(item);
  });
  const timage = CurrentFileinView[pageNumber];
  UTIF.decodeImage(currentTiffBuffer, timage);
  // changes to try
  var array = new Uint8ClampedArray(UTIF.toRGBA8(timage));
  // Forming image Data

  var imagedata = new ImageData(array, timage.width, timage.height);
  var canva = document.createElement("canvas");
  var ctx = canva.getContext("2d");
  resizedImage = reduceDimension(imagedata.width, imagedata.height);
  canva.width = imagedata.width;
  canva.height = imagedata.height;
  ctx.putImageData(imagedata, 0, 0);
  var image = new Image();
  image.src = canva.toDataURL();
  renderTiff(canva, resizedImage);
  return
};

openTiffFile = async (buffer) => {
  CANVAS.remove(currentImageInView);
  CANVAS.getObjects().map((item) => {
    CANVAS.remove(item);
  });
  CANVAS.renderAll();
  currentTiffBuffer = undefined;
  currentTiffBuffer = buffer;

  pageNumber = 0;
  /// Using UTIF.js to decode the array buffer and convert it to ImageData
  CurrentFileinView = UTIF.decode(buffer);
  document.getElementById("totalpageNumber").textContent =CurrentFileinView.length;
  if (CurrentFileinView.length == 1) {
    document.getElementById("navigationButton").classList.add("hide");
  }else{
    document.getElementById("navigationButton").classList.remove("hide");
  }
  document.getElementById("jumpTo").value = 1;
  addTiffImageOnCanvas();
  return;
};

const loadPdf = async(path)=>{
  currentTiffBuffer = undefined
  loadingTask = pdfjsLib.getDocument(path);
  init()
}
function next() {
  pageNumber++;

  document.querySelector(".spinner").classList.remove("hide");
  document.getElementById("jumpTo").value = pageNumber;
  if (currentTiffBuffer == undefined) {
    loadPageFromPDF();
  } else {
    document.getElementById("jumpTo").value = pageNumber + 1;
    addTiffImageOnCanvas();
  }
}
function goTo(){
  document.querySelector(".spinner").classList.remove("hide");
  console.log(document.getElementById("jumpTo").value)
  pageNumber = document.getElementById("jumpTo").value;
  if (currentTiffBuffer == undefined) {
    loadPageFromPDF();
  } else {
    pageNumber--
    
    addTiffImageOnCanvas();
  }
}
function prev() {
  document.querySelector(".spinner").classList.remove("hide");
  pageNumber--;
  document.getElementById("jumpTo").value = pageNumber;
  if (currentTiffBuffer == undefined) {
    loadPageFromPDF();
  } else {
    document.getElementById("jumpTo").value = pageNumber + 1;
    addTiffImageOnCanvas();
  }
}
const loadTextFromPage = async (viewport) => {
  CurrentFileinView.getPage(pageNumber).then(function (page) {
    page.getTextContent().then(function (textContent) {
      if (textContent.items.length>0){
        // Assign CSS to the textLayer element
        var textLayer = document.querySelector(".textLayer");
        console.log(CANVAS.getObjects()[0]);
        console.log(CANVAS.getObjects()[0]);
        textLayer.style.left = String(CANVAS.getObjects()[0].left) + "px";
        textLayer.style.top = String(CANVAS.getObjects()[0].top) + "px";
        // textLayer.style.height = viewport.height + "px";
        // textLayer.style.width = viewport.width + "px";
        // CANVAS.getObjects()[0]
        textLayer.style.height = CANVAS.getObjects()[0].height + "px";
        textLayer.style.width = CANVAS.getObjects()[0].width + "px";
  
        // Pass the data to the method for rendering of text over the pdf canvas.
        pdfjsLib.renderTextLayer({
          textContent: textContent,
          container: textLayer,
          viewport: viewport,
          textDivs: [],
        });
        document.getElementById("OCR").checked = false;
        document.querySelector(".textLayer").style.display = "initial";
      }else{
        document.getElementById("OCR").checked = true;
        document.querySelector(".textLayer").style.display = "none";
      }
    });
  });
};
const loadPageFromPDF = async()=>{
  CurrentFileinView.getPage(parseInt(pageNumber)).then(function (page) {
    console.log("Page loaded");
    var scale = 1.5;
    var viewport = page.getViewport({ scale: scale });

    // Prepare canvas using PDF page dimensions
    // var canvas = document.getElementById('c');
    var canvas = document.createElement("canvas");
    // canvas.id = "canvas";
    var context = canvas.getContext("2d");
    canvas.height = viewport.height+60;
    canvas.width = window.innerWidth;

    // Render PDF page into canvas context
    var renderContext = {
      canvasContext: context,
      viewport: viewport,
    };
    var renderTask = page.render(renderContext);
    renderTask.promise.then(async () =>{
      console.log("Page rendered");
      await loadf(canvas, viewport);
      document.getElementById("pages").textContent = pageNumber;
    })
  });
}
const init = async () => {
  loadingTask.promise.then(
    function (pdf) {
      console.log("PDF loaded");
      // Fetch the first page
      TotalpageNumber = pdf.numPages;
      if (TotalpageNumber == 1){
        document.getElementById("navigationButton").classList.add("hide");
      }else{
        document.getElementById("navigationButton").classList.remove("hide");
      }
      document.getElementById("pages").innerHTML = pageNumber;
      document.getElementById("totalpageNumber").innerHTML = TotalpageNumber;
      CurrentFileinView = pdf
      pageNumber = 1
      document.getElementById("jumpTo").value = pageNumber;
      loadPageFromPDF()
    },
    function (reason) {
      // PDF loading error
      console.error(reason);
    }
  );
  
};

const loadf = async (canvas, viewport)=> {
  var bg = canvas.toDataURL("image/png");
  var canvas = CANVAS;
  fabric.Image.fromURL(bg, function (myImg) {
    var img1 = myImg.set({
      width: viewport.width,
      height: viewport.height,
      selectable: false,
      left: 0,
      top: 0,
      angle: 0,
    });
    canvas.remove(currentImageInView);
    canvas.add(img1);
    // canvas.setHeight(viewport.height);
    // canvas.setWidth(viewport.width);
    canvas.setHeight(viewport.height+60);
    canvas.setWidth(window.innerWidth);
    canvas.centerObject(img1);
    canvas.renderAll();
    currentImageInView = img1;
    Flash({ message: "Image Loaded", status: "success" });
    document.querySelector(".textLayer").innerHTML = " ";
    document.querySelector(".spinner").classList.add("hide");
    loadTextFromPage(viewport);
    scale = 1
  });
}

function loadImageToCanvas(path){
  document.querySelector(".textLayer").style.display = "none";
  fabric.Image.fromURL(path, function (myImg) {
    console.log(myImg.width);
    var img1 = myImg.set({
      selectable: false,
      width: myImg.width,
      height: myImg.height,
      left: 0,
      top: 0,
      angle: 0,
    });
    CANVAS.getObjects().map(item=>{
      console.log(item)
      CANVAS.remove(item)
    })
    CANVAS.remove(currentImageInView);
    CANVAS.add(img1);
    CANVAS.setWidth(window.innerWidth);
    CANVAS.setHeight(myImg.height);
    if(CANVAS.getWidth()<window.innerHeight){
      CANVAS.setHeight(window.innerHeight);
    }
    CANVAS.centerObject(img1);
    CANVAS.renderAll();
    document.getElementById("OCR").checked = true;
    document.querySelector(".textLayer").style.display = "none";
    document.querySelector(".spinner").classList.add("hide");
    currentImageInView = img1;
  });
}

const handleImageControChange = async(img)=>{
      CANVAS.remove(currentImageInView);
      CANVAS.add(img);
      if (CANVAS.item(0).angle == 90 || CANVAS.item(0).angle == 270 || CANVAS.item(0).angle == -90 || CANVAS.item(0).angle == -270) {
        CANVAS.setHeight(img.width+60);
        CANVAS.setWidth(img.height + 60);
      } else{
        CANVAS.setHeight(img.height + 60);
        CANVAS.setWidth(window.innerWidth);
      }
      CANVAS.centerObject(img);
      CANVAS.renderAll();
      currentImageInView = img;
}


CANVAS.on("mouse", function (o) {
  console.log(o);
});


const sendcroppedFrameToParent=async(message)=>{
  window.parent.postMessage(
    message,
    "*"
  );
}

const cropImage = async(value)=>{
  return {
    image: CANVAS.toDataURL({
      format: value.format,
      left: value.left,
      top: value.top,
      width: value.width,
      height: value.height,
    }),
    fromData: {
      format: value.format,
      left: value.left,
      top: value.top,
      width: value.width,
      height: value.height,
    },
  };
}

// controls
const controls = async (todo) => {
  if (todo == "zoomIn") {
    zoomIn();
  } else if (todo == "zoomOut") {
    zoomOut();
  } else if (todo == "reset") {
    resetZoom();
    rotateUp();
  } else if (todo == "rotateLeft") {
    rotateLeft();
  } else if (todo == "rotateRight") {
    rotateRight();
  } else if ( todo == "OCR"){
    var isChecked = document.getElementById("OCR").checked;
    if (isChecked) {
      document.querySelector(".textLayer").style.display = "none"
    } else {
      document.querySelector(".textLayer").style.display = "initial";
    }
  }
};


// Zoom In
function zoomIn() {
  if (CANVAS.getZoom() >= zoomMax ) {
    console.log("zoomIn: Error: cannot zoom-in anymore");
    return;
  }
  // CANVAS.zoomToPoint({ x: mousePointer.x, y: mousePointer.y }, CANVAS.getZoom() * zoomBy); // zoomToPoint with mousePoint
  CANVAS.setZoom(CANVAS.getZoom() * SCALE_FACTOR);
  CANVAS.setHeight(currentImageInView.canvas.height* SCALE_FACTOR);
  CANVAS.setWidth(CANVAS.getWidth() * SCALE_FACTOR);
  console.log(currentImageInView, currentImageInView.canvas);
  scale = scale / SCALE_FACTOR;
  CANVAS.renderAll();
}
// Zoom Out
function zoomOut() {
  if (CANVAS.getZoom() <= 1 || (CANVAS.getWidth() / SCALE_FACTOR) < window.innerWidth) {
    console.log("zoomOut: Error: cannot zoom-out anymore");
    return;
  }
  CANVAS.setZoom(CANVAS.getZoom() / SCALE_FACTOR);
  CANVAS.setHeight(CANVAS.getHeight() / SCALE_FACTOR);
  CANVAS.setWidth(CANVAS.getWidth() / SCALE_FACTOR);
  scale = scale * SCALE_FACTOR;
  CANVAS.renderAll();
}

// Reset Zoom
function resetZoom() {
  CANVAS.setHeight(CANVAS.getHeight() / CANVAS.getZoom());
  CANVAS.setWidth(CANVAS.getWidth() / CANVAS.getZoom());
  CANVAS.setZoom(1);
  CANVAS.centerObject(currentImageInView);
  scale=1
  CANVAS.renderAll();
}
// rotateLeft
function rotateLeft(){
  var curAngle = CANVAS.item(0).angle;
  CANVAS.item(0).angle = curAngle - 90;
  if (CANVAS.item(0).angle < -360 ) {
    CANVAS.item(0).angle = 0;
  }
  console.log(CANVAS.item(0).angle);
  handleImageControChange(CANVAS.item(0));
}
// rotateRight
function rotateRight(){
  var curAngle = CANVAS.item(0).angle;
  CANVAS.item(0).angle = curAngle + 90;
  if (CANVAS.item(0).angle>360){
    CANVAS.item(0).angle = 0
  }
  console.log(CANVAS.item(0).angle);
  handleImageControChange(CANVAS.item(0));
}
// rotateUp
function rotateUp(){
  CANVAS.item(0).angle = 0;
  handleImageControChange(CANVAS.item(0));
}
function rotateDown(){
  CANVAS.item(0).angle = 180;
  handleImageControChange(CANVAS.item(0));
}
const loadfile = async(path)=>{
  if (path) {
    console.log(path.split(".")[1],"ExT");
    document.querySelector(".spinner").classList.remove("hide")
    document.querySelector(".fileName").textContent = path.split("/")[path.split("/").length - 1];
    fileDetails = {
      name: path.split("/")[path.split("/").length - 1],
      path: path
    }
    if (["tiff", "tif","TIFF","TIF"].includes(path.split(".")[path.split(".").length-1])) {
      loadMockTiffImage("imageviewer.github.io/"+path);
    } else if (["pdf", "PDF"].includes(path.split(".")[path.split(".").length - 1])) {
      loadPdf("imageviewer.github.io/"+path);
    } else {
      loadImageToCanvas("imageviewer.github.io/"+path);
    }
  }
}
loadfile(path);

var pressed = ""
document.addEventListener(
  "keyup",
  (event) => {
    event.preventDefault();
    var name = event.key;
    var code = event.code;
    // Alert the key name and key code on keydown
    console.log(code);
    if(event.key == "≠" ){
      zoomIn()
    }
    if(event.key=="–"){
      zoomOut()
    }
    if (event.key == "ArrowLeft" && pressed =="Alt") {
      rotateLeft();
    }
    if (event.key == "ArrowRight" && pressed =="Alt") {
      rotateRight();
    }
    if (event.key == "ArrowUp" && pressed =="Alt") {
      rotateUp();
    }
    if (event.key == "ArrowDown" && pressed =="Alt") {
      rotateDown();
    }
    if (event.key == "ArrowDown" && pressed =="Alt") {
      rotateDown();
    }
    if (["KeyR", "Space"].includes(code) && pressed == "Alt") {
      console.log("r");
      resetZoom();
      rotateUp();
    }
    if (event.key == "Alt") {
      pressed = "";
    }
  },
  false
);
document.addEventListener(
  "keydown",
  (event) => {
    // event.preventDefault();
    var name = event.key;
    var code = event.code;
    // Alert the key name and key code on keydown
    if (event.key == "Alt") {
      pressed = event.key;
    } else if (
      ["≠", "–", "ArrowRight", "ArrowUp", "ArrowDown", "ArrowLeft",""].includes(
        event.key
      ) || ["KeyR","Space"].includes(event.code)
    ) {
      console.log("")
    } else {
      pressed = "";
    }
  },
  false
);


const hideNotification=async()=>{
  document.querySelector(".notification").classList.add("hide");
}
