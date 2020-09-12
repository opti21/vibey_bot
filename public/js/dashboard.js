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

//document.addEventListener('click', (e) => {
  //if (!e.target.matches('#connect-btn')) return;
  //console.log('clicked');
  //e.preventDefault();
  //var xhr = new XMLHttpRequest();
  //xhr.open('post', `/api/connect?channel=${globalChannel}`);
  //xhr.onload = function () {
    //if (xhr.status === 200) {
      //swal;
      //Swal.fire({
        //type: 'success',
        //title: 'Vibey joined your channel!',
        //showConfirmButton: false,
        //timer: 2000,
        //timerProgressBar: true,
      //}).then((reload) => {
        //if (reload) {
          //location.reload();
        //}
      //});
    //} else if (xhr.status === 409) {
      //Swal.fire({
        //type: 'error',
        //title: 'Vibey is already connected to your channel',
      //});
    //} else {
      //Swal.fire({
        //type: 'error',
        //title: 'Error joining channel!',
        //text: `${xhr.responseText}`,
      //});
    //}
  //};
  //xhr.send();
//});

//document.addEventListener('click', (e) => {
  //if (!e.target.matches('#disconnect-btn')) return;
  //e.preventDefault();
  //var xhr = new XMLHttpRequest();
  //xhr.open('DELETE', `/api/disconnect?channel=${globalChannel}`);
  //xhr.onload = function () {
    //if (xhr.status === 200) {
      //try {
        //Swal.fire({
          //type: 'success',
          //title: 'Vibey left your channel!',
          //showConfirmButton: false,
          //timer: 2000,
          //timerProgressBar: true,
        //}).then((reload) => {
          //if (reload) {
            //location.reload();
          //}
        //});
      //} catch (err) {
        //console.error(err);
      //}
    //} else {
      //Swal.fire({
        //type: 'error',
        //title: 'Error leaving channel!',
        //text: `${xhr.responseText}`,
      //});
    //}
  //};
  //xhr.send();
//});
