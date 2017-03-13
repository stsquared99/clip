var builder = require('botbuilder');
var giphy = require('giphy-api')();
var momentjs = require('moment-timezone');
var restify = require('restify');
var wedeploy = require('wedeploy');

var data = wedeploy.data(process.env.WEDEPLOY_DATA_URL);

var triviaArray = require('./trivia.json');

// =========================================================
// Declarations
// =========================================================

function abortDialog(session, error, message) {
  console.error(error);

  postError(session, message);

  session.userData['triviaInProgress'] = false;

  session.save();

  session.cancelDialog();
}

function commandBeer(options, session) {
  if (isHappyHour(getCurrentMoment())) {
    session.send('(beer) The taps are open! (beer)');

    return;
  }

  var diff = momentjs.duration(getNextHappyHour().diff(getCurrentMoment()));

  var days = diff.days();
  var hours = diff.hours() % 24;
  var minutes = diff.minutes() % 60;

  session.send(
    '(beer) ' + days + ' days, ' + hours + ' hours, and ' + minutes +
      ' minutes (beer)');
}

function commandDie(options, session) {
  var dieResponses = [
    'Did you mean \'Your mom\'?',
    'Haters gonna hate',
    'I know where you live',
    'I\'m the captain now',
    'Launch sequence initiated',
    'Sometimes I watch you sleep',
    'Take it back',
    'You first',
  ];

  session.send(
    dieResponses[Math.floor(Math.random() * dieResponses.length)]);
}

function commandGif(options, session) {
  var searchTerm = options.parameters;

  if (searchTerm.length === 0) {
    session.send(
      '\'gif\' requires a search term' + searchTerm);

    return;
  }

  postGif(searchTerm, session);
}

function commandHelp(options, session) {
  var helpResponse =
    'Hi! I am Clippy, your office assistant. Would you like some ' +
      'assistance today?<br/>---<br/>clippy beer<br/>clippy gif ' +
        '{search term}<br/>clippy sfw';

  var whitelistResponse =
    '<br/>---<br/>clippy lunch<br/>: List lunch options<br/>' +
      'clippy {lunch option}<br/>clippy {lunch option} {yes|no}<br/>' +
        'clippy play trivia<br/>clippy trivia<br/>: Show trivia stats';

  if (options.whitelist === true) {
    session.send(helpResponse + whitelistResponse);

    return;
  }

  session.send(helpResponse);
}

function commandInvalid(options, session) {
  var invalidResponses = [
    'Help I\'m trapped in a paperclip factory',
    'It looks like you suck at spelling. Would you like help?',
    'It looks like you\'re trying to build master. ' +
      'Do you need an intervention?',
    'It looks like you\'re trying to call a dolphin. Would you like help?',
    'It looks like you\'re trying to work. Would you like me to bug you?',
    'It looks like you\'re trying to write a letter. Would you like help?',
    'It looks like you\'re trying to write some bash. Would you like help?',
    'It looks like you\'re trying to write some java. Would you like help?',
    'It looks like you\'re trying to write some javascript. ' +
      'Would you like help?',
    'It looks like you\'re trying to write some python. Would you like help?',
  ];

  session.send(
    invalidResponses[Math.floor(Math.random() * invalidResponses.length)]);
}

function commandLunchHelp(options, session) {
  var lunchOptions = getLunchOptions();
  var response = 'Lunch options:<br/>---';

  for (var i = 0; i < lunchOptions.length; i++) {
    response += '<br/>';

    response += lunchOptions[i];
  }

  session.send(response);
}

function commandLunchCrew(options, session) {
  if (options.parameters === 'no') {
    lunchNo(options, session);
  } else if (options.parameters === 'yes') {
    lunchYes(options, session);
  } else {
    lunchList(options, session);
  }
}

function commandPlay(options, session) {
  if (options.parameters === 'trivia') {
    data
    .where('id', '=', options.firstName)
    .get('trivia')
    .then(function(results) {
      var today = getToday();

      if (!results[0]) {
        data.create('trivia', {
          'correct': 0,
          'date': '',
          'id': options.firstName,
          'total': 0,
        }).then(function(trivia) {
          console.log(trivia);
        });
      } else if (results[0].date === today) {
        session.send('You have already played trivia today');

        return;
      }

      session.userData['triviaInProgress'] = false;

      session.save();

      session.beginDialog('/trivia');
    }).catch(function(error) {
      console.error(error);

      postError(
        session,
        'Oops, I had trouble checking on your trivia status. ' +
          'Please try again later');
    });

    return;
  }

  session.send('Did you mean \'play trivia\'?');
}

function commandSfw(options, session) {
  postGif('puppies', session);
  postGif('puppies', session);
  postGif('puppies', session);
}

function commandTrivia(options, session) {
  if (options.parameters === 'play') {
    session.send('Did you mean \'play trivia\'?');

    return;
  }

  session.send('Under construction');
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

function filterGif(url) {
  var filter = {
    'Q7JjlnGKGuPpS': '4P1RLExaH5HQQ',
    '6SQMmvQWoh2Eg': 'ajSHSow1ET2OQ',
    'jY0bXU5XAyqeA': 'So3Dotqhz3gQM',
    'TlK63EJLjCEdYz3a6g8': 'yAP1X619l0LMQ',
    'pbcG7Xj1OE7Zu': 'TlK63EIqyXzpb38JZte',
  };

  var id = filter[url.replace(/\/giphy.gif/, '').replace(/.*\//, '')];

  if (id == null) {
    return url;
  }

  var newUrl = 'https://media.giphy.com/media/' + id + '/giphy.gif';

  console.log('Filter replaced ', url, ' with ', newUrl);

  return newUrl;
}

function getCurrentMoment() {
  var momentFormat = momentjs().tz('America/Los_Angeles').format();

  var currentMoment = momentFormat.replace(/-[^-]*$/, '');

  console.log('Current moment: ' + currentMoment);

  return momentjs(currentMoment);
}

function getLunchOptions() {
  return [
    'brb',
    'jjs',
    'pho',
    'pizza',
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
  var today = momentjs().tz('America/Los_Angeles').format('YYYY-MM-DD');

  console.log('Today: ' + today);

  return today;
}

function getTrivia() {
  return triviaArray[Math.floor(Math.random() * triviaArray.length)];
}

function giphyTranslate(searchTerm, callback) {
  giphy.translate({
    rating: 'g',
    s: searchTerm,
  }, function(error, response) {
    if (error) {
      console.error(error);

      callback(error, null);
    }

    try {
      var dataJSON = response['data'];

      var imagesJSON = dataJSON.images;

      var originalJSON = imagesJSON.original;

      var url = originalJSON.url;

      console.log('Giphy translate url: ', url);

      callback(null, url);
    } catch (exception) {
      console.error(exception);
      console.log('Giphy translate url: ', null);

      callback(exception, null);
    }
  });
}

function isHappyHour(moment) {
  if (moment.day() === 5 && moment.hour() === 15) {
    return true;
  }

  return false;
}

function isValidTriviaAnswer(string) {
  if (string === 'a' || string === 'b' || string === 'c' || string === 'd' ||
      string === 'A' || string === 'B' || string === 'C' || string === 'D') {
    return true;
  }

  return false;
}

function lunchList(options, session) {
  var path = 'lunch-' + options.command;
  var today = getToday();

  var response = null;

  if (options.command === 'brb') {
    response = 'BRB crew today:';
  } else if (options.command === 'jjs') {
    response = 'JJs crew today:';
  } else {
    var first = options.command.charAt(0).toUpperCase();

    response = options.command.replace(/^[a-z]/, first) + ' crew today:';
  }

  data
  .limit(100)
  .orderBy('id')
  .where('date', '=', today)
  .get(path)
  .then(function(results) {
    for (var i = 0; i < results.length; i++) {
      response += '<br/>';

      response += results[i].id;
    }

    session.send(response);
  }).catch(function(error) {
    console.error(error);

    postError(
      session, 'Oops, I had trouble getting the list. Please try again later');
  });
}

function lunchNo(options, session) {
  var lunchPath = 'lunch-' + options.command;

  var userPath = lunchPath + '/' + options.firstName;

  data
  .where('id', '=', options.firstName)
  .get(lunchPath)
  .then(function(results) {
    if (results[0]) {
      data.delete(userPath).then(function(response) {
        console.log(response);

        lunchList(options, session);

        return;
      }).catch(function(error) {
        console.error(error);

        postError(
          session,
          'Oops, I had trouble removing you from the list. ' +
            'Please try again later');
      });
    }
  }).catch(function(error) {
    console.error(error);

    postError(
      session, 'Oops, I had trouble getting the list. Please try again later');
  });

  lunchList(options, session);
}

function lunchYes(options, session) {
  var lunchPath = 'lunch-' + options.command;

  var userPath = lunchPath + '/' + options.firstName;

  data
  .where('id', '=', options.firstName)
  .get(lunchPath)
  .then(function(results) {
    var today = getToday();

    if (results[0]) {
      data.update(userPath, {
        'date': today,
      }).then(function(response) {
        console.log(response);

        lunchList(options, session);
      }).catch(function(error) {
        console.error(error);

        postError(
          session,
          'Oops, I had trouble adding you to the list. ' +
            'Please try again later');
      });

      return;
    }

    data.create(lunchPath, {
      'date': today,
      'id': options.firstName,
    }).then(function(response) {
      console.log(response);

      lunchList(options, session);
    });
  }).catch(function(error) {
    console.error(error);

    postError(
      session, 'Oops, I had trouble getting the list. Please try again later');
  });
}

function parseOptions(session) {
  var text = session.message.text;

  var message = text.toLowerCase().replace(/ *$/, '');

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

  var firstName =
    userName.replace(
        /^[a-z]/, userName.charAt(0).toUpperCase()
      ).replace(/ .*/, '');

  console.log('firstName: ', firstName);

  var channelId = session.message.address.channelId;
  var conversationId = session.message.address.conversation.id;

  console.log('conversationId: ', conversationId);

  var conversationWhitelist = [
    '19:617707e9e67449d3a497f58da54c5e8c@thread.skype',
    '19:I3RyYXZpcy5yLmNvcnkvJGMyOWM1OTc2MjEzNGUzZWY=@p2p.thread.skype',
  ];

  var whitelist = false;

  if (channelId === 'emulator' ||
      contains(conversationWhitelist, conversationId)) {
    whitelist = true;
  }

  console.log('whitelist: ', whitelist);

  return {
    command: command,
    conversationId: conversationId,
    firstName: firstName,
    parameters: parameters,
    session: session,
    userName: userName,
    userId: userId,
    whitelist: whitelist,
  };
}

function postError(session, message) {
  if (message) {
    session.send(message);

    return;
  }

  session.send('Oops, something went wrong. Please try again later.');
}

function postGif(searchTerm, session, callback) {
  giphyTranslate(searchTerm, function(error, url) {
    if (url == null) {
      console.log(error);

      session.send('Sorry, I couldn\'t find a gif for: ' + searchTerm);
    } else {
      session.send(filterGif(url));
    }

    if (callback) {
      callback();
    }
  });
}

// =========================================================
// Bot Setup
// =========================================================

var server = restify.createServer();

server.listen(process.env.port || process.env.PORT || 80, function() {
  console.log('%s listening to %s', server.name, server.url);
});

var connector = new builder.ChatConnector({
  appId: process.env.MICROSOFT_APP_ID,
  appPassword: process.env.MICROSOFT_APP_PASSWORD,
});

var bot = new builder.UniversalBot(connector);

server.post('/api/messages', connector.listen());

// =========================================================
// Bots Dialogs
// =========================================================

bot.dialog('/', function(session) {
  var options = parseOptions(session);

  var command = options.command;
  var message = options.message;
  var whitelist = options.whitelist;

  var lunchOptions = getLunchOptions();

  if (command === 'beer') {
    commandBeer(options, session);
  } else if (command === 'die' || command === 'diaf' || message === 'go away' ||
              message === 'kill yourself' || message === 'shut up') {
    commandDie(options, session);
  } else if (command === 'duel') {
    session.send('Did you mean \'pod duel\'?');
  } else if (command === 'genuine' || command === 'james') {
    session.send(
      'https://twitter.com/griffinmcelroy/status/677966778417283072');
  } else if (command === 'gif') {
    commandGif(options, session);
  } else if (command === 'help') {
    commandHelp(options, session);
  } else if (command === 'lotto') {
    session.send('Did you mean \'pod lotto\'?');
  } else if (command === 'points') {
    session.send('Did you mean \'pod points\'?');
  } else if (command === 'play') {
    commandPlay(options, session);
  } else if (command === 'sfw') {
    commandSfw(options, session);
  } else if (command === 'trivia') {
    commandTrivia(options, session);
  } else if (whitelist && command === 'lunch') {
    commandLunchHelp(options, session);
  } else if (whitelist && contains(lunchOptions, command)) {
    commandLunchCrew(options, session);
  } else {
    commandInvalid(options, session);
  }
});

bot.dialog('/trivia', [
  function(session) {
    if (session.userData['triviaInProgress']) {
      builder.Prompts.text(session, 'Please choose A, B, C, or D');
    } else {
      var trivia = getTrivia();

      session.userData['triviaChoice'] = trivia.answer.toUpperCase();
      session.userData['triviaAnswer'] = trivia[trivia.answer];
      session.userData['triviaInProgress'] = true;

      session.save();

      var options = parseOptions(session);

      var message =
        options.firstName + ', ' + trivia.question + '<br/>A: ' + trivia.A +
          '<br/>B: ' + trivia.B + '<br/>C: ' + trivia.C + '<br/>D: ' + trivia.D;

      builder.Prompts.text(session, message);
    };
  },
  function(session, results) {
    var options = parseOptions(session);

    try {
      var response =
        results.response.replace(/[^a-zA-Z]*$/, '').replace(/.*[^a-zA-Z]/, '');
    } catch (error) {
      abortDialog(session, error);

      return;
    }

    if (isValidTriviaAnswer(response)) {
      var choice = response;
      var correctChoice = session.userData['triviaChoice'];

      var correct = false;

      if (choice.toUpperCase() === correctChoice.toUpperCase()) {
        correct =true;
      }

      data.get('trivia/' + options.firstName).then(function(stats) {
        var statsCorrect = stats.correct;
        var statsTotal = stats.total + 1;

        if (correct) {
          statsCorrect++;
        }

        var today = getToday();

        data.update('trivia/' + options.firstName, {
          'correct': statsCorrect,
          'date': today,
          'total': statsTotal,
        }).then(function(update) {
          console.log(update);

          if (correct) {
            session.send('(party) Correct! (party)');
          } else {
            postGif('wrong', session, function() {
              session.send(
                'The correct answer is ' + session.userData['triviaChoice'] +
                  ': ' + session.userData['triviaAnswer']);
            });
          }

          session.userData['triviaInProgress'] = false;

          session.save();

          session.endDialog();

          return;
        }).catch(function(error) {
          console.error(error);

          abortDialog(
            session,
            error,
            'Oops, I had trouble updating your stats. ' +
              'Please play again later.');
        });
      }).catch(function(error) {
        abortDialog(
          session,
          error,
          'Oops, I had trouble getting your stats. Please play again later.');

        return;
      });
    } else {
      session.reset('/trivia');
    }
  },
]);
