
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

//Subscribe to Poll Channel
var channel = pusher.subscribe('pollCh');

// Chart
$(document).ready(function () {

  // Init Chart
  new Chartkick.PieChart("chart-1", [['choice', 1]], { donut: true, colors: ["#003066", "#00A2BB"], legend: false });

  // Fetch active polls
  fetch(`/api/polls`)
    .then(response => {
      return response.json()
    })
    .then(data => {
      console.log(data)
      var poll = data[data.length - 1]
      if (poll.active === true) {
        let chart = Chartkick.charts["chart-1"]
        var data = []
        poll.choices.forEach(choice => {
          console.log(choice)
          var choiceArr = [`${choice.text}`, choice.votes]
          data.push(choiceArr)
        })
        chart.updateData(data)
        TweenMax.from(`#chart-1`, 1, { x: -500, autoAlpha: 0, ease: Linear.easeNone });


      } else {
        TweenMax.to(`#chart-1`, 0.1, { x: -500, autoAlpha: 0, ease: Linear.easeNone });
      }

    })
    .catch(err => {
      return
      console.error(err)
    })


});

channel.bind('pollOpen', function (data) {
  console.log('Poll Open')
  let chart = Chartkick.charts["chart-1"]
  let poll = data.poll
  var data = []

  poll.choices.forEach(choice => {
    var choiceArr = [`${choice.text}`, choice.votes];
    data.push(choiceArr);
  });
  // chart.destroy();
  // console.log(chart)
  chart.updateData(data)
  TweenMax.to(`#chart-1`, 1, { x: 0, autoAlpha: 1, ease: Linear.easeNone });

});

channel.bind('pollUpdate', function (data) {
  console.log(data.doc)
  var chart = Chartkick.charts["chart-1"]
  var newData = []

  data.doc.choices.forEach(choice => {
    var choiceArr = [`${choice.text}`, choice.votes]
    newData.push(choiceArr)
  })
  chart.updateData(newData)
  newData = []
});

channel.bind('pollClose', function (data) {
  console.log('Poll Closed')
  TweenMax.to(`#chart-1`, 1, { x: -500, autoAlpha: 0, ease: Linear.easeNone });
});
