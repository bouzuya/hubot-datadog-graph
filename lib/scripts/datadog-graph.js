// Description
//   A Hubot script to take graph snapshots using the Datadog API.
//
// Configuration:
//   HUBOT_DATADOG_GRAPH_API_KEY
//   HUBOT_DATADOG_GRAPH_APPLICATION_KEY
//
// Commands:
//   hubot datadog graph <graph> - take a graph snapshot using the Datadog API
//   hubot datadog graph config add <graph> <query>
//   hubot datadog graph config list
//   hubot datadog graph config remove <graph>
//
// Author:
//   bouzuya <m@bouzuya.net>
//
var config, moment, parseConfig, request;

request = require('request-b');

moment = require('moment');

parseConfig = require('hubot-config');

config = parseConfig('datadog-graph', {
  apiKey: null,
  applicationKey: null
});

module.exports = function(robot) {
  var basePattern, callGraphSnapshotAPI, pattern1, pattern2, pattern3, pattern4;
  basePattern = 'd(?:ata)?d(?:og)?\\s+(?:graph|s(?:nap)?s(?:hot)?)\\s+';
  robot.brain.data.queries = {};
  callGraphSnapshotAPI = function(query, start, end) {
    return request({
      url: 'https://app.datadoghq.com/api/v1/graph/snapshot',
      headers: {
        'Content-type': 'application/json'
      },
      qs: {
        metric_query: query,
        start: start,
        end: end,
        api_key: config.apiKey,
        application_key: config.applicationKey
      }
    }).then(function(r) {
      return JSON.parse(r.body);
    });
  };
  pattern1 = new RegExp(basePattern + '([-\\w]+)\\s+(\\d+)([hdw])');
  robot.respond(pattern1, function(res) {
    var e, end, g, n, number, queries, query, start, u, unit, _ref;
    queries = (_ref = robot.brain.data.queries) != null ? _ref : {};
    g = res.match[1];
    n = res.match[2];
    u = res.match[3];
    if (g === 'config') {
      return;
    }
    if (queries[g] == null) {
      res.send("unknown graph: " + g);
      return;
    }
    res.send("take a graph snapshot (" + g + ") ...");
    query = queries[g];
    number = parseInt(n, 10);
    unit = (function() {
      switch (u) {
        case 'h':
          return 'hours';
        case 'd':
          return 'days';
        case 'w':
          return 'weeks';
      }
    })();
    e = moment();
    start = moment(e).subtract(number, unit).format('X');
    end = e.format('X');
    return callGraphSnapshotAPI(query, start, end).then(function(json) {
      return res.send(json.snapshot_url);
    })["catch"](function(e) {
      res.robot.logger.error(e);
      return res.send('hubot-datadog-graph: error');
    });
  });
  pattern2 = new RegExp(basePattern + 'config\\s+add\\s+([-\\w]+)\\s+(.+)$');
  robot.respond(pattern2, function(res) {
    var graph, query;
    graph = res.match[1];
    query = res.match[2];
    robot.brain.data.queries[graph] = query;
    return res.send('OK');
  });
  pattern3 = new RegExp(basePattern + 'config\\s+list');
  robot.respond(pattern3, function(res) {
    var k, queries, v, _ref;
    queries = (_ref = robot.brain.data.queries) != null ? _ref : {};
    return res.send(((function() {
      var _results;
      _results = [];
      for (k in queries) {
        v = queries[k];
        _results.push(k + " " + v);
      }
      return _results;
    })()).join('\n'));
  });
  pattern4 = new RegExp(basePattern + 'config\\s+remove\\s+([-\\w]+)');
  return robot.respond(pattern4, function(res) {
    var graph, queries, _ref;
    graph = res.match[1];
    queries = (_ref = robot.brain.data.queries) != null ? _ref : {};
    delete queries[graph];
    return res.send('OK');
  });
};
