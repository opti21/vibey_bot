const Toast = Swal.mixin({
  toast: true,
  position: "top-end",
  showConfirmButton: false,
  timer: 2000,
});

let globalChannel = document
  .getElementById("pageInfo")
  .getAttribute("data-channel");

// $(document).ready(function() {
//   $("#sr-table").DataTable({
//     fixedHeader: true,
//     ordering: false,
//     paging: false
//   });
//
//  $("#requests-nav").addClass("active");
//});

var socket = io("/req-namescape");

// socket.emit("create", `${globalChannel}`);

socket.on("socketConnect", function (data) {
  Toast.fire({
    type: "success",
    title: "Socket Connected!",
  });
});

// Get song requests
fetch(`/api/requests/${globalChannel}`)
  .then((res) => res.json())
  .then((requests) => {
    console.log(requests);
    let reqDiv = document.getElementById("requests");
    requests.forEach((request) => {
      let reqElem = document.createElement("div");
      let artist;
      if (request.track.artist !== undefined) {
        artist = `- ${request.track.artist}`;
      } else {
        artist = "";
      }
      reqElem.setAttribute("id", `${request._id}`);
      reqElem.setAttribute("class", "song mb-3 border rounded");
      reqElem.innerHTML = `
      <!-- <div class="progress" style="height: 10px;">
          <div class="progress-bar" role="progressbar" style="width: 25%" aria-valuenow="25" aria-valuemin="0" aria-valuemax="100"></div>
        </div> -->
      <div class="song-top p-2">
        <div class="d-flex flex-column">
            <a class="srName pl-2" href="${request.track.link}" target="_blank">
            ${request.track.name} ${artist} </a>
        </div>
      </div>
      <div class="reqBy p-2 border-bottom"><i class="far fa-user ml-2 mr-2"></i>${request.requestedBy}</div>
      <div class="song-ctrl d-flex p-2">
        <a href="#" data-srID="${request._id}" class="reqDelBtn p-1 flex-fill text-center rounded-left">
          Delete
        </a>
        <a href="#" data-srID="${request._id}" class="addMixBtn p-1 flex-fill text-center rounded-right">Mix +</a>
        <!--<a href="#" data-uri="${request.track.uri}" class="playBtn p-1 flex-fill text-center">Play <i class="fas fa-play-circle"></i></a>-->
      </div>
    `;
      reqDiv.prepend(reqElem);
    });
  });

// Get current mix
fetch(`/api/mixes/${globalChannel}`)
  .then((res) => res.json())
  .then((mixes) => {
    console.log(mixes);
    let mixDiv = document.getElementById("mix");
    mixes.forEach((mixReq) => {
      let mixElem = document.createElement("div");
      let artist;
      if (mixReq.track.artist !== undefined) {
        artist = `- ${mixReq.track.artist}`;
      } else {
        artist = "";
      }
      mixElem.setAttribute("id", `mix${mixReq._id}`);
      mixElem.setAttribute("class", "mix-song mb-3 border");
      mixElem.innerHTML = `
      <div class="song-top p-2">
        <div class="d-flex flex-column">
            <a class="srName pl-2" href="${mixReq.track.link}" target="_blank">
            ${mixReq.track.name} ${artist} </a>
        </div>
      </div>
      <div class="reqBy p-2"><i class="far fa-user ml-2 mr-2"></i>${mixReq.requestedBy}</div>
      <div class="song-ctrl d-flex ">
        <a href="#" data-srID="${mixReq._id}" class="delMixBtn p-1 flex-fill text-center">Mix -</a>
        <!--<a href="#" data-uri="${mixReq.track.uri}" class="playBtn p-1 flex-fill text-center">Play <i class="fas fa-play-circle"></i></a>-->
      </div>
    `;
      mixDiv.prepend(mixElem);
    });
  });

// Realtime song request
socket.on("sr-event", (request) => {
  try {
    console.log("New Request");
    console.log(request);
    let reqDiv = document.getElementById("requests");
    let reqElem = document.createElement("div");
    let artist;
    if (request.artist !== undefined) {
      artist = `- ${request.artist}`;
    } else {
      artist = "";
    }
    reqElem.setAttribute("class", "song mb-3 border");
    reqElem.setAttribute("id", `${request.id}`);
    reqElem.innerHTML = `
      <div class="song-top p-2">
        <div class="d-flex flex-column">
            <a class="srName pl-2" href="${request.link}" target="_blank">
            ${request.track} ${artist} </a>
        </div>
      </div>
      <div class="reqBy p-2"><i class="far fa-user ml-2 mr-2"></i>${request.reqBy}</div>
      <div class="song-ctrl d-flex ">
        <a href="#" data-srID="${request.id}" class="reqDelBtn p-1 flex-fill text-center">
          Delete
        </a>
        <a href="#" data-srID="${request.id}" class="addMixBtn p-1 flex-fill text-center">Mix +</a>
        <!--<a href="#" data-uri="${request.uri}" class="playBtn p-1 flex-fill text-center">Play <i class="fas fa-play-circle"></i></a>-->
      </div>
    `;
    reqDiv.prepend(reqElem);
  } catch (err) {
    console.error(err);
  }
});

// Checks how long ago song was requested
var timeDiff = setInterval(reqTime, 1000);

function reqTime() {
  $(".timeReq").each(function () {
    var ago = moment.utc(`${$(this).attr("data-time")}`).fromNow();
    $(this).text(`${ago}`);
  });
}

// realtime song add to mix
socket.on("mix-add", (data) => {
  try {
    console.log("Add song to Mix");
    console.log(data);
    let request = data;
    let mixDiv = document.getElementById("mix");
    let mixElem = document.createElement("div");
    let artist;
    if (request.artist !== undefined) {
      artist = `- ${request.artist}`;
    } else {
      artist = "";
    }
    mixElem.setAttribute("class", "mix-song mb-3 border");
    mixElem.setAttribute("id", `mix${request.id}`);
    mixElem.innerHTML = `
      <div class="song-top p-2">
        <div class="d-flex flex-column">
            <a class="srName pl-2" href="${request.link}" target="_blank">
            ${request.track} ${artist} </a>
        </div>
      </div>
      <div class="reqBy p-2"><i class="far fa-user ml-2 mr-2"></i>${request.reqBy}</div>
      <div class="song-ctrl d-flex ">
        <a href="#" data-srID="${request.id}" class="delMixBtn p-1 flex-fill text-center">Mix -</a>
        <!--<a href="#" data-uri="${request.uri}" class="playBtn p-1 flex-fill text-center">Play <i class="fas fa-play-circle"></i></a>-->
      </div>
    `;
    mixDiv.prepend(mixElem);
  } catch (err) {
    console.error(err);
  }
});

// new Add request to mix
document.addEventListener(
  "click",
  (e) => {
    if (!e.target.matches(".addMixBtn")) return;
    e.preventDefault();
    console.log(e.target.getAttribute("data-srID"));
    var srId = e.target.getAttribute("data-srID");
    var xhr = new XMLHttpRequest();
    xhr.open("POST", `/api/mixes/${globalChannel}/add/${srId}`);
    xhr.onload = function () {
      if (xhr.status === 200) {
        try {
          Toast.fire({
            type: "success",
            title: "Song Added to Mix!",
          });
        } catch (err) {
          console.error(err);
        }
      } else {
        swal.fire({
          type: "error",
          title: "Error adding song!",
          text: `${xhr.responseText}`,
        });
      }
    };
    xhr.send();
  },
  false
);

// NEW Delete Song Request
document.addEventListener(
  "click",
  (e) => {
    if (!e.target.matches(".reqDelBtn")) return;
    e.preventDefault();
    console.log(e.target.getAttribute("data-srID"));
    var srID = e.target.getAttribute("data-srID");
    var xhr = new XMLHttpRequest();
    xhr.open("DELETE", `/api/requests/${globalChannel}/delete/${srID}`);
    xhr.onload = function () {
      if (xhr.status === 200) {
        try {
          let srDiv = document.getElementById(`${srID}`);
          srDiv.remove();
          Toast.fire({
            type: "success",
            title: "Song Request removed!",
          });
        } catch (err) {
          console.error(err);
        }
      } else {
        swal.fire({
          type: "error",
          title: "Error deleting song!",
          text: `${xhr.responseText}`,
        });
      }
    };
    xhr.send();
  },
  false
);

// new Delete request from mix
document.addEventListener(
  "click",
  (e) => {
    if (!e.target.matches(".delMixBtn")) return;
    e.preventDefault();
    console.log(e.target.getAttribute("data-srID"));
    var srID = e.target.getAttribute("data-srID");
    var xhr = new XMLHttpRequest();
    xhr.open("DELETE", `/api/mixes/${globalChannel}/delete/${srID}`);
    xhr.onload = function () {
      if (xhr.status === 200) {
        try {
          let songDiv = document.getElementById(`mix${srID}`);
          songDiv.remove();
          Toast.fire({
            type: "success",
            title: "Song Request removed!",
          });
        } catch (err) {
          console.error(err);
        }
      } else {
        swal.fire({
          type: "error",
          title: "Error deleting song!",
          text: `${xhr.responseText}`,
        });
      }
    };
    xhr.send();
  },
  false
);

// NEW Clear queue
document.addEventListener(
  "click",
  (e) => {
    if (!e.target.matches(".delete-reqs")) return;
    e.preventDefault();
    swal
      .fire({
        title: `Are you sure you want to clear the queue?`,
        text: "You won't be able to revert this!",
        type: "warning",
        showCancelButton: true,
        confirmButtonColor: "#3085d6",
        cancelButtonColor: "#d33",
        confirmButtonText: "Yes, delete it!",
      })
      .then((result) => {
        if (result.value) {
          var xhr = new XMLHttpRequest();
          xhr.open("DELETE", `/api/requests/${globalChannel}/clearqueue`);
          xhr.onload = function () {
            if (xhr.status === 200) {
              Swal.fire({
                title: "Cleared!",
                text: `Queue has been cleared.`,
                type: "success",
                timer: 500,
                allowOutsideClick: false,
                allowEscapeKey: false,
                onBeforeOpen: () => {
                  Swal.showLoading();
                },
                onClose: () => {
                  let songs = document.querySelectorAll(".song");
                  console.log(songs);
                  songs.forEach((song) => {
                    song.remove();
                  });
                },
              });
            } else {
              Swal.fire(
                "Uh Oh!",
                `There was an error clearing the queue. Error: ${xhr.responseText}`,
                "error"
              );
            }
          };
          xhr.send();
        }
      });
  },
  false
);

// NEW Clear mix
document.addEventListener(
  "click",
  (e) => {
    if (!e.target.matches(".delete-mix")) return;
    e.preventDefault();
    swal
      .fire({
        title: `Are you sure you want to clear the queue?`,
        text: "You won't be able to revert this!",
        type: "warning",
        showCancelButton: true,
        confirmButtonColor: "#3085d6",
        cancelButtonColor: "#d33",
        confirmButtonText: "Yes, delete it!",
      })
      .then((result) => {
        if (result.value) {
          var xhr = new XMLHttpRequest();
          xhr.open("DELETE", `/api/mixes/${globalChannel}/clear`);
          xhr.onload = function () {
            if (xhr.status === 200) {
              Swal.fire({
                title: "Cleared!",
                text: `Queue has been cleared.`,
                type: "success",
                timer: 500,
                allowOutsideClick: false,
                allowEscapeKey: false,
                onBeforeOpen: () => {
                  Swal.showLoading();
                },
                onClose: () => {
                  let songs = document.querySelectorAll(".mix-song");
                  console.log(songs);
                  songs.forEach((song) => {
                    song.remove();
                  });
                },
              });
            } else {
              Swal.fire(
                "Uh Oh!",
                `There was an error clearing the mix. Error: ${xhr.responseText}`,
                "error"
              );
            }
          };
          xhr.send();
        }
      });
  },
  false
);

// document.addEventListener("click", (e) => {
//   if (!e.target.matches(".playBtn")) return;
//   e.preventDefault();
//   console.log("test");

//   // <iframe
//   //   src="https://open.spotify.com/embed/track/5iFwAOB2TFkPJk8sMlxP8g"
//   //   width="100%"
//   //   height="80"
//   //   frameborder="0"
//   //   allowtransparency="true"
//   //   allow="encrypted-media"
//   // ></iframe>;
//   let uri = e.target.getAttribute("data-uri").slice(13);
//   let playerDiv = document.getElementById("nowplaying");
//   console.log(uri);
// });

// document.addEventListener("click", (e) => {
//   if (!e.target.matches(".songpoll")) return;
//   e.preventDefault();
//   var xhr = new XMLHttpRequest();
//   xhr.open("POST", `/api/polls/opensongpoll/${globalChannel}`);
//   xhr.onload = function () {
//     if (xhr.status === 200) {
//       try {
//         Toast.fire({
//           type: "success",
//           title: "Song Poll Started",
//         });
//       } catch (err) {
//         swal.fire({
//           type: "error",
//           title: "Error startng poll",
//         });
//         console.error(err);
//       }
//     } else if (xhr.status === 418) {
//       swal.fire({
//         type: "error",
//         title: "Poll already running",
//       });
//     } else {
//       swal.fire({
//         type: "error",
//         title: "Error deleting song!",
//         text: `${xhr.responseText}`,
//       });
//     }
//   };
//   xhr.send();
// });

// // Generate random IDs for table elements
// function makeid(length) {
//   var result = "";
//   var characters =
//     "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789";
//   var charactersLength = characters.length;
//   for (var i = 0; i < length; i++) {
//     result += characters.charAt(Math.floor(Math.random() * charactersLength));
//   }
//   return result;
// }
