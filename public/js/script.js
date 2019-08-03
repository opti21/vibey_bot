const User = document.getElementById('twitchID').innerText
$('#twitchID').remove();
console.log(User)

// $(window).ready(function() {
//   // Animate loader off screen
//   $(".se-pre-con").fadeOut("slow");;
// });

// var socket = io.connect(`http://${location.host}/socket.io`);


var pusher = new Pusher('94254303a6a5048bf191', {
  cluster: 'us2',
  forceTLS: true
});

const srContainer = document.getElementById('srContainer')

var channel = pusher.subscribe('sr-channel');
channel.bind('sr-event', function(data) {
  try { 
    var srElement = document.createElement('tr')
    // chatMessageId = makeid(5)
    srElement.setAttribute('class', 'song-request')
    srElement.innerHTML = `
      <td><a href="${data.link}">${data.track} - ${data.artist}</a> <a href="${data.link}">Spotify Link</a></td>
      <td>${data.reqBy}</td>
      <td> <button class="delete btn btn-danger" data-srID="${data.id}"> <i class="fas fa-minus-circle"></i> </button> </td>
    `
    srContainer.append(srElement)
  } catch (err) {
    console.error(err)
  }
});

socket.on('new-request' , (reqBy, track, artist, uri)  => {
  
  socket.on('emit-test', emit => {
    console.log(`${emit}`)
  })
  
})

