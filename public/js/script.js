const User = document.getElementById('twitchID').innerText
$('#twitchID').remove();
console.log(User)

$(window).ready(function() {
  // Animate loader off screen
  $(".se-pre-con").fadeOut("slow");;
});

var socket = io.connect(`http://${location.host}/socket.io`);


$( document ).ready(function() {
    console.log( "ready!" );
    console.log(User)
});