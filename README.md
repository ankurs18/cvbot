# An interactive chatbot for COVID-19 stats

## Description

A Dialogflow powered assistant that can answer your statistics related queries on COVID19. It can respond to any general or location-specific queries. Time period-specific queries have also been implemented, but they are limited to countries or states. I have intent-specific added error handling to make the app more intuitive. It is speech-enabled and uses the the SpeechRecognition interface of the Web Speech API available in most modern browsers.

## How to deploy and fork

1. Create similar intents on Dialogflow using by importing the structure from the [dialogflow_agent directory](cvbot/tree/master/dialogflow_agent) into a new agent.
2. Also create their fulfillment webhook functions as a webhook on firebase. Refer to the code in [dialogflow_fulfillment directory](cvbot/tree/master/dialogflow_agent)
3. Use the web-app residing in the [dialoflow_agent directory](cvbot/tree/master/dialogflow_agent) and run it on a server.

#### API used to fetch the statistics

[Coronavirus Tracker](https://coronavirus-tracker-api.herokuapp.com/)

#### Demo

Watch the Demo video at [cvbot/tree/master/Demo Video.mov](cvbot/tree/master/Demo Video.mov) to gather the bot's capabilities.
