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

// $(document).ready(function () {
//   $('#sr-table').DataTable({
//     fixedHeader: true,
//     "ordering": false,
//     "paging": false
//   });
// });

$("#menu-toggle").click(function (e) {
  e.preventDefault();
  $("#wrapper").toggleClass("toggled");
});

// Pusher Poduction *** UNCOMMENT THIS BEFORE COMMIT ***
// var pusher = new Pusher('94254303a6a5048bf191', {
//   cluster: 'us2',
//   forceTLS: true
// });

// // Pusher DEVELOPMENT
var pusher = new Pusher('41f9377a48633b3302ff', {
  cluster: 'us2',
  forceTLS: true
});

//Subscribe to Poll Channel
var channel = pusher.subscribe('pollCh');
channel.bind('pollUpdate', function (data) {
  console.log(data.doc)
  var total = 0
  data.doc.choices.forEach(choice => {
    total = total + choice.votes;
  })

  data.doc.choices.forEach(choice => {
    console.log(choice.votes)
    var votes = choice.votes
    var choice = document.getElementById(`${choice.id}`)
    var perc = (100 * votes) / total
    console.log(perc)
    choice.setAttribute('style', `width: ${perc}%`)
    choice.innerText = `${votes}(${perc}%)`

  })
  total = 0

})

// var timeDiff = setInterval(reqTime, 1000);

// function reqTime() {
//   $('.timeReq').each(function () {

//     var ago = moment.utc(`${$(this).attr('data-time')}`).fromNow();
//     $(this).text(`${ago}`)

//   })
// }


$(document).ready(function () {
  // Fetch active polls
  fetch(`/api/polls`)
    .then(response => {
      return response.json()
    })
    .then(data => {
      console.log(data)
      data.forEach(poll => {
        if (poll.active = true) {
          var pollCont = document.getElementById('pollWrap');
          var pollElem = document.createElement('div');
          var choices = document.createElement('ul')
          var total = 0
          pollElem.setAttribute('class', 'card bg-dark mb-3');
          choices.setAttribute('class', 'list-group list-group-flush text-dark')
          choices.setAttribute('id', 'choices')

          pollElem.innerHTML = `
          <div id="${poll.id}" class="currText card-header">
				  	<i id="spin${poll.id}" class="spinner fas fa-circle-notch" style="color:limegreen"></i> ${poll.polltext}
				  </div>
        `
          poll.choices.forEach(choice => {
            total = total + choice.votes;
          })

          poll.choices.forEach(choice => {
            var choiceElem = document.createElement('li')
            var perc = (100 * choice.votes) / total
            console.log(perc)
            choiceElem.setAttribute('class', 'list-group-item')
            choiceElem.innerHTML = `
          ${choice.text}
            <div class="progress">
              <div id="${choice.id}" class="progress-bar" role="progressbar" style="width: ${perc}%">${choice.votes}(${perc}%)</div>
            </div>
          `
            choices.append(choiceElem);
          })

          pollElem.append(choices)
          pollCont.append(pollElem)
          TweenMax.to('.spinner', 3, { rotation: "360", ease: Linear.easeNone, repeat: -1 });
        }
      });
    })
    .catch(err => {
      return
      console.error(err)
    })

});

//utility function