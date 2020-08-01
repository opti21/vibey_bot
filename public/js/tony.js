var socket = io('/widgets');

const wiggleTL = gsap.timeline({});
wiggleTL.to(
  '.wiggle',
  {
    opacity: 1,
    duration: 0.5,
  },
  0
);
wiggleTL.to(
  '.still',
  {
    opacity: 0,
    duration: 0.5,
  },
  0
);
wiggleTL.addPause(0.5, resumeLine, [wiggleTL, 5]);
wiggleTL.to(
  '.wiggle',
  {
    opacity: 0,
    duration: 0.5,
  },
  4
);
wiggleTL.to(
  '.still',
  {
    opacity: 1,
    duration: 0.5,
    onComplete: restartTL,
    onCompleteParams: [wiggleTL],
  },
  4
);
wiggleTL.pause();

const heartTL = gsap.timeline();
heartTL.to(
  '.heart',
  {
    opacity: 1,
    duration: 0.5,
  },
  0
);
heartTL.to(
  '.still',
  {
    opacity: 0,
    duration: 0.5,
  },
  0
);
heartTL.addPause(0.5, resumeLine, [heartTL, 5]);
heartTL.to(
  '.heart',
  {
    opacity: 0,
    duration: 0.5,
  },
  4
);
heartTL.to(
  '.still',
  {
    opacity: 1,
    duration: 0.5,
    onComplete: restartTL,
    onCompleteParams: [heartTL],
  },
  4
);
heartTL.pause();

function restartTL(timeline) {
  timeline.restart();
  timeline.pause();
}

function resumeLine(timeLine, time) {
  gsap.delayedCall(time, function () {
    timeLine.play();
  });
}

socket.on('otama-dance', () => {
  console.log('Dance otamatones');
  wiggleTL.play();
});

socket.on('otama-heart', () => {
  console.log('Heart otamatones');
  heartTL.play();
});
