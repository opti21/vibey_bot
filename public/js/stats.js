// const Toast = Swal.mixin({
//   toast: true,
//   position: "top-end",
//   showConfirmButton: false,
//   timer: 2000,
// });

let globalChannel = document
  .getElementById('pageInfo')
  .getAttribute('data-channel');

let loggedInUser = document
  .getElementById('pageInfo')
  .getAttribute('data-loggedIn');

let enviroment = document
  .getElementById('pageInfo')
  .getAttribute('data-enviroment');

function getStats () {
  fetch('/api/stats')
    .then((res) => res.json())
    .then((data) => {
      let numDiv = document.querySelector('#processed-num')
      numDiv.innerHTML = data.srProcessed
      
    })
  return
}

setInterval(getStats, 1000)

