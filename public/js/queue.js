const Toast = Swal.mixin({
  toast: true,
  position: 'top-end',
  showConfirmButton: false,
  timer: 2000,
});

let globalChannel = document
  .getElementById('pageInfo')
  .getAttribute('data-channel');

let loggedInUser = document
  .getElementById('pageInfo')
  .getAttribute('data-loggedIn');

let enviroment = document
  .getElementById('pageInfo')
  .getAttribute('data-enviroment');

Sentry.init({
  dsn:
    'https://32998bbe6f964551a6680d9343ae5270@o421094.ingest.sentry.io/5340398',
  enviroment: enviroment,
});
Sentry.configureScope(function (scope) {
  scope.setUser({ username: `loggedInUser` });
});

var socket = io('/req-namescape');

socket.emit('create', `${globalChannel}`);

socket.on('socketConnect', function (data) {
  Toast.fire({
    type: 'success',
    title: 'Socket Connected!',
  });
});

// Get song requests
fetch(`/api/queue/${globalChannel}`)
  .then((res) => res.json())
  .then((requests) => {
    console.log(requests);
    let reqDiv = document.getElementById('requests');
    requests.forEach((request, index) => {
      if (request === null) {
        return;
      }
      let reqElem = document.createElement('div');
      let artist;
      if (request.track.artist !== undefined) {
        artist = `- ${request.track.artist}`;
      } else {
        artist = '';
      }
      reqElem.setAttribute('id', `${request.id}`);
      reqElem.setAttribute('class', 'song mb-3 border rounded');
      reqElem.innerHTML = `
      <div class="song-top p-2">
        <div class="d-flex flex-column">
            <a class="srName pl-2" href="${request.track.link}" target="_blank">
            ${request.track.name} ${artist} </a>
        </div>
      </div>
      <div class="reqBy p-2 border-bottom"><i class="far fa-user ml-2 mr-2"></i>${request.requestedBy}</div>
      <div class="song-ctrl d-flex p-2">
        <a href="#" data-srID="${request.id}" class="reqDelBtn p-1 flex-fill text-center rounded">
          Delete
        </a>
        <a href="#" data-srID="${request.id}" data-move="down" class="moveBtn p-1 ml-1 flex-fill text-center rounded"><i class="fas fa-angle-down"></i></a>
        <a href="#" data-srID="${request.id}" data-move="up" class="moveBtn p-1 ml-1 flex-fill text-center rounded"><i class="fas fa-angle-up"></i></a>
        <!--<a href="#" data-uri="${request.track.uri}" class="playBtn p-1 flex-fill text-center">Play <i class="fas fa-play-circle"></i></a>-->
      </div>
    `;
      reqDiv.prepend(reqElem);
      gsap.from(`#sr${request._id}`, {
        opacity: 0,
        y: -50,
        duration: 0.5,
        ease: 'power4.out',
      });
    });
  });

// Realtime song request
socket.on('sr-event', (request) => {
  try {
    console.log('New Request');
    console.log(request);
    let reqDiv = document.getElementById('requests');
    let reqElem = document.createElement('div');
    let artist;
    if (request.artist !== undefined) {
      artist = `- ${request.artist}`;
    } else {
      artist = '';
    }
    reqElem.setAttribute('class', 'song mb-3 border');
    reqElem.setAttribute('id', `${request.id}`);
    reqElem.innerHTML = `
      <div class="song-top p-2">
        <div class="d-flex flex-column">
            <a class="srName pl-2" href="${request.link}" target="_blank">
            ${request.track} ${artist} </a>
        </div>
      </div>
      <div class="reqBy p-2"><i class="far fa-user ml-2 mr-2"></i>${request.reqBy}</div>
      <div class="song-ctrl d-flex p-2">
        <a href="#" data-srID="${request.id}" class="reqDelBtn p-1 flex-fill text-center">
          Delete
        </a>
        <a href="#" data-srID="${request.id}" data-move="down" class="moveBtn p-1 ml-1 flex-fill text-center rounded"><i class="fas fa-angle-down"></i></a>
        <a href="#" data-srID="${request.id}" data-move="up" class="moveBtn p-1 ml-1 flex-fill text-center rounded"><i class="fas fa-angle-up"></i></a>
        <!--<a href="#" data-uri="${request.uri}" class="playBtn p-1 flex-fill text-center">Play <i class="fas fa-play-circle"></i></a>-->
      </div>
    `;
    reqDiv.prepend(reqElem);
    gsap.from(`#sr${request.id}`, {
      opacity: 0,
      y: -50,
      duration: 0.5,
      ease: 'power4.out',
    });
  } catch (err) {
    console.error(err);
  }
});

// Checks how long ago song was requested
var timeDiff = setInterval(reqTime, 1000);

function reqTime() {
  $('.timeReq').each(function () {
    var ago = moment.utc(`${$(this).attr('data-time')}`).fromNow();
    $(this).text(`${ago}`);
  });
}

// Move song
document.addEventListener(
  'click',
  (e) => {
    if (!e.target.matches('.moveBtn')) return;
    e.preventDefault();
    console.log(e.target.getAttribute('data-srID'));
    var srId = e.target.getAttribute('data-srID');
    var move = e.target.getAttribute('data-move');
    var xhr = new XMLHttpRequest();
    xhr.open('PUT', `/api/queues/${globalChannel}/move-${move}/${srId}`);
    xhr.onload = function () {
      if (xhr.status === 200) {
        try {
          Toast.fire({
            type: 'success',
            title: `Song moved ${move}`,
          });

          // console.log(xhr.response);
          let songs = document.querySelectorAll('.song');
          // console.log(songs);
          songs.forEach((song) => {
            song.remove();
          });

          // re-create list
          let reqDiv = document.getElementById('requests');
          let newQueue = JSON.parse(xhr.response);
          newQueue.forEach((request, index) => {
            if (request === null) {
              return;
            }
            let reqElem = document.createElement('div');
            let artist;
            if (request.track.artist !== undefined) {
              artist = `- ${request.track.artist}`;
            } else {
              artist = '';
            }
            reqElem.setAttribute('id', `${request.id}`);
            reqElem.setAttribute('class', 'song mb-3 border rounded');
            reqElem.innerHTML = `
              <div class="song-top p-2">
                <div class="d-flex flex-column">
                    <a class="srName pl-2" href="${request.track.link}" target="_blank">
                    ${request.track.name} ${artist} </a>
                </div>
              </div>
              <div class="reqBy p-2 border-bottom"><i class="far fa-user ml-2 mr-2"></i>${request.requestedBy}</div>
              <div class="song-ctrl d-flex p-2">
                <a href="#" data-srID="${request.id}" class="reqDelBtn p-1 flex-fill text-center rounded">
                  Delete
                </a>
                <a href="#" data-srID="${request.id}" data-move="down" class="moveBtn p-1 ml-1 flex-fill text-center rounded"><i class="fas fa-angle-down"></i></a>
                <a href="#" data-srID="${request.id}" data-move="up" class="moveBtn p-1 ml-1 flex-fill text-center rounded"><i class="fas fa-angle-up"></i></a>
                <!--<a href="#" data-uri="${request.track.uri}" class="playBtn p-1 flex-fill text-center">Play <i class="fas fa-play-circle"></i></a>-->
              </div>
            `;
            reqDiv.prepend(reqElem);
          });

          // console.log(beforeID);
        } catch (err) {
          console.error(err);
        }
      } else {
        swal.fire({
          type: 'error',
          title: 'Error moving song!',
          text: `${xhr.responseText}`,
        });
      }
    };
    xhr.send();
  },
  false
);

function removeDiv(div) {
  console.log(div);
  let srDiv = document.getElementById(div);
  srDiv.remove();
}

// NEW Delete Song Request
document.addEventListener(
  'click',
  (e) => {
    if (!e.target.matches('.reqDelBtn')) return;
    e.preventDefault();
    console.log(e.target.getAttribute('data-srID'));
    var srID = e.target.getAttribute('data-srID');
    var xhr = new XMLHttpRequest();
    xhr.open('DELETE', `/api/queues/${globalChannel}/delete-song/${srID}`);
    xhr.onload = function () {
      if (xhr.status === 200) {
        try {
          gsap.to(`#sr${srID}`, {
            opacity: 0,
            y: -50,
            duration: 0.5,
            ease: 'power4.out',
            onComplete: removeDiv,
            onCompleteParams: [`sr${srID}`],
          });
          Toast.fire({
            type: 'success',
            title: 'Song Request removed!',
          });
        } catch (err) {
          console.error(err);
        }
      } else {
        swal.fire({
          type: 'error',
          title: 'Error deleting song!',
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
  'click',
  (e) => {
    if (!e.target.matches('.delMixBtn')) return;
    e.preventDefault();
    console.log(e.target.getAttribute('data-srID'));
    var srID = e.target.getAttribute('data-srID');
    var xhr = new XMLHttpRequest();
    xhr.open('DELETE', `/api/mixes/${globalChannel}/delete/${srID}`);
    xhr.onload = function () {
      if (xhr.status === 200) {
        try {
          gsap.to(`#mix${srID}`, {
            opacity: 0,
            y: -50,
            duration: 0.5,
            ease: 'power4.out',
            onComplete: removeDiv,
            onCompleteParams: [`mix${srID}`],
          });
          Toast.fire({
            type: 'success',
            title: 'Song Request removed!',
          });
        } catch (err) {
          console.error(err);
        }
      } else {
        swal.fire({
          type: 'error',
          title: 'Error deleting song!',
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
  'click',
  (e) => {
    if (!e.target.matches('.delete-reqs')) return;
    e.preventDefault();
    swal
      .fire({
        title: `Are you sure you want to clear the queue?`,
        text: "You won't be able to revert this!",
        type: 'warning',
        showCancelButton: true,
        confirmButtonColor: '#3085d6',
        cancelButtonColor: '#d33',
        confirmButtonText: 'Yes, delete it!',
      })
      .then((result) => {
        if (result.value) {
          var xhr = new XMLHttpRequest();
          xhr.open('DELETE', `/api/requests/${globalChannel}/clearqueue`);
          xhr.onload = function () {
            if (xhr.status === 200) {
              Swal.fire({
                title: 'Cleared!',
                text: `Queue has been cleared.`,
                type: 'success',
                timer: 500,
                allowOutsideClick: false,
                allowEscapeKey: false,
                onBeforeOpen: () => {
                  Swal.showLoading();
                },
                onClose: () => {
                  let songs = document.querySelectorAll('.song');
                  console.log(songs);
                  songs.forEach((song) => {
                    song.remove();
                  });
                },
              });
            } else {
              Swal.fire(
                'Uh Oh!',
                `There was an error clearing the queue. Error: ${xhr.responseText}`,
                'error'
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
  'click',
  (e) => {
    if (!e.target.matches('.delete-mix')) return;
    e.preventDefault();
    swal
      .fire({
        title: `Are you sure you want to clear the queue?`,
        text: "You won't be able to revert this!",
        type: 'warning',
        showCancelButton: true,
        confirmButtonColor: '#3085d6',
        cancelButtonColor: '#d33',
        confirmButtonText: 'Yes, delete it!',
      })
      .then((result) => {
        if (result.value) {
          var xhr = new XMLHttpRequest();
          xhr.open('DELETE', `/api/mixes/${globalChannel}/clear`);
          xhr.onload = function () {
            if (xhr.status === 200) {
              Swal.fire({
                title: 'Cleared!',
                text: `Queue has been cleared.`,
                type: 'success',
                timer: 500,
                allowOutsideClick: false,
                allowEscapeKey: false,
                onBeforeOpen: () => {
                  Swal.showLoading();
                },
                onClose: () => {
                  let songs = document.querySelectorAll('.mix-song');
                  console.log(songs);
                  songs.forEach((song) => {
                    song.remove();
                  });
                },
              });
            } else {
              Swal.fire(
                'Uh Oh!',
                `There was an error clearing the mix. Error: ${xhr.responseText}`,
                'error'
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
