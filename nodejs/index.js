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

        var first = data[0];

        var images = first.images;

        var original = images.original;

        var url = original.url;

        session.send(url);
      }
      catch (e) {
        session.send('Sorry, I couldn\'t find a gif for: ' + string);
      }
    });
  } else {
    session.send('Did you mean \'gif\'?');
  }

});
