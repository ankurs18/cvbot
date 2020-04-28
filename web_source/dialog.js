const dialogflow = require("dialogflow");
require("dotenv").config();

module.exports = class DialogFlow {
  constructor() {
    this.projectId = "cvtracker-akclcr";

    let privateKey = process.env.DIALOGFLOW_PRIVATE_KEY;
    let clientEmail = process.env.DIALOGFLOW_CLIENT_EMAIL;
    // console.log('key', privateKey);
    // console.log('clientEmail', clientEmail);
    let config = {
      credentials: {
        private_key: privateKey,
        client_email: clientEmail,
      },
    };

    this.sessionClient = new dialogflow.SessionsClient(config);
  }

  async sendTextMessageToDialogFlow(textMessage, sessionId) {
    // Define session path
    const sessionPath = this.sessionClient.sessionPath(this.projectId, sessionId);
    // The text query request.
    const request = {
      session: sessionPath,
      queryInput: {
        text: {
          text: textMessage,
          languageCode: "en",
        },
      },
    };
    try {
      let responses = await this.sessionClient.detectIntent(request);
      console.log("DialogFlow response received");
      return responses;
    } catch (err) {
      console.error("DialogFlow ERROR:", err);
      return err;
    }
  }
};

// module.exports.DialogFlow =  DialogFlow;
