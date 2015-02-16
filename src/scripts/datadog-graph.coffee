# Description
#   A Hubot script to take graph snapshots using the Datadog API.
#
# Configuration:
#   HUBOT_DATADOG_GRAPH_API_KEY
#   HUBOT_DATADOG_GRAPH_APPLICATION_KEY
#
# Commands:
#   hubot datadog graph <graph> - take a graph snapshot using the Datadog API
#   hubot datadog graph config add <graph> <query>
#   hubot datadog graph config list
#   hubot datadog graph config remove <graph>
#
# Author:
#   bouzuya <m@bouzuya.net>
#
request = require 'request-b'
moment = require 'moment'
parseConfig = require 'hubot-config'

config = parseConfig 'datadog-graph',
  apiKey: null
  applicationKey: null

module.exports = (robot) ->
  basePattern = 'd(?:ata)?d(?:og)?\\s+(?:graph|s(?:nap)?s(?:hot)?)\\s+'
  robot.brain.data.queries = {}

  callGraphSnapshotAPI = (query, start, end) ->
    request
      url: 'https://app.datadoghq.com/api/v1/graph/snapshot'
      headers:
        'Content-type': 'application/json'
      qs:
        metric_query: query
        start: start
        end: end
        api_key: config.apiKey
        application_key: config.applicationKey
    .then (r) ->
      JSON.parse r.body

  # run
  pattern1 = new RegExp(basePattern + '([-\\w]+)\\s+(\\d+)([hdw])')
  robot.respond pattern1, (res) ->
    queries = (robot.brain.data.queries ? {})
    g = res.match[1]
    n = res.match[2]
    u = res.match[3]
    return if g is 'config'
    unless queries[g]?
      res.send "unknown graph: #{g}"
      return
    res.send "take a graph snapshot (#{g}) ..."
    query = queries[g]
    number = parseInt n, 10
    unit = switch u
      when 'h' then 'hours'
      when 'd' then 'days'
      when 'w' then 'weeks'
    e = moment()
    start = moment(e).subtract(number, unit).format('X')
    end = e.format('X')

    callGraphSnapshotAPI query, start, end
    .then (json) ->
      res.send json.snapshot_url
    .catch (e) ->
      res.robot.logger.error e
      res.send 'hubot-datadog-graph: error'

  # config add
  pattern2 = new RegExp(basePattern + 'config\\s+add\\s+([-\\w]+)\\s+(.+)$')
  robot.respond pattern2, (res) ->
    graph = res.match[1]
    query = res.match[2]
    robot.brain.data.queries[graph] = query
    res.send 'OK'

  # config list
  pattern3 = new RegExp(basePattern + 'config\\s+list')
  robot.respond pattern3, (res) ->
    queries = (robot.brain.data.queries ? {})
    res.send ("#{k} #{v}" for k, v of queries).join '\n'

  # config remove
  pattern4 = new RegExp(basePattern + 'config\\s+remove\\s+([-\\w]+)')
  robot.respond pattern4, (res) ->
    graph = res.match[1]
    queries = (robot.brain.data.queries ? {})
    delete queries[graph]
    res.send 'OK'
