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

var socket = io('/req-namescape');

socket.emit('create', `${globalChannel}`);

socket.on('socketConnect', function (data) {
  Toast.fire({
    type: 'success',
    title: 'Socket Connected!',
  });
});

// Get queue
fetch(`/api/queue/${globalChannel}`)
  .then((res) => res.json())
  .then((queue) => {
    let status = queue.allowReqs;
    let currQueue = queue.currQueue;
    let statusBadge = document.getElementById('status');
    let statusToggle = document.getElementById('statusToggle');
    let reqDiv = document.getElementById('requests');

    switch (status) {
      case true:
        statusBadge.setAttribute('class', 'badge badge-success');
        statusBadge.innerHTML = 'Open';
        statusToggle.setAttribute('class', 'btn btn-danger m-2 queueToggle');
        statusToggle.setAttribute('data-action', 'close-queue');
        statusToggle.innerHTML = 'Close Queue';
        break;
      case false:
        statusBadge.setAttribute('class', 'badge badge-danger');
        statusBadge.innerHTML = 'Closed';
        statusToggle.setAttribute('class', 'btn btn-success m-2 queueToggle');
        statusToggle.setAttribute('data-action', 'open-queue');
        statusToggle.innerHTML = 'Open Queue';
        break;
    }

    currQueue.forEach((request, index) => {
      if (request === null) {
        return;
      }
      console.log(request)
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
        <a href="#" data-srID="${request.id}" data-action="delete-req" class="reqDelBtn p-1 flex-fill text-center rounded">
          Delete
        </a>
        <a href="#" data-srID="${request.id}" data-action="move-req" data-move="down" class="moveBtn p-1 ml-1 flex-fill text-center rounded"><i class="fas fa-angle-down"></i></a>
        <a href="#" data-srID="${request.id}" data-action="move-req"  data-move="up" class="moveBtn p-1 ml-1 flex-fill text-center rounded"><i class="fas fa-angle-up"></i></a>
        <!--<a href="#" data-uri="${request.track.uri}" class="playBtn p-1 flex-fill text-center">Play <i class="fas fa-play-circle"></i></a>-->
      </div>
    `;
      reqDiv.prepend(reqElem);
      // gsap.from(`#${request.id}`, {
      //   opacity: 0,
      //   y: -50,
      //   duration: 0.5,
      //   ease: 'power4.out',
      // });
    });
  })
  .catch((err) => {
    console.error('Error retreving queue');
  });

// Get notifications
fetch(`/api/events/${globalChannel}`)
  .then((res) => res.json())
  .then((events) => {
    events.forEach((noti) => {
      //console.log(noti);
      let data = noti.data;

      switch (noti.type) {
        case 'sub':
          createSubNoti(
            makeid(10),
            data.username,
            data.method,
            data.message,
            true
          );
          break;

        case 'SMG':
          createSMG(
            makeid(10),
            data[0].userGivingSubs,
            data[0].numbOfSubs,
            data[0].senderTotal,
            data.slice(1),
            true
          );
          break;

        case 'subgift':
          createSubGiftNoti(
            makeid(10),
            data.username,
            data.recipient,
            senderTotal,
            true
          );
          break;

        case 'resub':
          createResubNoti(
            makeid(10),
            data.username,
            data.userstate['msg-param-cumulative-months'],
            data.message,
            true
          );
          break;

        case 'raid':
          createRaidNoti(makeid(10), data.username, data.viewers, true);
          break;

        case 'cheer':
          console.log('Cheer alert');
          createCheerNoti(
            makeid(10),
            data.userstate.username,
            data.userstate.bits,
            data.message,
            true
          );
          break;

        case 'test':
          console.log('Test noti');
          break;

        default:
          console.log('Other alert');
          console.log(noti);
          break;
      }
    });
  });

// clicks
document.addEventListener(
  'click',
  (e) => {
    if (!e.target.attributes['data-action']) return;
    switch (e.target.attributes['data-action'].value) {
      case 'open-queue':
        {
          e.preventDefault();
          console.log('open');
          var xhr = new XMLHttpRequest();
          xhr.open('PUT', `/api/queues/${globalChannel}/status/open`);
          xhr.onload = function () {
            let statusBadge = document.getElementById('status');
            let statusToggle = document.getElementById('statusToggle');
            if (xhr.status === 200) {
              statusBadge.setAttribute('class', 'badge badge-success');
              statusBadge.innerHTML = 'Open';
              statusToggle.setAttribute(
                'class',
                'btn btn-danger m-2 queueToggle'
              );
              statusToggle.setAttribute('data-action', 'close-queue');
              statusToggle.innerHTML = 'Close Queue';
            } else {
              swal.fire({
                type: 'error',
                title: 'Error opening queue!',
                text: `${xhr.responseText}`,
              });
            }
          };
          xhr.send();
        }
        break;

      case 'close-queue':
        {
          e.preventDefault();
          console.log('close');
          var xhr = new XMLHttpRequest();
          xhr.open('PUT', `/api/queues/${globalChannel}/status/close`);
          xhr.onload = function () {
            let statusBadge = document.getElementById('status');
            let statusToggle = document.getElementById('statusToggle');
            if (xhr.status === 200) {
              statusBadge.setAttribute('class', 'badge badge-danger');
              statusBadge.innerHTML = 'Closed';
              statusToggle.setAttribute(
                'class',
                'btn btn-success m-2 queueToggle'
              );
              statusToggle.setAttribute('data-action', 'open-queue');
              statusToggle.innerHTML = 'Open Queue';
            } else {
              swal.fire({
                type: 'error',
                title: 'Error closing queue!',
                text: `${xhr.responseText}`,
              });
            }
          };
          xhr.send();
        }
        break;

      case 'delete-req':
        {
          e.preventDefault();
          console.log(e.target.getAttribute('data-srID'));
          var srID = e.target.getAttribute('data-srID');
          var xhr = new XMLHttpRequest();
          xhr.open(
            'DELETE',
            `/api/queues/${globalChannel}/delete-song/${srID}`
          );
          xhr.onload = function () {
            if (xhr.status === 200) {
              try {
                // gsap.to(`#${srID}`, {
                //   opacity: 0,
                //   y: -50,
                //   duration: 0.5,
                //   ease: 'power4.out',
                //   onComplete: removeDiv,
                //   onCompleteParams: [`sr${srID}`],
                // });
                removeDiv(`${srID}`);
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
        }
        break;

      case 'clear-queue':
        {
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
        }
        break;

      case 'move-req': {
        var srId = e.target.getAttribute('data-srID');
        var move = e.target.getAttribute('data-move');
        console.log('move song ' + move)
        console.log(srId)
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
               console.log(songs);
              songs.forEach((song) => {
                song.remove();
              });

              // re-create list
              let reqDiv = document.getElementById('requests');
              let newQueue = JSON.parse(xhr.response);
              console.log(newQueue)
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
                  <a href="#" data-srID="${request.id}" data-action="delete-req" class="reqDelBtn p-1 flex-fill text-center rounded">
                  Delete
                  </a>
                  <a href="#" data-srID="${request.id}" data-action="move-req" data-move="down" class="moveBtn p-1 ml-1 flex-fill text-center rounded"><i class="fas fa-angle-down"></i></a>
                  <a href="#" data-srID="${request.id}" data-action="move-req" data-move="up" class="moveBtn p-1 ml-1 flex-fill text-center rounded"><i class="fas fa-angle-up"></i></a>
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
      }

      default: {
      }
    }
  },
  false
);

// TODO: handle queue status change from chat

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
    reqElem.setAttribute('id', `req${request.id}`);
    reqElem.innerHTML = `
      <div class="song-top p-2">
        <div class="d-flex flex-column">
            <a class="srName pl-2" href="${request.link}" target="_blank">
            ${request.track} ${artist} </a>
        </div>
      </div>
      <div class="reqBy p-2"><i class="far fa-user ml-2 mr-2"></i>${request.reqBy}</div>
      <div class="song-ctrl d-flex p-2">
        <a href="#" data-srID="req${request.id}" class="reqDelBtn p-1 flex-fill text-center">
          Delete
        </a>
        <a href="#" data-srID="req${request.id}" data-action="move-req"  data-move="down" class="moveBtn p-1 ml-1 flex-fill text-center rounded"><i class="fas fa-angle-down"></i></a>
        <a href="#" data-srID="req${request.id}" data-action="move-req"  data-move="up" class="moveBtn p-1 ml-1 flex-fill text-center rounded"><i class="fas fa-angle-up"></i></a>
        <!--<a href="#" data-uri="${request.uri}" class="playBtn p-1 flex-fill text-center">Play <i class="fas fa-play-circle"></i></a>-->
      </div>
    `;
    reqDiv.prepend(reqElem);
    gsap.from(`#req${request.id}`, {
      opacity: 0,
      y: -50,
      duration: 0.5,
      ease: 'power4.out',
    });
  } catch (err) {
    console.error(err);
  }
});

// Noti function
function createSubNoti(id, username, method, message, animate) {
  let notiDiv = document.getElementById('noti-container');
  let notiElem = document.createElement('div');
  console.log('create sub');
  notiElem.setAttribute('id', `noti${id}`);
  notiElem.setAttribute('class', 'noti rounded-lg p-3 m-2');
  notiElem.innerHTML = `
    <p><span><i class="fas fa-star"></i></span> <b>${username}</b> subscribed!</p>
  `;
  if (message != null) {
    let messageElem = document.createElement('p');
    messageElem.innerHTML = message;
    notiElem.append(messageElem);
  }
  notiDiv.prepend(notiElem);
  if (animate) {
    gsap.from(`#noti${id}`, {
      x: 100,
      duration: 1,
      ease: 'power4.out',
    });
  }
}

function createSubGiftNoti(id, username, recipient, senderTotal, animate) {
  let notiDiv = document.getElementById('noti-container');
  let notiElem = document.createElement('div');
  console.log('create sub gift');
  notiElem.setAttribute('id', `noti${id}`);
  notiElem.setAttribute('class', 'noti rounded-lg p-3 m-2');
  notiElem.innerHTML = `
    <p><span><i class="fas fa-gift"></i></span> <b>${username}</b> gifted <b>${recipient}</b> a sub!</p>
    <p>They've gifted a total of ${senderTotal} sub(s) to the community!</p>
  `;
  notiDiv.prepend(notiElem);
  if (animate) {
    gsap.from(`#noti${id}`, {
      x: 100,
      duration: 1,
      ease: 'power4.out',
    });
  }
}

function createResubNoti(id, username, months, message, animate) {
  let notiDiv = document.getElementById('noti-container');
  let notiElem = document.createElement('div');
  console.log('create resub');
  notiElem.setAttribute('id', `noti${id}`);
  notiElem.setAttribute('class', 'noti rounded-lg p-3 m-2');
  notiElem.innerHTML = `
    <p><span><i class="fas fa-undo-alt"></i></span> <b>${username}</b> subscribed for <b>${months} months</b>!</p>
  `;
  if (message != null) {
    let messageElem = document.createElement('p');
    messageElem.innerHTML = message;
    notiElem.append(messageElem);
  }
  notiDiv.prepend(notiElem);
  if (animate) {
    gsap.from(`#noti${id}`, {
      x: 100,
      duration: 1,
      ease: 'power4.out',
    });
  }
}

/**
 * @param {string} id
 * @param {string} username
 * @param {string} numbOfSubs
 * @param {string} senderTotal
 * @param {string} subs
 * @param {boolean} animate
 */
function createSMG(id, username, numbOfSubs, senderTotal, subs, animate) {
  let notiDiv = document.getElementById('noti-container');
  let notiElem = document.createElement('div');
  notiElem.setAttribute('id', `noti${id}`);
  notiElem.setAttribute('class', 'noti rounded-lg p-3 m-2');
  notiElem.innerHTML = `
      <h4><span><i class="fas fa-gifts"></i></span> ${username} gifted ${numbOfSubs} subs!</h4>
      <p>They've gifted a total of ${senderTotal}</p>
      <a class="btn btn-sm btn-primary" data-toggle="collapse" data-target="#smgsubs${id}" role="button" aria-expanded="false" aria-controls="smgsubs${id}">
      See individual subs
      </a>
      `;
  let smgSubsDiv = document.createElement('div');
  smgSubsDiv.setAttribute('id', `smgsubs${id}`);
  smgSubsDiv.setAttribute('class', 'collapse border p-2 m-2 rounded');
  subs.forEach((sub) => {
    let subElem = document.createElement('div');
    //console.log(sub);
    subElem.innerHTML = `${sub.data.recipient}`;
    smgSubsDiv.append(subElem);
  });
  notiElem.append(smgSubsDiv);
  notiDiv.prepend(notiElem);
  if (animate) {
    gsap.from(`#noti${id}`, {
      x: 100,
      duration: 1,
      ease: 'power4.out',
    });
  }
}

/**
 * @param {string} id
 * @param {string} username
 * @param {string} bits
 * @param {string} message
 * @param {boolean} animate
 */
function createCheerNoti(id, username, bits, message, animate) {
  let notiDiv = document.getElementById('noti-container');
  let notiElem = document.createElement('div');
  console.log('sub gift');
  notiElem.setAttribute('id', `noti${id}`);
  notiElem.setAttribute('class', 'noti rounded-lg p-3 m-2');
  notiElem.innerHTML = `
    <p><span><i class="far fa-gem"></i></span> <b>${username}</b> cheered <b>${bits}</b> bits!</p>
  `;
  if (message != null) {
    let messageElem = document.createElement('p');
    messageElem.innerHTML = message;
    notiElem.append(messageElem);
  }
  notiDiv.prepend(notiElem);
  if (animate) {
    gsap.from(`#noti${id}`, {
      x: 100,
      duration: 1,
      ease: 'power4.out',
    });
  }
}

function createRaidNoti(id, username, viewers, animate) {
  let notiDiv = document.getElementById('noti-container');
  let notiElem = document.createElement('div');
  notiElem.setAttribute('id', `noti${id}`);
  notiElem.setAttribute('class', 'noti rounded-lg p-3 m-2');
  notiElem.innerHTML = `
      <h4><span><i class="fas fa-parachute-box"></i></span> ${username} has raided with ${viewers} viewers!</h4>
  `;
  notiDiv.prepend(notiElem);
  if (animate) {
    gsap.from(`#noti${id}`, {
      x: 100,
      duration: 1,
      ease: 'power4.out',
    });
  }
}

// Realtime notifications
socket.on('noti', (noti) => {
  console.log(noti);
  let data = noti.data;

  switch (noti.type) {
    case 'sub':
      createSubNoti(makeid(10), data.username, data.method, data.message, true);
      break;

    case 'SMG':
      createSMG(
        makeid(10),
        data[0].userGivingSubs,
        data[0].numbOfSubs,
        data[0].senderTotal,
        data.slice(1),
        true
      );
      break;

    case 'subgift':
      createSubGiftNoti(
        makeid(10),
        data.username,
        data.recipient,
        senderTotal,
        true
      );
      break;

    case 'resub':
      createResubNoti(
        makeid(10),
        data.username,
        data.userstate['msg-param-cumulative-months'],
        data.message,
        true
      );
      break;

    case 'raid':
      createRaidNoti(makeid(10), data.username, data.viewers, true);
      break;

    case 'cheer':
      console.log('Cheer alert');
      createCheerNoti(
        makeid(10),
        data.userstate.username,
        data.userstate.bits,
        data.message,
        true
      );
      break;

    case 'test':
      console.log('Test noti');
      break;

    default:
      console.log('Other alert');
      console.log(noti);
      break;
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
//document.addEventListener(
//'click',
//e => {
//if (!e.target.matches('.moveBtn')) return;
//e.preventDefault();
//console.log(e.target.getAttribute('data-srID'));
//},
//false
//);

function removeDiv(div) {
  console.log(div);
  let srDiv = document.getElementById(div);
  srDiv.remove();
}

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
function makeid(length) {
  var result = '';
  var characters =
    'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
  var charactersLength = characters.length;
  for (var i = 0; i < length; i++) {
    result += characters.charAt(Math.floor(Math.random() * charactersLength));
  }
  return result;
}
