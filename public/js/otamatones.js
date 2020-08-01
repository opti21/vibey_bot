var socket = io('/widgets');

const aniStatuses = {
  WAITING: 'waiting',
  PLAYING: 'playing',
};

let aniStatus = aniStatuses.WAITING;

function setWaitingStatus() {
  console.log('State set to Waiting');
  aniStatus = aniStatuses.WAITING;
}

function setPlayingStatus() {
  console.log('State set to Playing');

  aniStatus = aniStatuses.PLAYING;
}

const wiggleTL = gsap.timeline({});
wiggleTL.to(
  '.wiggle',
  {
    onStart: setPlayingStatus,
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
    onStart: setPlayingStatus,
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

const danceTL = gsap.timeline();
danceTL.to(
  '.dance',
  {
    onStart: setPlayingStatus,
    opacity: 1,
    duration: 0.5,
  },
  0
);
danceTL.to(
  '.still',
  {
    opacity: 0,
    duration: 0.5,
  },
  0
);
danceTL.addPause(0.5, resumeLine, [danceTL, 5]);
danceTL.to(
  '.dance',
  {
    opacity: 0,
    duration: 0.5,
  },
  4
);
danceTL.to(
  '.still',
  {
    opacity: 1,
    duration: 0.5,
    onComplete: restartTL,
    onCompleteParams: [danceTL],
  },
  4
);
danceTL.pause();

// create a new queue
var queue = new Queue();

function restartTL(timeline) {
  setWaitingStatus();
  timeline.restart();
  timeline.pause();
}

function resumeLine(timeLine, time) {
  gsap.delayedCall(time, function () {
    timeLine.play();
  });
}

function checkQueue() {
  console.log(aniStatus);
  if (queue.isEmpty()) {
    console.log('Queue is empty');
    return;
  }
  if (aniStatus === 'waiting') {
    console.log(queue.getLength());
    let nextAni = queue.dequeue();
    switch (nextAni) {
      case 'otama-wiggle':
        console.log('Playing wiggle');
        wiggleTL.play();
        break;

      case 'otama-heart':
        console.log('Playing hearts');
        heartTL.play();
        break;

      case 'otama-dance':
        console.log('Playing dance');
        danceTL.play();
        break;
    }
  }
}

setInterval(checkQueue, 1000);

socket.on('otama', (data) => {
  switch (data.type) {
    case 'wiggle':
      console.log('Dance otamatones added to queue');
      // enqueue an item
      if (queue.isEmpty()) {
        if (aniStatus === 'playing') {
          queue.enqueue('otama-wiggle');
        } else {
          wiggleTL.play();
        }
      } else {
        queue.enqueue('otama-wiggle');
      }
      break;

    case 'heart':
      console.log('Heart otamatones added to queue');
      if (queue.isEmpty()) {
        if (aniStatus === 'playing') {
          queue.enqueue('otama-heart');
        } else {
          heartTL.play();
        }
      } else {
        queue.enqueue('otama-heart');
      }
      break;

    case 'dance':
      console.log('dance otamatones added to queue');
      if (queue.isEmpty()) {
        if (aniStatus === 'playing') {
          queue.enqueue('otama-dance');
        } else {
          heartTL.play();
        }
      } else {
        queue.enqueue('otama-dance');
      }
      break;
  }
});

// dequeue an item
var item = queue.dequeue();
