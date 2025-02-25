let params = new URLSearchParams(window.location.search);
let movid = params.get("id");
let streamurl;
if (movid) {
  var season = prompt("season?");
  var episode = prompt("episode?");
  fetch(
    "https://vidapi.cbass92.org/embedsu/" +
      movid +
      "?s=" +
      season +
      "&e=" +
      episode
  )
    .then((response) => response.json())
    .then((data) => {
      console.log(data);
      const validsources = [];
      data.sources[0].files.forEach((source) => {
        console.log(source);
        if (source.type == 'hls') {
          validsources.push(source);
        }
      });
      if (validsources.length > 0) {
        streamurl = validsources[0].file;
        const embed = document.createElement("embed");
        embed.frameborder = "0";
        embed.width = "800";
        embed.height = "450";
        embed.src = "player/index.html?video="+streamurl+"&subtitle=" + data.subtitles[0].url
        document.body.appendChild(embed);
      } else {
        console.log("No valid sources found. :(");
        document.write("No valid sources found. :(");
      }
    });
} else {
  document.write("No series ID .'-'.");
}
