//
//
//
// // if (!process.env.LEETBOT_KEY) {
// //     console.log('Error: Specify token in environment');
// //     process.exit(1);
// // }
// //init leet page parsing package "cheerio" and "request"
// var cheerio = require('cheerio');
// var rp = require('request-promise');
// //var url = 'https://leetcode.com/henryhoo/';
// var baseurl = 'https://leetcode.com/';
// //init bot package "botkit"
// // var Botkit = require('botkit');
// // var os = require('os');
// // var controller = Botkit.slackbot({
// //     debug: true,
// //     json_file_store: './json_database',
// // });
// // var bot = controller.spawn({
// //     token: process.env.LEETBOT_KEY
// // }).startRTM();
// // module.exports.updateToNow = function(bot, message) {
// //   controller.storage.users.all(function(err, all) {
// //     //init with each user's url
// //     console
// //     var urls = [];
// //     all.forEach(function(node) {
// //       urls.push({url: baseurl+node.leet});
// //     })
// //     var getPage = urls.map(rp);
// //     var pages = Promise.all(getPage);
// //     //create promise all to wait for all quesy to finish. Responses will have same order with promises
// //     pages.then(function(response) {
// //       return Promise.all(response.map(homeParser));
// //     }).then(function(json){
// //       var objs = Promise.all(json.map(timeFilter));
// //       return objs;
// //     })
// //     .then(data => {
// //       // console.log(data)
// //       updateCurrentStar(data, all);
// //     })
// //     .catch(function(error) {
// //       bot.botkit.debug(error);
// //     });
// //
// //   });
// // }
//
// var homeParser = function (html) {
//   bot.botkit.debug("in homeParser");
//   var $ = cheerio.load(html);
//   var names = [];
//   var times = [];
//   var links = [];
//   var nameSet = new Set();
//   var count = 0;
//   return new Promise((resolve, reject) => {
//
//     if ($('h3:contains("recent 10 accepted")') == null)
//       return reject("leetcode homepage no found\n");
//     else {
//       var list = $('h3:contains("recent 10 accepted")').parent().next();
//       list.children().each(function(i, ele){
//         //get all subject name and finsih time
//         links[i] = $(this).attr('href');
//         names[i] = $(this).children().first().next().next().text();
//         times[i] = $(this).children().last().text().replace(/\r?\n|\r/g, " ").trim();
//       })
//       return resolve(JSON.stringify({"names": names, "times":times, "links":links}));
//       // return resolve([names, times, links]);
//     }
//   })
// }
//
// var timeFilter = function (json) {
//   bot.botkit.debug("in currentStatus");
//   var obj = JSON.parse(json);
//   var names = [];
//   var links = [];
//   return new Promise((resolve, reject) => {
//     if (obj == null)
//       return reject("count star error\n");
//     else {
//         var nameSet = new Set();
//         var times = obj.times;
//         //filter out those should be count as today's finish
//         for (var i = 0; i < times.length; i++){
//           if (times[i].indexOf("day") > -1 || times[i].indexOf("days") > -1 || times[i].indexOf("week") > -1 || times[i].indexOf("weeks") > -1
//             || times[i].indexOf("month") > -1 || times[i].indexOf("months") > -1|| times[i].indexOf("year") > -1|| times[i].indexOf("years") > -1){}
//           else {
//             var now = new Date();
//             var end = new Date(now.getFullYear(), now.getMonth(), now.getDate() - 1, 23, 55, 00);
//             var s = times[i].replace(new RegExp(String.fromCharCode(160), "g"), " ");
//             // console.log(s);
//             //use regex to caculate how many ms ago
//             var hregex = /(\d+) hour/g;
//             var hour = hregex.exec(s);
//             var mregex = /(\d+) minute/g;
//             var min = mregex.exec(s);
//             var sregex = /(\d+) second/g;
//             var sec = sregex.exec(s);
//             var max = now.getTime() - end.getTime();//how many ms have been after yesterday 23:55:00
//             var escape = 1000 * ((hour == null ? 0 : hour[1] * 3600) + (min == null ? 0 : min[1] * 60) + (sec == null ? 0 : sec[1]));
//             //if within max scope, this subject should be count as today's finish
//             if (escape < max) {
//               // console.log("in")
//               if (!nameSet.has(obj.names[i])) {
//                 nameSet.add(obj.names[i]);
//                 names.push(obj.names[i]);
//                 links.push(obj.links[i]);
//               }
//             }
//           }
//         }
//       // return resolve(JSON.stringify({"names": names, "links":links}));
//       // return resolve({"names": names, "links":links});
//       return resolve([names, links]);
//       // return resolve("test");
//     }
//   })
// }
// function updateCurrentStar (lists, all) {
//   bot.botkit.debug("in updateUserStar");
//   // console.log(s)
//   // var obj = JSON.parse(s);
//   // console.log(obj);
//   var result = "Today's progress:\n"
//   for (var i = 0; i < lists.length; i++) {
//     controller.storage.users.get(all[i].id, function(err, user) {
//         var nameSet = new Set();
//         var subs = user.todaySubmissions;
//         var count = 0;
//         if (user.todaySubmissions != null) {
//           subs.forEach(function (sub) {
//             nameSet.add(sub);
//           })
//         }
//         var names = lists[i][0];
//         // console.log(names);
//         if (names != null) {
//           names.forEach(function (name) {
//             if (!nameSet.has(name)) {
//               nameSet.add(name);
//               if (subs == null) {
//                 user.todaySubmissions = [];
//                 user.todaySubmissions.push(name);
//               } else {
//                 user.todaySubmissions.push(name);
//               }
//               count++;
//             }
//           })
//         }
//         console.log(count);
//         user.todayCount += count;
//         user.todayStar = countStars(user.todayCount);
//         result += user.name + ": " + user.todayStar + " stars. Week total: " + user.weekStar + " stars.\n";
//         controller.storage.users.save(user, function(err, id) {
//         });
//     });
//   }
//     bot.say({
//       text: result,
//       channel: '#leetbot',
//     },function(err,res) {
//       // handle error
//     });
// }
// //testing cmd here
// controller.hears(['test'], 'direct_message,direct_mention,mention', function(bot, message) {
//   controller.storage.users.all(function(err, all) {
//     //init with each user's url
//     var urls = [];
//     all.forEach(function(node) {
//       urls.push({url: baseurl+node.leet});
//     })
//     var getPage = urls.map(rp);
//     var pages = Promise.all(getPage);
//     //create promise all to wait for all quesy to finish. Responses will have same order with promises
//     pages.then(function(response) {
//       return Promise.all(response.map(homeParser));
//     }).then(function(json){
//       var objs = Promise.all(json.map(timeFilter));
//       return objs;
//     })
//     .then(data => {
//       // console.log(data)
//       updateCurrentStar(data, all);
//     })
//     .catch(function(error) {
//       bot.botkit.debug(error);
//     });
//
//   });
// });
//
//
// function countStars(count) {
//     var res = 0;
//     if (count >= 10) {
//         res = 5;
//     }
//     else if (count >= 5) {
//         res = 3;
//     }
//     else if (count >= 3 ) {
//         res = 2;
//     }
//     else if (count > 0 ) {
//         res = 1;
//     }
//     return res;
// }
