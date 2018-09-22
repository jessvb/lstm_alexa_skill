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

// Replace with your app ID (OPTIONAL).  You can find this value at the top of
// your skill's page on http://developer.amazon.com.  Make sure to enclose your
// value in quotes, like this: const APP_ID =
// 'amzn1.ask.skill.bb4045e6-b3e8-4133-b650-72923c5980f1';
const APP_ID = undefined;

// for getting info from csail server:
const fetch = require("node-fetch");
const csail_url = "http://appinventor-alexa.csail.mit.edu:1234/?word=hello";
const getText = async function (url) {
    let json;
    try {
        const response = await fetch(url);
        json = await response.json();
    } catch (err) {
        console.log(err);
    }
    return json;
};

// for speech and alexa app:
const SKILL_NAME = 'Story Generator';
const LAUNCH_MESSAGE =
    'Let\'s generate some text! Tell me, "generate words", and I\'ll go for it!';
const HELP_MESSAGE =
    'If you want me to generate some text, you can say, "give me some text".';
const HELP_REPROMPT = 'Didn\'t quite get that. How can I help?';
const STOP_MESSAGE = 'Closing ' + SKILL_NAME + '. Goodbye!';
const FALLBACK_MESSAGE = 'I\'m not sure what you mean. ' +
    'I can generate text if you say,' +
    ' \'Alexa, ask ' + SKILL_NAME + ' to generate text.\'';


//=========================================================================================================================================
// Event Handlers:
//=========================================================================================================================================

const handlers = {
    'LaunchRequest': function () {
        this.response.speak(LAUNCH_MESSAGE);
        this.emit(':responseReady');
    },
    'LSTM_output': async function () {

            // GET lstm output from csail server
            let error;
            let text;
            try {
            let json = await getText(csail_url);
            text = json.thing;
            } catch (err) {
                error = 'ERROR: ' + err;
            }

            // Feedback for the user:
            let voiceOutput = '';
            let cardOutput = '';
            if (error) {
                voiceOutput =
                    'There was an error. Please try again later. ';
                cardOutput = voiceOutput +
                    ' You may include the following error code with your post on the forums: ' +
                    error;
            } else {
                voiceOutput = 'Here\'s the story: \"' + text + '\".';
                cardOutput = voiceOutput + 
                    'Hope it\'s interesting!';
            }
            // render a card in the alexa app:
            this.response.cardRenderer(SKILL_NAME, cardOutput);
            // voice output from alexa:
            this.response.speak(voiceOutput);
            this.emit(':responseReady');
        },
        'AMAZON.FallbackIntent': function () {
            const speechOutput = FALLBACK_MESSAGE;

            this.response.speak(speechOutput);
            this.emit(':responseReady');
        },
        'AMAZON.HelpIntent': function () {
            const speechOutput = HELP_MESSAGE;
            const reprompt = HELP_REPROMPT;

            this.response.speak(speechOutput).listen(reprompt);
            this.emit(':responseReady');
        },
        'AMAZON.CancelIntent': function () {
            this.response.speak(STOP_MESSAGE);
            this.emit(':responseReady');
        },
        'AMAZON.StopIntent': function () {
            this.response.speak(STOP_MESSAGE);
            this.emit(':responseReady');
        },
};

exports.handler = function (event, context, callback) {
    const alexa = Alexa.handler(event, context, callback);
    alexa.APP_ID = APP_ID;
    alexa.registerHandlers(handlers);
    alexa.execute();
};