"use strict";

// import { v1 as uuid } from 'uuid';
const uuid = require("uuid").v1;

const express = require("express");
const app = express();

app.use(express.static(__dirname + "/views")); // html
app.use(express.static(__dirname + "/public")); // js, css, images

const server = app.listen(process.env.PORT || 3000, () => {
  console.log(
    "Express server listening on port %d in %s mode",
    server.address().port,
    app.settings.env
  );
});

const io = require("socket.io")(server);
io.on("connection", function (socket) {
  console.log("a user connected");
});

const Dialog = require("./dialog");
let dialogflowObj = new Dialog();

// Web UI
app.get("/", (req, res) => {
  res.sendFile("index.html");
});

io.on("connection", function (socket) {
  socket.on("chat message", (text) => {
    console.log("Message: " + text);

    // Get a reply from API.ai

    let dialogflowReq = dialogflowObj.sendTextMessageToDialogFlow(text, "abcd");

    dialogflowReq.then(
      (result) => {
        if (result.intent) {
          socket.emit("bot reply", result);
          console.log(`dialogflow fulfillmentText: ${result.fulfillmentText}`);
          console.log(` Intent: ${result.intent.displayName}`);
        } else {
          // console.log('Bot reply: ', result);

          socket.emit("bot reply", result);
          console.log(`dialogflow fulfillmentText: ${result.fulfillmentText}`);
          console.log("No intent matched.");
        }
      },
      (error) => {
        socket.emit("bot reply", error);
        console.log("Bot error: " + error);
      }
    );
  });
});
