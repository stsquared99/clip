var builder = require('botbuilder');
var giphy = require('giphy-api')();
var restify = require('restify');

//=========================================================
// Declarations
//=========================================================

helpResponse =
  "Hi! I am Clippy, your office assistant. Would you like some assistance \
today?<br/>---<br/>clippy gif {search term}<br/>clippy sfw"

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

function commandGif(options) {
  var searchTerm = options.parameters;

  if (searchTerm.length === 0) {
    options.session.send(
      '\'gif\' requires a search term' + searchTerm);

    return;
  }

  postGif(searchTerm, options.session);
}

function commandHelp(options) {
  options.session.send(helpResponse);
}

function commandInvalid(options) {
  var response =
    invalidResponses[Math.floor(Math.random() * invalidResponses.length)];

  options.session.send(response);
}

function commandSfw(options) {
  postGif('puppies', options.session);
  postGif('puppies', options.session);
  postGif('puppies', options.session);
}

function giphyTranslate(searchTerm, callback) {
  giphy.translate({
      rating: 'g',
      s: searchTerm
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

function postGif (searchTerm, session) {
  giphyTranslate(searchTerm, function(err, url) {
    if (url == null) {
      session.send('Sorry, I couldn\'t find a gif for: ' + searchTerm);
    } else {
      session.send(url);
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

  var messageWithoutMention = message.replace(/^.*?>.*?>[^a-z]*/, '');

  var command = messageWithoutMention.replace(/ +.*/, '');

  console.log('command: ', command);

  var parameters = messageWithoutMention.replace(/[^ ]+ */, '');

  console.log('parameters: ', parameters);

  var options = {
    command: command,
    parameters: parameters,
    session: session
  }

  if (command === "gif") {
    commandGif(options);
  } else if (command === "help") {
    commandHelp(options);
  } else if (command === "sfw") {
    commandSfw(options);
  } else {
    commandInvalid(options);
  }
});

