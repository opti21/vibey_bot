const User = document.getElementById('twitchID').innerText
$('#twitchID').remove();
console.log(User)


var pusher = new Pusher('94254303a6a5048bf191', {
  cluster: 'us2',
  forceTLS: true
});

const srContainer = document.getElementById('srContainer')

var channel = pusher.subscribe('sr-channel');
channel.bind('sr-event', function(data) {
  try { 
    console.log('New Request')
    var srElement = document.createElement('tr')
    // chatMessageId = makeid(5)
    srElement.setAttribute('class', 'song-request')
    srElement.innerHTML = `
      <td><a href="${data.link}">${data.track} - ${data.artist}</a> <a id="spotify" href="${data.uri}"><i class="fab fa-spotify" data-toggle="tooltip" data-placement="top" title="Open in Spotify"></i></a></td>
      <td>${data.reqBy}</td>
      <td> <button class="delete btn btn-danger btn-sm" data-srID="${data.id}"> <i class="fas fa-minus-circle"></i> </button> </td>
    `
    srContainer.prepend(srElement)
  } catch (err) {
    console.error(err)
  }
});

$(function(){
  $("tbody").each(function(elem,index){
    var arr = $.makeArray($("tr",this).detach());
    arr.reverse();
      $(this).append(arr);
  });
});

$(function () {
  $('[data-toggle="tooltip"]').tooltip()
})
