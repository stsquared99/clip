var builder = require('botbuilder');
var giphy = require('giphy-api')();
var restify = require('restify');

//=========================================================
// Bot Setup
//=========================================================

// Setup Restify Server
var server = restify.createServer();
server.listen(process.env.port || process.env.PORT || 80, function () {
   console.log('%s listening to %s', server.name, server.url);
});

// Create chat bot
var connector = new builder.ChatConnector({
    appId: process.env.MICROSOFT_APP_ID,
    appPassword: process.env.MICROSOFT_APP_PASSWORD
});
var bot = new builder.UniversalBot(connector);
server.post('/api/messages', connector.listen());

//=========================================================
// Bots Dialogs
//=========================================================

bot.dialog('/', function (session) {
  var x = session.message.text;

  var message = x.toLowerCase();

  console.log('message: ', message);

  x = message.replace(/^.*?>.*?> */, '');

  var command = x.replace(/  *.*/, '');

  console.log('command: ', command);

  var parameters = x.replace(/.*? /, '');

  console.log('parameters: ', parameters);

  if (command === "gif") {
    var string = parameters;

    giphy.translate({
        s: string,
        rating: 'g'
    }, function(err, res) {
      try {
        var data = res['data'];

        var images = data.images;

        var original = images.original;

        var url = original.url;

        session.send(url);
      }
      catch (e) {
        session.send('Sorry, I couldn\'t find a gif for: ' + string);
      }
    });
  } else if (command === "help") {
    session.send('All I do is gif');
  } else {
    var invalidResponses = [
      "It looks like you're trying to gif. Would you like help?",
      "It looks like you're trying to meme. Would you like me to gif?",
      "It looks like you're trying to win. Would you like help?",
      "It looks like you're trying to work. Would you like me to bug you?",
      "It looks like you're trying to write a book. Would you like help?",
      "It looks like you're trying to write a letter. Would you like help?",
      "It looks like you're trying to write a speech. Would you like help?",
      "It looks like you're trying to write an autobiography. Would you like help?",
      "It looks like you're trying to write some javascript. Would you like help?"
    ];

    var response = invalidResponses[Math.floor(Math.random() * invalidResponses.length)];

    session.send(response);
  }

});
