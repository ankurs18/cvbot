# A Simple Chat Bot to query COVID19 stats

## This is the web app section

This is how this web app works:

1. Using the Web Speech API’s `SpeechRecognition` interface to listen your voice from a microphone
2. Sends your message to your Dialogflow agent as a text string
3. Once the AI from the API.ai returns the reply text back, use the `AudioContext` interface to play back the result

### Try It on Your Own Server

1. Fill the env vars in `.env`:

   ```
   DIALOGFLOW_PRIVATE_KEY=
   DIALOGFLOW_CLIENT_EMAIL=some_unique_session_id
   ```

2. npm i
3. npm start
4. Navigate to http://localhost:5000/ in any browser.
