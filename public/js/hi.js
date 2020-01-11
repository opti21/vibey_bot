$("#menu-toggle").click(function (e) {
  e.preventDefault();
  $("#wrapper").toggleClass("toggled");
});

const Toast = Swal.mixin({
  toast: true,
  position: 'top',
  showConfirmButton: false,
  timer: 2000,
})

$(document).ready(function () {
  $('#hi-nav').addClass('active');
})


//Subscribe to Poll Channel
var socket = io('/hellos-namescape');


socket.on('newUser', data => {
  let { _id, username } = data.user
  console.log(data)
  let hiContainer = document.getElementById('hiContainer')
  let hiElem = document.createElement('a')
  hiElem.setAttribute('id', `${_id}`)
  hiElem.setAttribute('class', 'hi card m-2 p-2 text-decoration-none');
  hiElem.setAttribute('style', 'background-color: white; color: #343a40');
  hiElem.setAttribute('href', '#');
  hiElem.innerHTML = `
      <div id="${_id}" >${username}</div>
  `
  hiContainer.append(hiElem)

  // init hover animations on new users
  $(".hi").hover(over, out);
  function over() {
    TweenMax.to(this, 0.3, { css: { color: "#ffffff", backgroundColor: "green" } })
  }
  function out() {
    TweenMax.to(this, 0.3, { css: { color: "#343a40", backgroundColor: "white" } })
  }

})

// Init hovers
$(".hi").hover(over, out);
function over() {
  TweenMax.to(this, 0.3, { css: { color: "#ffffff", backgroundColor: "green" } })
}
  TweenMax.to(this, 0.3, { css: { color: "#343a40", backgroundColor: "white" } })
}

$(document).on('click', '.hi', (e) => {
  e.preventDefault()
  console.log('Said Hi to: ' + e.target.id)

  $(`#${e.target.id}`).fadeOut(100, () => {
    $(`#${e.target.id}`).remove()
  })
  socket.emit('saidHi', {
    id: e.target.id
  })
})



//utility function
// Generate random IDs for table elements
function makeid(length) {
  var result = '';
  var characters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
  var charactersLength = characters.length;
  for (var i = 0; i < length; i++) {
    result += characters.charAt(Math.floor(Math.random() * charactersLength));
  }
  return result;
}