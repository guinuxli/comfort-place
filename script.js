const images = [
    "../assets/draw1.jpeg",
    "../assets/draw2.jpeg",
    "../assets/draw3.jpeg"
];

const image = document.querySelector("#draws");
const nextButton = document.querySelector("#next");
const previousButton = document.querySelector("#previous");

const casseteImage = document.getElementById("cassete");
const song = document.getElementById("song");

let currentImage = 1;

function showImage(index) {
    currentImage = (index + images.length) % images.length;
    image.src = images[currentImage];
    image.alt = `Artwork ${currentImage + 1} of ${images.length}`;
}

nextButton.addEventListener("click", () => {
    showImage(currentImage + 1);
});

previousButton.addEventListener("click", () => {
    showImage(currentImage - 1);
});

casseteImage.addEventListener("click", () => {
    if(song.paused) {
        song.play();
    }
    else {
        song.pause();
    }
});
