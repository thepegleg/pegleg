let params = new URLSearchParams(window.location.search);
let movid = params.get("id");
let streamurl;
if (movid) {
  fetch("https://vidapi.cbass92.org/vidsrc/" + movid)
    .then((response) => response.json())
    .then((data) => {
      console.log(data);
      const validsources = [];
      data.sources.forEach((source) => {
        console.log(source);
        if (source.isM3U8) {
          validsources.push(source);
        }
      });
      if (validsources.length > 0) {
        streamurl = validsources[0].url;
        const embed = document.createElement("embed");
        embed.frameborder = "0";
        embed.width = "800";
        embed.height = "450";
        embed.src = "player/index.html?video=" + streamurl + '.m3u8&subtitle=' + data.subtitles[0].url ;
        document.body.appendChild(embed);
      } else {
        console.log("No valid sources found. :(");
        document.write("No valid sources found. :(");
      }
    });
} else {
  document.write("No movie ID .'-'.");
}
