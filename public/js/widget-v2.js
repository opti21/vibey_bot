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

// Pusher Poduction *** UNCOMMENT THIS BEFORE COMMIT ***
var pusher = new Pusher('94254303a6a5048bf191', {
  cluster: 'us2',
  forceTLS: true
});

// // Pusher DEVELOPMENT
// var pusher = new Pusher('41f9377a48633b3302ff', {
//   cluster: 'us2',
//   forceTLS: true
// });


// realtime song add to mix
var channel = pusher.subscribe('sr-channel');
channel.bind('mix-event', function (data) {
  console.log('Song added to mix')
  var mixContainer = document.getElementById('mixContainer')
  var mixElement = document.createElement('div');
  mixElement.setAttribute('class', 'mix-request');
  mixElement.setAttribute('id', `${data.id}`);
  mixElement.innerHTML = `${data.track} - ${data.reqBy}`

  mixContainer.appendChild(mixElement)
  $(".mix-request").textFit()
  // Animate newly created element
  TweenMax.from(mixElement, 2, {
    y: 1000, autoAlpha: 0, ease: Power4.easeOut, onComplete: function () {

    }
  })

});

// remove requst based off of div id
channel.bind('mix-remove', function (data) {
  console.log('removed song')
  TweenMax.to(`#${data.id}`, .5, {
    autoAlpha: 0, margin: 0, onComplete: function () {
      $(`#${data.id}`).remove();
    }
  });
});

// Clear all rows of table body
channel.bind('clear-mix', function (data) {
  TweenMax.to(`.mix-request`, 1, {
    autoAlpha: 0, margin: 0, onComplete: function () {
      $(`.mix-request`).remove();
    }
  });
});

// Fit Text to sticky note
$(".mix-request").textFit()