/**
 * This sample demonstrates a simple skill built with the Amazon Alexa Skills
 * nodejs skill development kit.
 *
 * This skill can generate text using an LSTM on the CSAIL servers.
 **/

'use strict';
const Alexa = require('alexa-sdk');

//=========================================================================================================================================
// Constants:
//=========================================================================================================================================

// for getting info from csail server:
const fetch = require('node-fetch');
const csail_url = 'http://appinventor-alexa.csail.mit.edu:1234/';
const qInputText = '?inputText=';
const exampleInputText =
    'Once upon a time, a rabbit bounced through the air. She landed directly in a large puddle.';
const getText = async function(baseUrl, query, input) {
  let json;
  let url = baseUrl + query + input;
  try {
    const response = await fetch(url);
    json = await response.json();
  } catch (err) {
    console.log(err);
  }
  return json;
};

// for sending signal to app inventor:
let projectName = 'sentence_inventor';
const ALEXA_TAG = '_ALEXA_SIGNAL_';
const urlHostPort = 'rediss://clouddb.appinventor.mit.edu:6381';
const tokens = require('./tokens');
const redis = require('redis');
const SET_SUB_SCRIPT = 'local key = KEYS[1];' +
    'local value = ARGV[1];' +
    'local topublish = cjson.decode(ARGV[2]);' +
    'local project = ARGV[3];' +
    'local newtable = {};' +
    'table.insert(newtable, key);' +
    'table.insert(newtable, topublish);' +
    'redis.call("publish", project, cjson.encode(newtable));' +
    'return redis.call(\'set\', project .. ":" .. key, value);';

// for speech and alexa app:
const SKILL_NAME = 'Sentence Inventor';
const LAUNCH_MESSAGE =
    'Let\'s generate some text! Tell me, "generate words", and I\'ll go for it!';
const HELP_MESSAGE =
    'If you want me to generate some text, you can say, "give me some text".';
const HELP_REPROMPT = 'Didn\'t quite get that. How can I help?';
const STOP_MESSAGE = 'Closing ' + SKILL_NAME + '. Goodbye!';
const FALLBACK_MESSAGE = 'I\'m not sure what you mean. ' +
    'I can generate text if you say,' +
    ' \'Alexa, ask ' + SKILL_NAME + ' to generate text.\'';

// Replace with your app ID.  You can find this value at the top of
// your skill's page on http://developer.amazon.com.  Make sure to enclose your
// value in quotes, like this: const APP_ID =
// 'amzn1.ask.skill.XXXXXXXX-XXXX-XXXX-XXXX-XXXXXXXXXXXXX';
const APP_ID = tokens.getAppId();


//=========================================================================================================================================
// Event Handlers:
//=========================================================================================================================================

const handlers = {
  'LaunchRequest': function() {
    this.response.speak(LAUNCH_MESSAGE).listen();
    this.emit(':responseReady');
  },
  'LSTM_output': async function() {
    // GET lstm output from csail server
    let genErr;
    let text;
    // first test to make sure the server is running
    // try {
    //   let test = await getText(csail_url, qInputText, 'test');
    //   console.log(test.generated);
    // } catch (err) {
    //   error = 'ERROR: ' + err;
    // }
    // if (error == null) {
    // if the test worked without error, try generating text!
    try {
      let json = await getText(csail_url, qInputText, exampleInputText);
      text = json.generated;
    } catch (err) {
      genErr = 'ERROR: ' + err;
    }
    // }

    // if there's text, send a signal to app inventor with the text
    let sendErr = null;
    if (text != null) {
      // for lambda redis
      let client = redis.createClient(
          urlHostPort, {'password': tokens.getAuthKey(), 'tls': {}});
      let tag = ALEXA_TAG;
      let value = text;
      // Sets and PUBLISHES in clouddb (this will be noticed by App
      // Inventor components subscribed to the updates)
      console.log('stringified value: ' + JSON.stringify([value])); // TODO DEL
      client.eval(
          // Calling convention: tag, value, json encoded list of values,
          // project,
          // ...
          SET_SUB_SCRIPT, 1, tag, value, JSON.stringify([JSON.stringify(value)]), projectName,
          function(e, r) {
            if (e) {
              console.error('Something went wrong with client.eval: ', e);
              sendErr += 'ERROR: ' + e;
            } else {
              if (r) {
                // response = r;
              }
            }

            // quit redis:
            client.end(function(err) {
              if (err) {
                console.error('Error when quitting redis: ', err);
                sendErr += 'ERROR: ' + e;
              }
            });
          });
    }

    // Feedback for the user:
    let voiceOutput = '';
    let cardOutput = '';
    if (genErr) {
      voiceOutput = 'There was an error generating text. Please try again later. ';
      cardOutput = voiceOutput +
          ' You may include the following error code with your post on the forums: ' +
          genErr;
    } else {
      if (sendErr){
        voiceOutput += 'There was an error sending to App Inventor. Nonetheless, ';
      }
      voiceOutput += 'Here\'s the story: \"' + text + '\". ';
      cardOutput += voiceOutput + 'Hope it\'s interesting!';
    }
    // render a card in the alexa app:
    this.response.cardRenderer(SKILL_NAME, cardOutput);
    // voice output from alexa:
    this.response.speak(voiceOutput);
    this.emit(':responseReady');
  },
  'AMAZON.FallbackIntent': function() {
    const speechOutput = FALLBACK_MESSAGE;

    this.response.speak(speechOutput);
    this.emit(':responseReady');
  },
  'AMAZON.HelpIntent': function() {
    const speechOutput = HELP_MESSAGE;
    const reprompt = HELP_REPROMPT;

    this.response.speak(speechOutput).listen(reprompt);
    this.emit(':responseReady');
  },
  'AMAZON.CancelIntent': function() {
    this.response.speak(STOP_MESSAGE);
    this.emit(':responseReady');
  },
  'AMAZON.StopIntent': function() {
    this.response.speak(STOP_MESSAGE);
    this.emit(':responseReady');
  },
};

exports.handler = function(event, context, callback) {
  const alexa = Alexa.handler(event, context, callback);
  alexa.appId = APP_ID;
  alexa.registerHandlers(handlers);
  alexa.execute();
};