var builder = require('botbuilder');
var giphy = require('giphy-api')();
var restify = require('restify');
var wedeploy = require('wedeploy');

var data = wedeploy.data(process.env.WEDEPLOY_DATA_URL);

//=========================================================
// Declarations
//=========================================================

conversationWhitelist = [
  "19:136dcf03074f4af892554d0b04293130@thread.skype",
  "19:617707e9e67449d3a497f58da54c5e8c@thread.skype"
]

lunchOptions = [
  "albertsons",
  "brb",
  "jjs",
  "pho",
  "pizza"
];

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

function commandLunchHelp(options) {
  var lunchHelpResponse = "Lunch options:<br/>---";

  for (var i = 0; i < lunchOptions.length; i++) {
    lunchHelpResponse += "<br/>";

    lunchHelpResponse += lunchOptions[i];
  }

  options.session.send(lunchHelpResponse);
}

function commandLunchCrew(options) {
  options.session.send(
    '\'' + options.command + '\' has not yet been implemented');

  // var currentDate = getCurrentDate();
  //
  // data.create('albertsons', {
  //   "date": currentDate,
  //   "id": options.userName
  // }).then(function(albertsons) {
  //   console.log(albertsons);
  // });
}

function commandSfw(options) {
  postGif('puppies', options.session);
  postGif('puppies', options.session);
  postGif('puppies', options.session);
}

function contains(array, object) {
  var i = array.length;

  while (i--) {
    if (array[i] === object) {
      return true;
    }
  }

  return false;
}

function getCurrentDate() {
  var currentDateTime = getCurrentDateTime();

  var currentDate =
    new Date(
      currentDateTime.getFullYear(),
      currentDateTime.getMonth(),
      currentDateTime.getDate(),
      0, 0, 0, 0);

  currentDate.setUTCHours(0);

  return currentDate;
}

function getCurrentDateTime() {
  var utcDateTime = new Date();

  time = utcDateTime.getTime();
  offset = utcDateTime.getTimezoneOffset() * 60000;

  var currentDateTime = new Date(time - offset);

  return currentDateTime;
}

function giphyTranslate(searchTerm, callback) {
  giphy.translate({
      rating: 'g',
      s: searchTerm
  }, function(err, response) {
    try {
      var dataJSON = response['data'];

      var imagesJSON = dataJSON.images;

      var originalJSON = imagesJSON.original;

      var url = originalJSON.url;

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

  var userName = session.message.user.name;

  console.log('userName: ', userName);

  var userId = session.message.user.id;

  console.log('userId: ', userId);

  var channelId = session.message.address.channelId;
  var conversationId = session.message.address.conversation.id;

  var options = {
    command: command,
    parameters: parameters,
    session: session,
    userName: userName,
    userId: userId
  };

  if (command === 'gif') {
    commandGif(options);
  } else if (command === 'help') {
    commandHelp(options);
  } else if (command === 'lunch') {
    commandLunchHelp(options);
  } else if (command === 'sfw') {
    commandSfw(options);
  } else if (
      channelId === 'emulator' ||
      contains(conversationWhitelist, conversationid)) {

    if (contains(lunchOptions, command)) {
      commandLunchCrew(options);
    }
  } else {
    commandInvalid(options);
  }
});

