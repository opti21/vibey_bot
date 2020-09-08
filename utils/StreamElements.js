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
    streamElements.emit('authenticate', {
      method: 'jwt',
      token:
        'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VyIjoiNWQyOWNhNzcyYTBiMmUyZDc5NzJlMmU5Iiwicm9sZSI6Im93bmVyIiwiY2hhbm5lbCI6IjVkMjljYTc3MmEwYjJlODU3MTcyZTJlYSIsInByb3ZpZGVyIjoidHdpdGNoIiwiYXV0aFRva2VuIjoiUzNFMFB1SVFmcmVoRWwzY3NQbTJvcEYxb3NOZnNFelJqVXNaSmZYTDdqY1FuME42IiwiaWF0IjoxNTk2MDg3MTEzLCJpc3MiOiJTdHJlYW1FbGVtZW50cyJ9.siK4oxfGwXwMiuMT1snQN49nZrOBjijT7uWBPWbBEzE',
    });
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
