"use strict";

const socket = io();

const botui = new BotUI("my-botui-app");

const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
const recognition = new SpeechRecognition();

recognition.lang = "en-IN";
recognition.interimResults = false;
// recognition.continuous = true;
recognition.maxAlternatives = 1;

document.querySelector("button").addEventListener("click", () => {
  recognition.start();
});

recognition.addEventListener("speechstart", () => {
  console.log("Speech has been detected.");
});
var indexTempMessage;
recognition.addEventListener("result", (e) => {
  console.log("Result has been detected.");
  document.getElementById("my-botui-app").style.visibility = "visible";
  let last = e.results.length - 1;
  let text = e.results[last][0].transcript;
  text = text.charAt(0).toUpperCase() + text.slice(1);
  botui.message
    .human({
      content: text,
    })
    .then(() =>
      botui.message
        .bot({
          content: "....",
        })
        .then((index) => (indexTempMessage = index))
    );
  // document
  //   .getElementById("botui-messages-container")
  //   .scrollIntoView({ behavior: "smooth", block: "end" });
  console.log("Confidence: " + e.results[0][0].confidence);

  socket.emit("chat message", text);
});

recognition.addEventListener("speechend", () => {
  recognition.stop();
});

recognition.addEventListener("error", (e) => {
  botui.message.bot({
    content: `Sorry, I didn't get that. Please try again.`,
  });
});

function playByteArray(byteArray) {
  let context = new AudioContext();
  context.decodeAudioData(
    byteArray,
    function (buffer) {
      play(buffer);
    }.bind(this)
  );
}

function play(buf) {
  // Create a source node from the buffer
  let context = new AudioContext();
  var source = context.createBufferSource();
  source.buffer = buf;
  // Connect to the final output node (the speakers)
  source.connect(context.destination);
  // Play immediately
  source.start(0);
}

socket.on("bot reply", function (result) {
  console.log("spiderman");
  console.log(result);
  const replyText = result[0].queryResult.fulfillmentText;
  if (replyText == "") replyText = "(No answer...)";
  botui.message
    .update(indexTempMessage, {
      content: replyText,
    })
    .then(() =>
      document
        .getElementById("botui-messages-container")
        .scrollIntoView({ behavior: "smooth", block: "end" })
    );
  playByteArray(result[0].outputAudio);
});
