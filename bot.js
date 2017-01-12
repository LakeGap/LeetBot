if (!process.env.LEETBOT_KEY) {
    console.log('Error: Specify token in environment');
    process.exit(1);
}
//import helper
var botHelper = require("./helper.js");
//init leet page parsing package "cheerio" and "request"
var cheerio = require('cheerio');
// var request = require('request');
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
    token: process.env.LEETBOT_KEY
}).startRTM();
//bot.configureIncomingWebhook({url: 'https://hooks.slack.com/services/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'});

//init time schedule package "cron"
var cron = require('cron');
var timezone = 'America/new_york';

var fs = require('fs');

var hourlyJob = cron.job("0 */1 * * *", function(){
    controller.storage.users.all(function(err, all) {
      //init with each user's url
      var urls = [];
      all.forEach(function(node) {
        urls.push({url: baseurl+node.leet});
      })
      var getPage = urls.map(rp);
      var pages = Promise.all(getPage);
      //create promise all to wait for all quesy to finish. Responses will have same order with promises
      pages.then(function(response) {
        return Promise.all(response.map(homeParser));
      }).then(function(json){
        var objs = Promise.all(json.map(timeFilter));
        return objs;
      })
      .then(data => {
        return updateCurrentStatus(data, all, function(result) {
          // bot.say({
          //   text: result,
          //   channel: '#leetbot',
          // },function(err,res) {
          //   // handle error
          // });
        });
      }).then(data => {
        fs.appendFile("./log/cronlog", new Date() + "run hourlyJob\n", function(err) {
          if(err) {
              return console.log(err);
          }
        });
      })
      .catch(function(error) {
        bot.botkit.debug(error);
      });
    });
},
undefined, true, timezone
);
hourlyJob.start();
//init cron job
//00 55 23 * * 1-7 for everyday's 23:55, */10 * * * * * for every 10 sec
var dailyJob = cron.job("00 55 23 * * 1-7", function(){
    controller.storage.users.all(function(err, all) {
      //init with each user's url
      var urls = [];
      all.forEach(function(node) {
        urls.push({url: baseurl+node.leet});
      })
      var getPage = urls.map(rp);
      var pages = Promise.all(getPage);
      //create promise all to wait for all quesy to finish. Responses will have same order with promises
      pages.then(function(response) {
        return Promise.all(response.map(homeParser));
      }).then(function(json){
        var objs = Promise.all(json.map(timeFilter));
        return objs;
      })
      .then(data => {
        return updateCurrentStatus(data, all, function(result) {
          // bot.say({
          //   text: result,
          //   channel: '#leetbot',
          // },function(err,res) {
          //   // handle error
          // });
        });
      }).then(data => {
        fs.appendFile("./log/cronlog", new Date() + "run dailyJob\n", function(err) {
          if(err) {
              return console.log(err);
          }
        });
      })
      .catch(function(error) {
        bot.botkit.debug(error);
      });
    });
},
undefined, true, timezone
);
dailyJob.start();

var dailyJob2 = cron.job("00 57 23 * * 1-7", function(){
  controller.storage.users.all(function(err, all) {
      afterOneDay(all, function(result) {
        bot.say({
          text: result,
          channel: '#leetbot',
        },function(err,res) {
          // handle error
        });
      });
    });
},
undefined, true, timezone
);
dailyJob2.start();

//00 59 23 * * 7
var weeklyJob = cron.job("00 59 23 * * 7", function(){
  controller.storage.users.all(function(err, all) {
      afterOneWeek(all, function(result) {
        bot.say({
          text: result,
          channel: '#leetbot',
        },function(err,res) {
          // handle error
        });
      });
    });
},
undefined, true, timezone
);
weeklyJob.start();

//testing cmd here
controller.hears(['day'], 'direct_message', function(bot, message) {
  controller.storage.users.all(function(err, all) {
      afterOneDay(all, function(result) {
        bot.say({
          text: result,
          channel: '#leetbot',
        },function(err,res) {
          // handle error
        });
      });
    });
});

controller.hears(['week'], 'direct_message', function(bot, message) {
  controller.storage.users.all(function(err, all) {
      afterOneWeek(all, function(result) {
        bot.say({
          text: result,
          channel: '#leetbot',
        },function(err,res) {
          // handle error
        });
      });
    });
});

//my status cmd
controller.hears(['status'], 'direct_message', function(bot, message) {
  controller.storage.users.all(function(err, all) {
    //init with each user's url
    var urls = [];
    all.forEach(function(node) {
      urls.push({url: baseurl+node.leet});
    })
    var getPage = urls.map(rp);
    var pages = Promise.all(getPage);
    //create promise all to wait for all quesy to finish. Responses will have same order with promises
    pages.then(function(response) {
      return Promise.all(response.map(homeParser));
    }).then(function(json){
      var objs = Promise.all(json.map(timeFilter));
      return objs;
    })
    .then(data => {
      return updateCurrentStatus(data, all, function(result) {
        bot.reply(message, result);
      });
    }).then(data => {
      // console.log(data);
    })
    .catch(function(error) {
      bot.botkit.debug(error);
    });
  });
});

controller.hears(['my progress'], 'direct_message', function(bot, message) {
  controller.storage.users.get(message.user, function(err, user) {
      var res = "";
      // console.log(user);
      if (user && user.name) {
         res += 'Hello ' + user.name + '\n';
         res += "Today's finishes: " + user.todayCount + ", which stands for " + user.todayStar + " stars \n";
         res += "Week's total stars: " + user.weekStar + ", your rank is " + user.weekRank + "\n";
         res += "Submit history:\n";
         if (user.todaySubmissions != null) {
           var index = 0;
           user.todaySubmissions.forEach(function (each) {
             res += each + ": " + user.todayLinks[index++] + "\n";
           })
         }
         if (user.oldSubmissions != null) {
           var index = 0;
           user.oldSubmissions.forEach(function (each) {
             res += each + ": " + user.oldLinks[index++] + "\n";
           })
         }
          bot.reply(message, res);
      }
  });
});

var homeParser = function (html) {
  bot.botkit.debug("in homeParser");
  var $ = cheerio.load(html);
  var names = [];
  var times = [];
  var links = [];
  var nameSet = new Set();
  var count = 0;
  return new Promise((resolve, reject) => {

    if ($('h3:contains("recent 10 accepted")') == null)
      return reject("leetcode homepage no found\n");
    else {
      var list = $('h3:contains("recent 10 accepted")').parent().next();
      list.children().each(function(i, ele){
        //get all subject name and finsih time
        links[i] = $(this).attr('href');
        names[i] = $(this).children().first().next().next().text();
        times[i] = $(this).children().last().text().replace(/\r?\n|\r/g, " ").trim();
      })
      return resolve(JSON.stringify({"names": names, "times":times, "links":links}));
      // return resolve([names, times, links]);
    }
  })
}

var timeFilter = function (json) {
  bot.botkit.debug("in currentStatus");
  var obj = JSON.parse(json);
  var names = [];
  var links = [];
  return new Promise((resolve, reject) => {
    if (obj == null)
      return reject("count star error\n");
    else {
        var nameSet = new Set();
        var times = obj.times;
        //filter out those should be count as today's finish
        for (var i = 0; i < times.length; i++){
          if (times[i].indexOf("day") > -1 || times[i].indexOf("days") > -1 || times[i].indexOf("week") > -1 || times[i].indexOf("weeks") > -1
            || times[i].indexOf("month") > -1 || times[i].indexOf("months") > -1|| times[i].indexOf("year") > -1|| times[i].indexOf("years") > -1){}
          else {
            var now = new Date();
            var end = new Date(now.getFullYear(), now.getMonth(), now.getDate() - 1, 23, 55, 00);
            var s = times[i].replace(new RegExp(String.fromCharCode(160), "g"), " ");
            // console.log(s);
            //use regex to caculate how many ms ago
            var hregex = /(\d+) hour/g;
            var hour = hregex.exec(s);
            var mregex = /(\d+) minute/g;
            var min = mregex.exec(s);
            var sregex = /(\d+) second/g;
            var sec = sregex.exec(s);
            var max = now.getTime() - end.getTime();//how many ms have been after yesterday 23:55:00
            var escape = 1000 * ((hour == null ? 0 : hour[1] * 3600) + (min == null ? 0 : min[1] * 60) + (sec == null ? 0 : sec[1]));
            //if within max scope, this subject should be count as today's finish
            if (escape < max) {
              // console.log("in")
              if (!nameSet.has(obj.names[i])) {
                nameSet.add(obj.names[i]);
                names.push(obj.names[i]);
                links.push(obj.links[i]);
              }
            }
          }
        }
      // return resolve(JSON.stringify({"names": names, "links":links}));
      // return resolve({"names": names, "links":links});
      return resolve([names, links]);
      // return resolve("test");
    }
  })
}

function updateCurrentStatus (lists, all, callback) {
  bot.botkit.debug("in updateUserStar");
  // console.log(s)
  // var obj = JSON.parse(s);
  // console.log(obj);
  var result = "Today's progress:\n"
  for (var i = 0; i < lists.length; i++) {
    controller.storage.users.get(all[i].id, function(err, user) {
        var nameSet = new Set();
        var subs = user.todaySubmissions;
        var count = 0;
        if (user.todayLinks == null) {
          user.todayLinks = [];
        }
        if (subs == null) {
          user.todaySubmissions = [];
        }
        if (subs != null) {
          subs.forEach(function (sub) {
            nameSet.add(sub);
          })
        }
        var names = lists[i][0];
        var links = lists[i][1];
        // console.log(names);
        if (names != null) {
          for (var k = 0; k < names.length; k++) {
            if (!nameSet.has(names[k])) {
              nameSet.add(names[k]);
              user.todaySubmissions.push(names[k]);
              user.todayLinks.push(baseurl + links[k]);
              count++;
            }
          }
        }
        // console.log(count);
        user.todayCount += count;
        user.todayStar = countStars(user.todayCount);
        result += user.name + ": " + user.todayStar + " stars. Week total: " + user.weekStar + " stars.\n";
        controller.storage.users.save(user, function(err, id) {
          // console.log("before")
        });
    });
  }
    callback(result);
    return new Promise((resolve, reject) => {
        return resolve(all);
        // return resolve([names, times, links]);
    })
}

function afterOneDay(all, callback) {
  bot.botkit.debug("in afterOneDay");
  var result = "Today's progress:\n"

  var index = 1;
  //Sort all user's weekStar, init the leadborad.
  all.sort(function(a,b){return b.weekStar - a.weekStar;});
  all.forEach(function(node) {
    controller.storage.users.get(node.id, function(err, user) {
        result += index++ + ". " + user.name + ": " + user.todayStar + " stars. Week total: ";
        var ws = user.weekStar + user.todayStar;
        user.weekStar += ws;
        user.todayStar = 0;
        user.todayCount = 0;
        user.oldSubmissions = user.todaySubmissions;
        user.todaySubmissions = [];
        user.oldLinks = user.todayLinks;
        user.todayLinks = [];
        user.weekRank = index;
        result += ws + " stars.\n";
        controller.storage.users.save(user, function(err, id) {
        });
        fs.appendFile("./log/dayStarLog", new Date() + ": " + user.name + ", " + user.weekStar + "\n", function(err) {
          if(err) {
              return console.log(err);
          }
        });
    });
  })
  callback(result);
}
function afterOneWeek(all, callback) {
  bot.botkit.debug("in afterOneWeek");
  var result = "This week's leaderboard:\n";
  var index = 1;
  //Sort all user's weekStar, init the leadborad.
  all.sort(function(a,b){return b.weekStar - a.weekStar;});
  all.forEach(function(node) {
    controller.storage.users.get(node.id, function(err, user) {
        user.star += user.weekStar;
        user.weekStar = 0;
        user.weekRank = 0;
        result += index++ + ". " + node.name + ", " + node.weekStar + " stars.\n";
        controller.storage.users.save(user, function(err, id) {
        });
        fs.appendFile("./log/weekStarLog", new Date() + ": " + user.name + ", " + user.star + " rank:" + index - 1 + "\n", function(err) {
          if(err) {
              return console.log(err);
          }
        });
    });
  })
  callback(result);
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
                star: 0,
                weekStar: 0,
                todayStar: 0,
                todayCount: 0,
                todaySubmissions: [],
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
