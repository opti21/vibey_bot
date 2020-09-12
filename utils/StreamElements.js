require('dotenv').config();

const wsc = require('socket.io-client');
module.exports = (io, channels) => {
  console.log('Starting streamElements.js');

  const streamElements = wsc('https://realtime.streamelements.com', {
    transports: ['websocket'],
  });

  streamElements.on('connect', () => {
    console.log('Connected to the StreamElements WebSocket');
    streamElements.emit('authenticate', {
      method: 'jwt',
      token: process.env.SE_TOKEN,
    });
    //streamElements.emit('authenticate', {
      //method: 'jwt',
      //token: process.env.SE_TOKEN2
    //});
  });

  streamElements.on('disconnect', () => {
    console.log('Disconnected from the StreamElements WebSocket');
  });

  streamElements.on('authenticated', (data) => {
    const { channelId } = data;
    console.log(
      `StreamElements successfully connected to channel ${channelId}`
    );
  });

  streamElements.on('event', (event) => {
    console.log(event);
  });
};
