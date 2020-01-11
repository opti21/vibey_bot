require('dotenv').config();
let channel
switch (process.env.NODE_ENV) {
    case 'production':
        channel = 'veryhandsomebilly'
        break

    case 'staging':
        channel = 'veryhandsomebilly'
        break

    case 'dev':
        channel = 'opti_21'
}

const config = {
    twitchChan: [`${channel}`],
    admins: ['opti_21', 'veryhandsomebilly', 'vibey_bot', 'vibey_dev']
};

module.exports = config;
