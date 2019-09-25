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
var pusher = new Pusher('94254303a6a5048bf191', {
  cluster: 'us2',
  forceTLS: true
});

// // Pusher DEVELOPMENT
// var pusher = new Pusher('41f9377a48633b3302ff', {
//   cluster: 'us2',
//   forceTLS: true
// });


// var timeDiff = setInterval(reqTime, 1000);

// function reqTime() {
//   $('.timeReq').each(function () {

//     var ago = moment.utc(`${$(this).attr('data-time')}`).fromNow();
//     $(this).text(`${ago}`)

//   })
// }

$(document).ready(function () {
  var maxField = 10; //Input fields increment limitation
  var addButton = $('.add_button'); //Add button selector
  var rmvBtn = $('.remove_button')
  var wrapper = $('.field_wrapper'); //Input field wrapper
  var x = 2; //Initial field counter is 1
  var choice = 3

  //Once add button is clicked
  $(addButton).click(function () {
    if (x < maxField) {
      $(wrapper).append(`<input type="text" class="form-control mb-2" name="choice${choice}" placeholder="Choice ${choice}" tabindex="${choice}">`); //Add field html
      x++; //Increment field counter
      choice++;
    }
  });

  $(rmvBtn).click(function () {
    if (x > 2) {
      $(wrapper).children().last().remove();; //Remove field html
      x--; //Decrement field counter
      choice--;
    }
  })
});

$(document).ready(function () {
  // $('#pollWrap').hide();
  $("#poll-form").submit(function (e) {
    e.preventDefault();
    var form = $(this);
    var action = form.attr("action");
    var data = form.serializeArray();
    console.log(data)
    $.ajax({
      url: action,
      dataType: 'json',
      type: 'POST',
      contentType: 'application/json',
      data: JSON.stringify(data),
      success: function (data) {
        console.log("DATA POSTED SUCCESSFULLY" + data);
        Toast.fire({
          type: 'success',
          title: 'Poll Opened'
        })
        console.log('Poll Opened')

        // console.log($('#poll-text').val())

        // ct.innerHTML($('#poll-text').val())

        $('#currText').text(data[0])

        var pollCont = document.getElementById('pollWrap');
        var pollElem = document.createElement('div');
        var choices = document.createElement('ul')
        pollElem.setAttribute('class', 'card bg-dark mb-3');
        choices.setAttribute('class', 'list-group list-group-flush text-dark')

        pollElem.innerHTML = `
          <div id="${data.id}" class="currText card-header">
				  	<i id="spin${data.id}" class="spinner fas fa-circle-notch" style="color:limegreen"></i> ${data.polltext}
				  </div>
        `
        data.choices.forEach(choice => {
          var choiceElem = document.createElement('li')
          choiceElem.setAttribute('class', 'list-group-item')
          choiceElem.innerHTML = `
          ${choice.text}
            <div class="progress">
              <div id="${choice.id}" class="progress-bar" role="progressbar" style="width: 0%"></div>
            </div>
          `
          choices.append(choiceElem);
        })

        pollElem.append(choices)
        pollCont.append(pollElem)
        TweenMax.to('.spinner', 3, { rotation: "360", ease: Linear.easeNone, repeat: -1 });
      },
      error: function (jqXhr, textStatus, errorThrown) {
        console.log(errorThrown);
      }
    });
  });

  const Toast = Swal.mixin({
    toast: true,
    position: 'top-end',
    showConfirmButton: false,
    timer: 2000,
  })

  TweenMax.to('.spinner', 3, { rotation: "360", ease: Linear.easeNone, repeat: -1 });

  $('#closePoll').on('click', function () {
    swal.fire({
      title: `Are you sure you want to close this poll?`,
      text: "You won't be able to revert this!",
      type: 'warning',
      showCancelButton: true,
      confirmButtonColor: '#3085d6',
      cancelButtonColor: '#d33',
      confirmButtonText: 'Yes, delete it!',
    }).then((result) => {
      if (result.value) {
        var xhr = new XMLHttpRequest();
        xhr.open('GET', `/poll/deleteall`);
        xhr.onload = function () {
          if (xhr.status === 200) {
            Toast.fire({
              type: 'success',
              title: 'Poll Closed'
            })
            console.log('Poll Closed')
          } else {
            Swal.fire(
              'Uh Oh!',
              `There was an error closing the poll. Error: ${xhr.responseText}`,
              'error'
            )
          }
        }
        xhr.send();
      }
    })
  });
});

//utility function