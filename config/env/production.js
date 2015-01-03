
/**
 * Expose
 */

module.exports = {
  db: 'mongodb://localhost/realtime_chat_production',
  facebook: {
    clientID: 'APP_ID',
    clientSecret: 'SECRET',
    callbackURL: 'http://localhost:3000/auth/facebook/callback',
    scope: [
      'email',
      'user_about_me',
      'user_friends'
    ]
  },
};
