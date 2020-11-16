require('dotenv').config({
  path: '../../.env',
});

const { Consumer, Message, Producer } = require('redis-smq');

const Redis = require('ioredis');
const redisClient = new Redis({ password: process.env.REDIS_PASS });

const { v4: uuidv4 } = require('uuid');

redisClient.on('connect', (reply) => {
  console.log('SUB Processor redis client connected');
  console.log(reply);
});

redisClient.on('error', function (error) {
  console.error(error);
});

// Alert producer

const redisOpts = {
  redis: {
    driver: 'ioredis',
    options: { password: process.env.REDIS_PASS },
  },
};
const alertProducer = new Producer('alerts', redisOpts);

// ////// PROCCESS ////////

class SubQueueConsumer extends Consumer {
  /**
   *
   * @param message
   * @param cb
   */
  consume(message, cb) {
    // console.log('Got a message to consume:', message);
    //  cb(new Error('TEST!'));
     console.log(message.type);

    switch (message.type) {
      case 'submysterygift':
        {
          console.log('SUBMYSTERYGIFT');
          console.log('NUM OF SUBS ' + message.numbOfSubs);
          let uniqueID = uuidv4();

          // Create/add to list for channel
          redisClient.rpush(
            `activesmgs:${message.channel}:${message.userGivingSubs}`,
            uniqueID,
            (err, reply) => {
              if (err) {
                cb(new Error(err));
              }
              console.log(reply);
            }
          );
          // Create individual SMG subcount
          redisClient.set(
            `smg:${uniqueID}:subsleft`,
            `${message.numbOfSubs}`,

            (err, reply) => {
              if (err) {
                cb(new Error(err));
              }
              console.log('HSET: ' + reply);
              console.log('SMG Hash set')
            }
          );

          const SMGData = {
            channel: message.channel,
            userstate: JSON.stringify(message.userstate),
            numbOfSubs: message.numbOfSubs,
            userGivingSubs: message.userGivingSubs,
            senderTotal: ~~message.userstate['msg-param-sender-count']
          };

          // Create individual SMG list with SMG info
          redisClient.rpush(
            `smg:${uniqueID}`,
            JSON.stringify(SMGData),
            (err, reply) => {
              if (err) {
                cb(new Error(err));
              }
              console.log(reply);
              cb();
            }
          );
        }
        break;

      case 'subgift':
        {
          let data = message.data
          // See if there's any active SMGs
          console.log(data.userGivingSubs)
          redisClient.llen(
            `activesmgs:${data.channel}:${data.userGivingSubs}`,
            (err, reply) => {
              if (err) cb(new Error(err));
              console.log(`activesmgs:${data.channel}:${data.userGivingSubs}`)
              console.log('ACTIVE SUBS LLEN ')
              console.log(reply);
              if (reply > 0) {
                console.log('There are active SMG');
                // Pull user's latest SMG
                redisClient.lindex(
                  `activesmgs:${data.channel}:${data.userGivingSubs}`,
                  0,
                  (err, reply) => {
                    if (err) cb(new Error(err));

                    // Reply should be SMG's id
                    let uid = reply;
                    console.log(reply);

                    // Pull current number of needed subs to complete SMG
                    redisClient.get(`smg:${uid}:subsleft`, (err, reply) => {
                      if (err) {
                        cb(new Error(err));
                      }
                      console.log('SUBS LEFT: ' + reply);
                      if (reply > 1) {
                        // Decrease numbOfSubs needed to fufill SMG
                        redisClient.decr(
                          `smg:${uid}:subsleft`,
                          (err, reply) => {
                            if (err) {
                              cb(new Error(err));
                            }
                            console.log('decreased subs: ' + reply);
                          }
                        );

                        // Add recipient to smg list
                        redisClient.rpush(
                          `smg:${uid}`,
                          JSON.stringify(message),
                          (err, reply) => {
                            if (err) {
                              cb(new Error(err));
                            }
                            console.log(reply);
                            cb();
                          }
                        );
                      } else {
                        // finish and fufill SMG

                        // Decrease numbOfSubs needed to fufill SMG
                        redisClient.decr(
                          `smg:${uid}:subsleft`,
                          (err, reply) => {
                            if (err) {
                              cb(new Error(err));
                            }
                            console.log('decreased subs: ' + reply);
                          }
                        );

                        // Add recipient to smg list
                        redisClient.rpush(
                          `smg:${uid}`,
                          JSON.stringify(message),
                          (err, reply) => {
                            if (err) {
                              cb(new Error(err));
                            }
                            console.log(reply);
                          }
                        );

                        // TODO: Need to finish removing and sending SMG to alerts

                        // Put SMGinfo on top of individiual smg list and remove from activesmgs

                        redisClient.lrange(
                          `smg:${uid}`,
                          0,
                          -1,
                          (err, SMGreply) => {
                            if (err) {
                              cb(new Error(err));
                            }
                            console.log('FINAL SMG: ');
                            console.log(SMGreply);

                            // Remove Active SMG from user's active
                            redisClient.lrem(
                              `activesmgs:${data.channel}:${data.userGivingSubs}`,
                              1,
                              uid,
                              (err, reply) => {
                                if (err) {
                                  cb(new Error(err));
                                }
                                console.log('LREM:');
                                console.log(reply);
                              }
                            );

                            const alertData = {
                              type: 'SMG',
                              redisID: uid,
                              data: SMGreply,
                            };

                            const alertMessage = new Message();

                            alertMessage.setBody(alertData);

                            alertProducer.produceMessage(
                              alertMessage,
                              (err) => {
                                if (err) console.log(err);
                                else
                                  console.log(
                                    'SMG Alert Successfully produced'
                                  );
                                cb();
                              }
                            );
                          }
                        );
                      }
                    });
                  }
                );
              } else {
                console.log('There are no active SMGs for this user');

                const alertMessage = new Message();

                alertMessage.setBody(message);

                alertProducer.produceMessage(alertMessage, (err) => {
                  if (err) console.log(err);
                  else console.log('SUB Alert Successfully produced');
                  cb();
                });
              }
            }
          );
        }
        break;
    }
  }
}

SubQueueConsumer.queueName = 'sub_queue';

const consumer = new SubQueueConsumer(redisOpts);
consumer.run();

// subQueue.process((subJob, done) => {

// });
