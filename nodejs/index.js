var builder = require('botbuilder');
var chrono = require('chrono-node');
var didyoumean = require('didyoumean');
var giphy = require('giphy-api')();
var momentjs = require('moment-timezone');
var restify = require('restify');
var schedule = require('node-schedule');
var wedeploy = require('wedeploy');

var data = wedeploy.data(process.env.WEDEPLOY_DATA_URL);

var triviaArray = require('./trivia.json');

// =========================================================
// Functions
// =========================================================

function abortDialog(session, error, message) {
  console.error(error);

  postError(session, message);

  session.userData['triviaInProgress'] = false;

  session.save();

  session.cancelDialog();
}

function addEvent(eventName, callback) {
  data
  .where('id', '=', eventName)
  .get('events')
  .then(function(results) {
    var today = getToday();

    if (results[0]) {
      data.update('events/' + eventName, {
        'date': today,
      }).then(function(response) {
        console.log(response);

        callback(null);
      }).catch(function(error) {
        callback(error);
      });

      return;
    }

    data.create('events', {
      'date': today,
      'id': eventName,
    }).then(function(response) {
      console.log(response);

      callback(null);
    }).catch(function(error) {
      callback(error);
    });
  }).catch(function(error) {
    callback(error);
  });
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
    'Good, good. Give in to your anger',
    'Good, good. Let the hate flow through you',
    'Haters gonna hate',
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

function commandEvent(options, session) {
  if (options.parameters === 'no') {
    eventNo(options, session);
  } else if (options.parameters === 'yes') {
    eventYes(options, session);
  } else {
    eventList(options, session);
  }
}

function commandEvents(options, session) {
  if (!options.parameters || options.parameters === 'list') {
    eventsList(options, session);
  } else {
    var eventName = options.parameters.replace(/[^a-zA-Z0-9_\-]/g, '');

    if (getCommandFunction({'command': eventName, 'whitelist': true})) {
      session.send('Sorry, \'' + eventName + '\' is a taken as a command name');

      return;
    }

    addEvent(eventName, function(error) {
      if (error) {
        console.log(error);

        postError(
          session,
          'Oops, I had trouble adding the event. Please try again later');

        return;
      }

      eventsList(options, session);
    });
  }
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
    '<br/>---<br/>clippy event<br/>: List today\'s events<br/>' +
      'clippy event {event name}<br/>: Add a new event<br/>' +
        'clippy {event name}<br/>clippy {event name} {yes|no}<br/>' +
          'clippy play trivia<br/>clippy trivia<br/>: Show trivia stats';

  if (options.whitelist) {
    session.send(helpResponse + whitelistResponse);

    return;
  }

  session.send(helpResponse);
}

function commandInvalid(options, session) {
  var invalidResponses = [
    'Help I\'m trapped in a paperclip factory',
    'It looks like you suck at spelling. Do you need help?',
    'It looks like you\'re trying to build master. ' +
      'Do you need an intervention?',
    'It looks like you\'re trying to call a dolphin. Do you need help?',
    'It looks like you\'re trying to work. Would you like me to bug you?',
    'It looks like you\'re trying to write a letter. Do you need help?',
    'It looks like you\'re trying to write some bash. Do you need help?',
    'It looks like you\'re trying to write some java. Do you need help?',
    'It looks like you\'re trying to write some javascript. Do you need help?',
    'It looks like you\'re trying to write some python. Do you need help?',
  ];

  session.send(
    invalidResponses[Math.floor(Math.random() * invalidResponses.length)]);
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

          session.userData['triviaInProgress'] = false;

          session.save();

          session.beginDialog('/trivia');
        }).catch(function(error) {
          console.error(error);

          postError(
            session,
            'Oops, I had trouble updating your trivia status. ' +
              'Please try again later');
        });
      } else if (results[0].date === today) {
        session.send('You have already played trivia today');
      }
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

function commandTimer(options, session) {
  var date = chrono.parseDate(options.parameters);

  session.send(
    'Timer set for: ' +
      momentjs.tz(date, 'America/Los_Angeles').format('YYYY-MM-DD HH:mm'));
}

function commandTrivia(options, session) {
  if (options.parameters === 'play') {
    session.send('Did you mean \'play trivia\'?');

    return;
  }

  var response = 'Trivia stats:<br/>---';

  data
  .limit(100)
  .orderBy('correct')
  .get('trivia')
  .then(function(results) {
    for (var i = 0; i < results.length; i++) {
      var entry =
        '<br/>' + results[i].id + ': ' + results[i].correct + '/' +
          results[i].total + ' correct answers';

      response += entry;
    }

    session.send(response);
  }).catch(function(error) {
    console.error(error);

    postError(
      session, 'Oops, I had trouble getting the stats. Please try again later');
  });
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

function eventList(options, session) {
  var today = getToday();

  var response = options.command + ' crew today:';

  data
  .limit(100)
  .orderBy('id')
  .where('date', '=', today)
  .get('event_' + options.command)
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

function eventNo(options, session) {
  var eventPath = 'event_' + options.command;

  var userPath = eventPath + '/' + options.firstName;

  data
  .where('id', '=', options.firstName)
  .get(eventPath)
  .then(function(results) {
    if (results[0]) {
      data.delete(userPath).then(function(response) {
        console.log(response);

        eventList(options, session);
      }).catch(function(error) {
        console.error(error);

        postError(
          session,
          'Oops, I had trouble removing you from the list. ' +
            'Please try again later');
      });

      return;
    }

    eventList(options, session);
  }).catch(function(error) {
    console.error(error);

    postError(
      session, 'Oops, I had trouble getting the list. Please try again later');
  });
}

function eventYes(options, session) {
  var eventPath = 'event_' + options.command;

  var userPath = eventPath + '/' + options.firstName;

  data
  .where('id', '=', options.firstName)
  .get(eventPath)
  .then(function(results) {
    var today = getToday();

    if (results[0]) {
      data.update(userPath, {
        'date': today,
      }).then(function(response) {
        console.log(response);

        eventList(options, session);
      }).catch(function(error) {
        console.error(error);

        postError(
          session,
          'Oops, I had trouble adding you to the list. ' +
            'Please try again later');
      });

      return;
    }

    data.create(eventPath, {
      'date': today,
      'id': options.firstName,
    }).then(function(response) {
      console.log(response);

      eventList(options, session);
    }).catch(function(error) {
      console.error(error);

      postError(
        session,
        'Oops, I had trouble adding you to the list. ' +
          'Please try again later');
    });
  }).catch(function(error) {
    console.error(error);

    postError(
      session, 'Oops, I had trouble getting the list. Please try again later');
  });
}

function eventsList(options, session) {
  var today = getToday();

  var response = 'Today\'s events:<br/>---';

  data
  .limit(1000)
  .orderBy('id')
  .where('date', '=', today)
  .get('events')
  .then(function(results) {
    for (var i = 0; i < results.length; i++) {
      response += '<br/>';

      response += results[i].id;
    }

    session.send(response);
  }).catch(function(error) {
    console.error(error);

    postError(
      session,
      'Oops, I had trouble getting the list. Please try again later');
  });
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

function getCommandFunction(options) {
  var command = options.command;
  var message = options.message;
  var whitelist = options.whitelist;

  if (command === 'beer') {
    return commandBeer;
  } else if (
      command === 'die' || command === 'diaf' || message === 'go away' ||
      message === 'kill yourself' || message === 'shut up') {
    return commandDie;
  } else if (command === 'duel') {
    return function(options, session) {
      session.send('Did you mean \'pod duel\'?');
    };
  } else if (
      command === 'james' || message === 'genuine thrilla' ||
      message === 'masta killa') {
    return function(options, session) {
      session.send(
        'https://twitter.com/griffinmcelroy/status/677966778417283072');
    };
  } else if (command === 'gif') {
    return commandGif;
  } else if (command === 'help') {
    return commandHelp;
  } else if (command === 'lotto') {
    return function(options, session) {
      session.send('Did you mean \'pod lotto\'?');
    };
  } else if (command === 'points') {
    return function(options, session) {
      session.send('Did you mean \'pod points\'?');
    };
  } else if (command === 'sfw') {
    return commandSfw;
  } else if (command === 'time' || command === 'timer') {
    return commandTimer;
  } else if (whitelist && (command === 'event' || command === 'events')) {
    return commandEvents;
  } else if (whitelist && command === 'play') {
    return commandPlay;
  } else if (whitelist && command === 'trivia') {
    return commandTrivia;
  }

  return null;
}

function getCurrentMoment() {
  var momentFormat = momentjs().tz('America/Los_Angeles').format();

  var currentMoment = momentFormat.replace(/-[^-]*$/, '');

  console.log('Current moment: ' + currentMoment);

  return momentjs(currentMoment);
}

function getEvent(eventName, callback) {
  var today = getToday();

  data
  .where('date', '=', today)
  .get('events')
  .then(function(results) {
    var events = [];
    var i = results.length;

    while (i--) {
      events.push(results[i].id);
    }

    callback(null, didyoumean(eventName, events));
  }).catch(function(error) {
    callback(error, null);
  });
}

function getMoment(year, month, day, hour, minutes) {
  var dateString =
    year + '-' + month.toString().replace(/^[0-9]$/, '0$&') + '-' +
      day.toString().replace(/^[0-9]$/, '0$&') + ' ' +
        hour.toString().replace(/^[0-9]$/, '0$&') + ':' +
          minutes.toString().replace(/^[0-9]$/, '0$&');

  console.log(dateString);

  var moment = momentjs.tz(dateString, 'America/Los_Angeles').format();

  console.log('Moment: ' + moment);

  return momentjs(moment);
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

  console.log('Next happy hour: ' + moment);

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

      return;
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
    message: message,
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

//
// Schedule happy hour
//

var date = new Date(getMoment(2017, 3, 17, 15, 0).valueOf());

console.log(date);

var scheduleString =
  date.getMinutes() + ' ' + date.getHours() + ' * * ' + date.getDay();

schedule.scheduleJob(scheduleString, function() {
  var happyHourAddress = {
    bot: {
      id: '28:e2532843-f1a4-4f89-9896-a885d4d97dc0',
      name: 'clippy',
    },
    channelId: 'skype',
    conversation: {
      id: '19:I3RyYXZpcy5yLmNvcnkvJGMyOWM1OTc2MjEzNGUzZWY=@p2p.thread.skype',
      isGroup: true,
     },
    id: '1489606133275',
    serviceUrl: 'https://smba.trafficmanager.net/apis/',
    useAuth: true,
    user: {
      id: '29:1s8dODT66xXniSr6AdqdtQZP-m-gtf4EoHG3vZL4tX58',
      name: 'Sam Tran',
    },
  };

  var happyHourMessage =
    '(beer)(beer)(beer)(beer)(beer)(beer)(beer)(beer)<br/>' +
    '(beer)(beer)(beer)(beer)(beer)(beer)(beer)(beer)<br/>' +
    '(beer)(beer)(beer)(beer)(beer)(beer)(beer)(beer)(beer)(beer)<br/>' +
    '(beer)(beer)(beer)(beer)(beer)(beer)(beer)(beer) (drunk) (beer)<br/>' +
    '(beer)(beer)(beer)(beer)(beer)(beer)(beer)(beer) (drunk) (beer)<br/>' +
    '(beer)(beer)(beer)(beer)(beer)(beer)(beer)(beer)(beer)(beer)<br/>' +
    '(beer)(beer)(beer)(beer)(beer)(beer)(beer)(beer)<br/>' +
    '(beer)(beer)(beer)(beer)(beer)(beer)(beer)(beer)<br/>' +
    '(beer)(beer)(beer)(beer)(beer)(beer)(beer)(beer)<br/>' +
    '(beer)(beer)(beer)(beer)(beer)(beer)(beer)(beer)<br/>';

  var message =
    new builder.Message().address(happyHourAddress).text(happyHourMessage);

  bot.send(message);
});

// =========================================================
// Bots Dialogs
// =========================================================

bot.dialog('/', function(session) {
  var options = parseOptions(session);

  var commandFunction = getCommandFunction(options);

  if (commandFunction) {
    commandFunction(options, session);
  } else if (options.whitelist) {
    getEvent(options.command, function(error, result) {
      if (error) {
        postError(
          session, error,
          'Oops, I had trouble checking for events. Please try again later.');
      } else if (options.command === result) {
        commandEvent(options, session);
      } else if (options.parameters === 'yes') {
        if (result) {
          session.send('Did you mean \'' + result + '\'?');

          return;
        }

        addEvent(options.command, function(error) {
          if (error) {
            console.log(error);

            postError(
              session,
              'Oops, I had trouble adding the event. Please try again later');

              return;
          }

          commandEvent(options, session);
        });
      } else if (result) {
        session.send('Did you mean \'' + result + '\'?');
      } else {
        commandInvalid(options, session);
      }
    });
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
