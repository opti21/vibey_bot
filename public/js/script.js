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
    var srElement = document.createElement('tr');
    // chatMessageId = makeid(5);
    srElement.setAttribute('class', 'song-request');
    if (data.source === 'spotify') {
      srElement.innerHTML = `
        <td><a class="srLink" href="${data.link}">${data.track} - ${data.artist}</a> <a class="spotify" href="${data.uri}"><i class="fab fa-spotify" title="Open in Spotify"></i></a></td>
        <td>${data.reqBy}</td>
        <td> <button class="btn btn-success btn-sm mr-3">Add to Mix</button> <button class="delete btn btn-danger btn-sm" data-srID="${data.id}" data-srName="${data.track} - ${data.artist}"> <i class="fas fa-minus-circle"></i> </button> </td>
      `
    }
    if (data.source === 'youtube') {
      srElement.innerHTML = `
        <td><a class="srLink" href="${data.link}">${data.track}</a> <a class="youtube" href="${data.link}"><i class="fab fa-youtube" title="Open on Youtube"></i></a></td>
        <td>${data.reqBy}</td>
        <td> <button class="btn btn-success btn-sm mr-3">Add to Mix</button> <button class="delete btn btn-danger btn-sm" data-srID="${data.id}" data-srName="${data.track}"> <i class="fas fa-minus-circle"></i> </button> </td>
      `
    }
    srContainer.append(srElement)
  } catch (err) {
    console.error(err)
  }
});

// Flips table data
// $(function(){
//   $("tbody").each(function(elem,index){
//     var arr = $.makeArray($("tr",this).detach());
//     arr.reverse();
//       $(this).append(arr);
//   });
// });

// TODO: Add animation when deleting or moving requests


// Delete Song Request
$('#srContainer').on('click', '.delete.btn', function() {
  var srName = $(this).attr('data-srName')
  var srId = $(this).attr('data-srID')
  swal.fire({
    title: `Are you sure you want to delete ${srName}?`,
    text: "You won't be able to revert this!",
    type: 'warning',
    showCancelButton: true,
    confirmButtonColor: '#3085d6',
    cancelButtonColor: '#d33',
    confirmButtonText: 'Yes, delete it!',
  }).then((result) => {
    if (result.value) {
      var xhr = new XMLHttpRequest();
      xhr.open('GET', `/dashboard/delete/${srId}`);
      xhr.onload = function() {
        if (xhr.status === 200) {
          Swal.fire({
            title:'Deleted!',
            text: `${srName} has been deleted.`,
            type:'success',
            timer: 2000,
            allowOutsideClick: false,
            allowEscapeKey: false,
            onBeforeOpen: () => {
              Swal.showLoading()
            },
            onClose: () => {
              // TODO: Add trigger animation for removal instead of refreshing page
              window.location.reload();
            }
          });
        } else {
          Swal.fire(
            'Uh Oh!',
            `There was an error deleteing the song request. Error: ${xhr.responseText}`,
            'error'
          )
        }
      }
      xhr.send();
    }
  })
})