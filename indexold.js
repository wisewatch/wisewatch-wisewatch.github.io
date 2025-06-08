if("serviceWorker" in navigator){
  navigator.serviceWorker.register("https://kingpenguin1400.github.io/show-and-movie-finder/sw.js").then(registration => {
    console.log("SW Registered!");
    console.log(registration);
  }).catch(error =>{
    console.log("SW Registration Failed!");
    console.log(error);
  }
}
