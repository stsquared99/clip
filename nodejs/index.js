var builder = require('botbuilder');
var giphy = require('giphy-api')();
var momentjs = require('moment-timezone');
var request = require('request');
var restify = require('restify');
var wedeploy = require('wedeploy');

var data = wedeploy.data(process.env.WEDEPLOY_DATA_URL);

//=========================================================
// Declarations
//=========================================================

function commandBeer(options) {
  if (isHappyHour(getCurrentMoment())) {
    options.session.send('(beer) The taps are open! (beer)');

    return;
  }

  var diff = momentjs.duration(getNextHappyHour().diff(getCurrentMoment()));

  var days = diff.days();
  var hours = diff.hours() % 24;
  var minutes = diff.minutes() % 60;

  options.session.send(
    '(beer) ' + days + ' days, ' + hours + ' hours, and ' + minutes  +
    ' minutes (beer)');
}

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
  var helpResponse =
    "Hi! I am Clippy, your office assistant. Would you like some " +
      "assistance today?<br/>---<br/>clippy beer<br/>clippy gif " +
        "{search term}<br/>clippy sfw"

  var whitelistResponse =
    "<br/>---<br/>clippy lunch<br/>: List lunch options<br/>clippy " +
      "{lunch option}<br/>clippy {lunch option} {yes|no}"

  if (options.whitelist === true) {
    options.session.send(helpResponse + whitelistResponse);

    return;
  }

  options.session.send(helpResponse);
}

function commandInvalid(options) {
  var invalidResponses = [
    "It looks like you're trying to build master. Do you need an intervention?",
    "It looks like you're trying to meme. Would you like me to gif?",
    "It looks like you're trying to work. Would you like me to bug you?",
    "It looks like you're trying to write a letter. Would you like help?",
    "It looks like you're trying to write an autobiography. Would you like " +
      "help?",
    "It looks like you're trying to write some bash. Would you like help?",
    "It looks like you're trying to write some java. Would you like help?",
    "It looks like you're trying to write some javascript. Would you like " +
      "help?",
    "It looks like you're trying to write some python. Would you like help?"
  ];

  options.session.send(
    invalidResponses[Math.floor(Math.random() * invalidResponses.length)]);
}

function commandLunchHelp(options) {
  var lunchOptions = getLunchOptions();
  var response = "Lunch options:<br/>---";

  for (var i = 0; i < lunchOptions.length; i++) {
    response += "<br/>";

    response += lunchOptions[i];
  }

  options.session.send(response);
}

function commandLunchCrew(options) {
  if (options.parameters === "no") {
    lunchNo(options);
  } else if (options.parameters === "yes") {
    lunchYes(options);
  } else {
    lunchList(options);
  }
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

function getCurrentMoment() {
  var momentFormat = momentjs().tz("America/Los_Angeles").format();

  return momentjs(momentFormat.replace(/-[^-]*$/, ''));
}

function getLunchOptions() {
  return [
    "brb",
    "jjs",
    "pho",
    "pizza"
  ];
}

function getNextHappyHour() {
  var moment = getCurrentMoment();

  if (moment.day() === 5 && moment.hour() >= 15) {
    moment.add(1, 'days');
  }

  moment.hour(15);
  moment.minutes(0);
  moment.seconds(0);
  moment.milliseconds(0);

  while (!isHappyHour(moment)) {
    moment.add(1, 'days');
  }

  return moment;
}

function getToday() {
  return momentjs().format('YYYY-MM-DD');
}

function giphyTranslate(searchTerm, callback) {
  giphy.translate({
      rating: 'g',
      s: searchTerm
  }, function(error, response) {
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

function isHappyHour(moment) {
  if (moment.day() === 5 && moment.hour() === 15) {
    return true;
  }

  return false;
}


function lunchList(options) {
  var path = 'lunch-' + options.command;
  var today = getToday();

  data.get(path).then(function(lunch) {
    var response = null;

    if (options.command === 'brb') {
      response = 'BRB crew today:';
    } else if (options.command === 'jjs') {
      response = 'JJs crew today:';
    } else {
      var first = options.command.charAt(0).toUpperCase();

      response = options.command.replace(/^[a-z]/, first) + ' crew today:';
    }

    for (var i = 0; i < lunch.length; i++) {
      if (lunch[i].date === today) {
        response += "<br/>";

        response += lunch[i].id;
      }
    }

    options.session.send(response);
  }).catch(function(error) {
    console.error(error);

    options.session.send('Oops, something went wrong. Please try again later.')
  });
}

function lunchNo(options) {
  var lunchPath = 'lunch-' + options.command;

  var userPath = lunchPath + '/' + options.firstName;

  data.get(lunchPath).then(function(lunch) {
    var i = lunch.length;

    while (i--) {
      if (lunch[i].id === options.firstName) {
        data.delete(userPath).then(function(lunch) {
          console.log(lunch);

          lunchList(options);
        }).catch(function(error) {
          console.error(error);

          options.session.send(
            'Oops, something went wrong. Please try again later.')
        });

        break;
      }
    }
  }).catch(function(error) {
    console.error(error);

    options.session.send('Oops, something went wrong. Please try again later.')
  });
}

function lunchYes(options) {
  var lunchPath = 'lunch-' + options.command;

  var userPath = lunchPath + '/' + options.firstName;

  data.get(lunchPath).then(function(lunch) {
    var today = getToday();

    var i = lunch.length;

    while (i--) {
      if (lunch[i].id === options.firstName) {
        data.update(userPath, {
          "date": today
        }).then(function(lunch) {
          console.log(lunch);

          lunchList(options);
        }).catch(function(error) {
          console.error(error);

          options.session.send(
            'Oops, something went wrong. Please try again later.')
        });

        return;
      }
    }

    data.create(lunchPath, {
      "date": today,
      "id": options.firstName
    }).then(function(lunch) {
      console.log(lunch);

      lunchList(options);
    });
  }).catch(function(error) {
    console.error(error);

    options.session.send('Oops, something went wrong. Please try again later.')
  });
}

function postGif (searchTerm, session) {
  giphyTranslate(searchTerm, function(error, url) {
    if (url == null) {
      console.log(error);

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

  var parameters =
    messageWithoutMention.replace(/[^ ]+ */, '').replace(/ *$/, '');

  console.log('parameters: ', parameters);

  var userId = session.message.user.id;

  console.log('userId: ', userId);

  var userName = session.message.user.name;

  console.log('userName: ', userName);

  var firstName = userName.replace(/ .*/, '');

  console.log('firstName: ', firstName);

  var channelId = session.message.address.channelId;
  var conversationId = session.message.address.conversation.id;

  console.log('conversationId: ', conversationId);

  var conversationWhitelist = [
    "19:617707e9e67449d3a497f58da54c5e8c@thread.skype",
    "19:I3RyYXZpcy5yLmNvcnkvJGMyOWM1OTc2MjEzNGUzZWY=@p2p.thread.skype"
  ]

  var whitelist = false;

  if (channelId === 'emulator' ||
      contains(conversationWhitelist, conversationId)) {

      whitelist = true;
  }

  console.log('whitelist: ', whitelist);

  var lunchOptions = getLunchOptions();

  var options = {
    command: command,
    conversationId: conversationId,
    firstName: firstName,
    parameters: parameters,
    session: session,
    userName: userName,
    userId: userId,
    whitelist: whitelist
  };

  if (command === 'beer') {
    commandBeer(options);
  } else if (command === 'gif') {
    commandGif(options);
  } else if (command === 'help') {
    commandHelp(options);
  } else if (command === 'sfw') {
    commandSfw(options);
  } else if (command === 'genuine' && parameters === 'thrilla') {
    session.send('https://twitter.com/griffinmcelroy/status/677966778417283072');
  } else if (whitelist && command === 'lunch') {
    commandLunchHelp(options);
  } else if (whitelist && contains(lunchOptions, command)) {
    commandLunchCrew(options);
  } else {
    commandInvalid(options);
  }
});

