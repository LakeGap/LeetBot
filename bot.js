if (!process.env.token) {
    console.log('Error: Specify token in environment');
    process.exit(1);
}

function synchAPICalls (urls) {
  var url = urls.pop();
  setTimeout(function(){
    http.get(url,function(res){
      var chunks = '';
    res.on('data',function(d){
      chunk += d;
    });
    res.on('end',function(){
      //do stuffed with chunked result
      if(urls.length){
        synchAPICalls(URLs);
      } else {
        console.log('all done!');
      }
    })
  })
  },5000);
}

//init leet page parsing package "cheerio" and "request"
var cheerio = require('cheerio');
var request = require('request');
var rp = require('request-promise');
//var url = 'https://leetcode.com/henryhoo/';
var baseurl = 'https://leetcode.com/';
//init bot package "botkit"
var Botkit = require('botkit');
var os = require('os');
var controller = Botkit.slackbot({
    debug: true,
    json_file_store: './json_database',
});
var bot = controller.spawn({
    token: process.env.token
}).startRTM();
bot.configureIncomingWebhook({url: 'https://hooks.slack.com/services/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'});

//init time schedule package "cron"
var cron = require('cron');
//init cron job
//00 55 23 * * 1-7 for everyday's 23:55, */10 * * * * * for every 10 sec
var cronJob = cron.job("*/10 * * * * *", function(){
    //get all users
    controller.storage.users.all(function(err, all) {
      var result = "today's progress:\n";
      var results = [];
      var promises = [];
      //init promises with each user's url
      all.forEach(function(node) {
        promises.push(rp({url: baseurl+node.leet}));
      })
      //create promise all to wait for all quesy to finish. Responses will have same order with promises
      Promise.all(promises)
        .then((reponses) => {
          var index = 0; //index for mapping reaponse and request
          reponses.forEach(function(html) {
            // process html
            var $ = cheerio.load(html);
            var names = [];
            var times = [];
            var list = $('h3:contains("recent 10 accepted")').parent().next();
            list.children().each(function(i, ele){
              //get all subject name and finsih time
              names[i] = $(this).children().first().next().next().text();
              times[i] = $(this).children().last().text();
              })
            var count = 0; //variable for counting today's finish
            for (var i = 0, len = times.length; i < len; i++) {
              bot.botkit.debug("time is" + times[i]);
              if (times[i].indexOf("day") > -1 || times[i].indexOf("days") > -1 || times[i].indexOf("week") > -1 || times[i].indexOf("weeks") > -1
                || times[i].indexOf("month") > -1 || times[i].indexOf("months") > -1|| times[i].indexOf("year") > -1|| times[i].indexOf("years") > -1){}
              else {
                //finish today, add count
                count++;
              }
            }
            //add current user's progress to result
            result = result + all[index++].name + ": " + countStars(count) + " star.\n";
            });
          //send bot message when all leetcode query is finished
          bot.sendWebhook({
            text: result,
            channel: '#leetbot',
          },function(err,res) {
            // handle error
          });
        });

    });
});
cronJob.start();

//testing cmd here
controller.hears(['test'], 'direct_message,direct_mention,mention', function(bot, message) {
    controller.storage.users.get(message.user, function(err, user) {
      if (user && user.name) {
        url = 'https://leetcode.com/'+user.leet;
        request(url, function(error, response, html){
          if(!error) {
            bot.botkit.debug("in test");
            var $ = cheerio.load(html);
            var names = [];
            var times = [];
            var list = $('h3:contains("recent 10 accepted")').parent().next();
            bot.botkit.debug("list is"+$('h3:contains("recent")').text());
            list.children().each(function(i, ele){
            //  bot.botkit.debug('in each' + $(this).children().first().next().next().text());
              names[i] = $(this).children().first().next().next().text();
              times[i] = $(this).children().first().next().next().next().text();
            })
          }
              bot.reply(message, names+times+"\n");
        });
      } else {
        bot.reply(message, 'user not found, please signup first');
      }
    })
});

//hello cmd
controller.hears(['hello', 'hi'], 'direct_message,direct_mention,mention', function(bot, message) {

    bot.api.reactions.add({
        timestamp: message.ts,
        channel: message.channel,
        name: 'robot_face',
    }, function(err, res) {
        if (err) {
            bot.botkit.log('Failed to add emoji reaction :(', err);
        }
    });


    controller.storage.users.get(message.user, function(err, user) {
        if (user && user.name) {
            bot.reply(message, 'Hello ' + user.name + '!!');
        } else {
            bot.reply(message, 'Hello.');
        }
    });
});
//call me cmd
controller.hears(['call me (.*)', 'my name is (.*)', 'sign up user (.*)'], 'direct_message,direct_mention,mention', function(bot, message) {
    var name = message.match[1];
    controller.storage.users.get(message.user, function(err, user) {
        if (!user) {
            user = {
                id: message.user,
            };
        }
        user.name = name;
        controller.storage.users.save(user, function(err, id) {
            bot.reply(message, 'Got it. I will call you ' + user.name + ' from now on.');
        });
    });
});
//sign up cmd
controller.hears(['sign up (.*)', 'signup (.*)'], 'direct_message,direct_mention,mention', function(bot, message) {
    var leet = message.match[1];
    controller.storage.users.get(message.user, function(err, user) {
        if (!user) {
            user = {
                id: message.user,
            };
        }
        user.leet = leet;
        controller.storage.users.save(user, function(err, id) {
            bot.reply(message, 'Got it. Your leetcode account is ' + user.leet +' from now on.');
        });
    });
});
//who am i cmd
controller.hears(['what is my name', 'who am i', 'my account'], 'direct_message,direct_mention,mention', function(bot, message) {
    controller.storage.users.get(message.user, function(err, user) {
//        var leet = message.match[2];
        if (user && user.name) {
            bot.reply(message, 'Your name is ' + user.name + (user.leet ? (', your leetcode account is '+ user.leet) : ', leetcode account not set'));
        } else {
            bot.startConversation(message, function(err, convo) {
                if (!err) {
                    convo.say('I do not know your name yet!');
                    convo.ask('What should I call you?', function(response, convo) {
                        convo.ask('You want me to call you `' + response.text + '`?', [
                            {
                                pattern: 'yes',
                                callback: function(response, convo) {
                                    // since no further messages are queued after this,
                                    // the conversation will end naturally with status == 'completed'
                                    convo.next();
                                }
                            },
                            {
                                pattern: 'no',
                                callback: function(response, convo) {
                                    // stop the conversation. this will cause it to end with status == 'stopped'
                                    convo.stop();
                                }
                            },
                            {
                                default: true,
                                callback: function(response, convo) {
                                    convo.repeat();
                                    convo.next();
                                }
                            }
                        ]);
                        convo.next();
                    }, {'key': 'nickname'}); // store the results in a field called nickname

                    convo.on('end', function(convo) {
                        if (convo.status == 'completed') {
                            bot.reply(message, 'OK! I will update my dossier...');

                            controller.storage.users.get(message.user, function(err, user) {
                                if (!user) {
                                    user = {
                                        id: message.user,
                                    };
                                }
                                user.name = convo.extractResponse('nickname');
                                controller.storage.users.save(user, function(err, id) {
                                    bot.reply(message, 'Got it. I will call you ' + user.name + ' from now on.');
                                });
                            });

                        } else {
                            // this happens if the conversation ended prematurely for some reason
                            bot.reply(message, 'OK, nevermind!');
                        }
                    });
                }
            });
        }
    });
});
//add leetcode cmd
controller.hears(['add leetcode (.*)', 'update leetcode (.*)'], 'direct_message,direct_mention,mention', function(bot, message) {
    controller.storage.users.get(message.user, function(err, user) {
        if (!user || !user.name) {
            bot.reply(message, 'please set up user first');
        } else {
            bot.startConversation(message, function(err, convo) {
                if (!err) {
                    convo.ask('What is your account?', function(response, convo) {
                        convo.ask('Your account is `' + response.text + '`?', [
                            {
                                pattern: 'yes',
                                callback: function(response, convo) {
                                    // since no further messages are queued after this,
                                    // the conversation will end naturally with status == 'completed'
                                    convo.next();
                                }
                            },
                            {
                                pattern: 'no',
                                callback: function(response, convo) {
                                    // stop the conversation. this will cause it to end with status == 'stopped'
                                    convo.stop();
                                }
                            },
                            {
                                default: true,
                                callback: function(response, convo) {
                                    convo.repeat();
                                    convo.next();
                                }
                            }
                        ]);
                        convo.next();
                    }, {'key': 'account'}); // store the results in a field called account

                    convo.on('end', function(convo) {
                        if (convo.status == 'completed') {
                            bot.reply(message, 'OK! I will update my dossier...');

                            controller.storage.users.get(message.user, function(err, user) {
                                if (!user) {
                                    user = {
                                        id: message.user,
                                    };
                                }
                                user.leet = convo.extractResponse('account');
                                controller.storage.users.save(user, function(err, id) {
                                    bot.reply(message, 'Got it. you leet account is ' + user.leet + ' from now on.');
                                });
                            });
                        } else {
                            // this happens if the conversation ended prematurely for some reason
                            bot.reply(message, 'OK, nevermind!');
                        }
                    });
                }
            });
        }
    });
});

//shutdown cmd
controller.hears(['shutdown'], 'direct_message,direct_mention,mention', function(bot, message) {

    bot.startConversation(message, function(err, convo) {

        convo.ask('Are you sure you want me to shutdown?', [
            {
                pattern: bot.utterances.yes,
                callback: function(response, convo) {
                    convo.say('Bye!');
                    convo.next();
                    setTimeout(function() {
                        process.exit();
                    }, 3000);
                }
            },
        {
            pattern: bot.utterances.no,
            default: true,
            callback: function(response, convo) {
                convo.say('*Phew!*');
                convo.next();
            }
        }
        ]);
    });
});

//who are you cmd
controller.hears(['uptime', 'identify yourself', 'who are you', 'what is your name'],
    'direct_message,direct_mention,mention', function(bot, message) {

        var hostname = os.hostname();
        var uptime = formatUptime(process.uptime());

        bot.reply(message,
            ':robot_face: I am a bot named <@' + bot.identity.name +
             '>. I have been running for ' + uptime + ' on ' + hostname + '.');

    });

function formatUptime(uptime) {
    var unit = 'second';
    if (uptime > 60) {
        uptime = uptime / 60;
        unit = 'minute';
    }
    if (uptime > 60) {
        uptime = uptime / 60;
        unit = 'hour';
    }
    if (uptime != 1) {
        unit = unit + 's';
    }

    uptime = uptime + ' ' + unit;
    return uptime;
}
function countStars(count) {
    var res = 0;
    if (count >= 10) {
        res = 5;
    }
    else if (count >= 5) {
        res = 3;
    }
    else if (count >= 3 ) {
        res = 2;
    }
    else if (count > 0 ) {
        res = 1;
    }
    return res;
}
