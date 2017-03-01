var builder = require('botbuilder');
var giphy = require('giphy-api')();
var restify = require('restify');

//=========================================================
// Declarations
//=========================================================

helpResponse =
  "Hi! I am Clippy, your office assistant. Would you like some assistance \
  today?<br/>---<br/>clippy gif {search term}"

invalidResponses = [
  "It looks like you're trying to build master. Do you need an intervention?",
  "It looks like you're trying to meme. Would you like me to gif?",
  "It looks like you're trying to work. Would you like me to bug you?",
  "It looks like you're trying to write a letter. Would you like help?",
  "It looks like you're trying to write an autobiography. Would you like help?",
  "It looks like you're trying to write some bash. Would you like help?",
  "It looks like you're trying to write some java. Would you like help?",
  "It looks like you're trying to write some javascript. Would you like help?",
  "It looks like you're trying to write some python. Would you like help?"
];

function giphyTranslate(string, callback) {
  giphy.translate({
      s: string,
      rating: 'g'
  }, function(err, response) {
    try {
      var data = response['data'];

      var images = data.images;

      var original = images.original;

      var url = original.url;

      console.log('Giphy translate url: ', url);

      callback(null, url);
    }
    catch (e) {
      console.error(e);
      console.log('Giphy translate url: ', null);

      callback(e, null);
    }
  });
}

//=========================================================
// Bot Setup
//=========================================================

var server = restify.createServer();

server.listen(process.env.port || process.env.PORT || 80, function () {
   console.log('%s listening to %s', server.name, server.url);
});

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
  var text = session.message.text;

  var message = text.toLowerCase();

  console.log('message: ', message);

  var messageWithoutMention = message.replace(/^.*?>.*?> */, '');

  var command = messageWithoutMention.replace(/ +.*/, '');

  console.log('command: ', command);

  var parameters = messageWithoutMention.replace(/.*? +/, '');

  console.log('parameters: ', parameters);

  if (command === "gif") {
    var string = parameters;

    giphyTranslate(string, function(err, url) {
      if (url == null) {
        session.send('Sorry, I couldn\'t find a gif for: ' + string);
      } else {
        session.send(url);
      }
    });
  } else if (command === "help") {
    session.send(helpResponse);
  } else {
    var response =
      invalidResponses[Math.floor(Math.random() * invalidResponses.length)];

    session.send(response);
  }
});

