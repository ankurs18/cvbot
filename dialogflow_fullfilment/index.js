/*jshint esversion: 8 */
// See https://github.com/dialogflow/dialogflow-fulfillment-nodejs
// for Dialogflow fulfillment library docs, samples, and to report issues
"use strict";
const axios = require("axios").default;
const functions = require("firebase-functions");
const { WebhookClient } = require("dialogflow-fulfillment");
var moment = require("moment");

// eslint-disable-next-line no-undef
process.env.DEBUG = "dialogflow:debug"; // enables lib debugging statements

exports.dialogflowFirebaseFulfillment = functions.https.onRequest((request, response) => {
  const agent = new WebhookClient({ request, response });
  console.log("Dialogflow Request headers: " + JSON.stringify(request.headers));
  console.log("Dialogflow Request body: " + JSON.stringify(request.body));

  async function worlwideStats(agent) {
    const type = agent.parameters.type;
    try {
      const result = await axios.get(
        `https://coronavirus-tracker-api.herokuapp.com/v2/latest?source=jhu`
      );
      console.log("data retrieved successfully");
      const data = result.data;
      if (type.length >= 3 || type.includes("all")) {
        agent.add(` There are currently ${data.latest.confirmed} cases of COVID-19 Worldwide. 
            Out of the cases with an outcome, while it has caused ${data.latest.deaths} deaths, ${data.latest.recovered} people have recovered after being infected with the virus.`);
        return;
      }
      let output = "";
      for (let i = 0; i < type.length; i++) {
        switch (type[i]) {
          case "deaths":
            output = output.concat(
              ` The total number of deaths till now are ${data.latest.deaths}${
                output.length == 0 ? " worldwide" : ""
              }.`
            );
            break;
          case "confirmed":
            output = output.concat(
              ` There are currently ${data.latest.confirmed} confirmed cases worldwide.`
            );
            break;
          case "recovered":
            output = output.concat(
              ` ${data.latest.recovered} people have recovered after being infected with the virus. We hope the best for the rest of them.`
            );
            break;
          default:
            console.log(`Warning: invalid stat_type (${type[i]}) should not have been received`);
            output = output.concat(`Error: Invalid stat type encounted in the request - ${type[i]}. 
                    Please specify whether you are looking for all COVID-19 stats, the number of confiremed cases, 
                    the deaths of deaths or the number of recovered cases`);
            break;
        }
      }
      console.log(`output: ${output}`);
      agent.add(output);
    } catch (error) {
      //console.log(`error: ${error}`);
      agent.add(`error: ${error}`);
    }
  }

  const timelineCalc = (timelines, startDate, endDate) => {
    // console.log('calculating timelines');
    // console.log(timelines);
    const dateKeys = Object.keys(timelines);

    let largestDateLessthanOrEqualToendDate, endDateMoment;
    // console.log(moment(endDate), endDate);
    const startDateMoment = moment(startDate);
    console.log(startDateMoment);
    if (dateKeys.length > 0) {
      const startDateMinus1Moment = startDateMoment.subtract(1, "days");
      console.log(startDateMinus1Moment);
      const startDateMinus1Key = dateKeys.filter((dateEntry) =>
        moment(dateEntry).isSame(startDateMinus1Moment)
      )[0];
      if (startDateMinus1Key) {
        endDateMoment = moment(endDate);
        largestDateLessthanOrEqualToendDate = dateKeys.reduce((a, b) => {
          return moment(b).isAfter(moment(a), "day") &&
            moment(b).isSameOrBefore(endDateMoment, "day")
            ? b
            : a;
        });
        console.log(startDateMinus1Key);
        console.log(largestDateLessthanOrEqualToendDate);
        return timelines[largestDateLessthanOrEqualToendDate] - timelines[startDateMinus1Key];
      } else {
        let smallestDate = dateKeys.reduce((a, b) =>
          moment(a).isBefore(moment(b), "day") ? a : b
        );
        if (moment(smallestDate).isAfter(startDateMoment)) {
          largestDateLessthanOrEqualToendDate = dateKeys.reduce((a, b) =>
            moment(a).isAfter(moment(b), "day") && moment(a).isSameOrBefore(endDateMoment, "day")
              ? a
              : b
          );
          return timelines[largestDateLessthanOrEqualToendDate];
        } else {
          return 0;
        }
      }
    } else {
      // console.log("warning: no date entries!");
      // console.log(timelines);
      return 0;
    }
  };

  const timelineCalcWithType = (locationData, startDate, endDate, type) => {
    let statCounter = 0;
    console.log(`calculating timelines With type: ${type}`);
    // console.log(locationData);
    for (let location of locationData) {
      statCounter += timelineCalc(location["timelines"][type].timeline, startDate, endDate);
    }
    return statCounter;
  };

  async function statsByDate(agent) {
    if (agent.parameters["date-period"] || agent.parameters.date) {
      const startDate = agent.parameters["date-period"]
        ? agent.parameters["date-period"].startDate.substring(0, 10).replace("2021", "2020")
        : agent.parameters.date.substring(0, 10).replace("2021", "2020");
      const endDate = agent.parameters["date-period"]
        ? agent.parameters["date-period"].endDate.substring(0, 10).replace("2021", "2020")
        : new Date().toISOString().substring(0, 10).replace("2021", "2020");
      const type = agent.parameters.type;
      console.log(`startDate: ${startDate}`);
      console.log(`endDate: ${endDate}`);
      let requestFullfillementFlag = false;
      try {
        let output = "";
        if (agent.parameters["geo-country-code"].length > 0) {
          const countries = agent.parameters["geo-country-code"].reduce((carr, c) => {
            carr.push([c["alpha-2"], c["name"]]);
            return carr;
          }, []);
          console.log(countries);
          for (let country of countries) {
            const result = await axios.get(
              `https://coronavirus-tracker-api.ruizlab.org/v2/locations?source=jhu&timelines=true&country_code=${country[0]}`
            );
            console.log("data retrieved successfully for country: ", country[0], country[1]);
            const data = result.data;
            console.log(data);
            if (type.length >= 2 || type.includes("all")) {
              output = output.concat(
                ` Stats for ${country[1]} during this duration are as follows:\n`
              );
            }
            if (type.length >= 3 || type.includes("all")) {
              output = output.concat(`
                There are currently ${timelineCalcWithType(
                  data.locations,
                  startDate,
                  endDate,
                  "confirmed"
                )} cases of COVID-19. 
                Out of the cases with an outcome, while it has caused ${timelineCalcWithType(
                  data.locations,
                  startDate,
                  endDate,
                  "deaths"
                )} deaths, 
                ${timelineCalcWithType(
                  data.locations,
                  startDate,
                  endDate,
                  "recovered"
                )} people have recovered after being infected with the virus.`);
            } else {
              for (let i = 0; i < type.length; i++) {
                switch (type[i]) {
                  case "deaths":
                    output = output.concat(
                      ` ${timelineCalcWithType(
                        data.locations,
                        startDate,
                        endDate,
                        "deaths"
                      )} deaths have been recorded${
                        type.length == 1 ? ` in ${country[1]} during this period` : ``
                      }.`
                    );
                    break;
                  case "confirmed":
                    output = output.concat(
                      ` There have been ${timelineCalcWithType(
                        data.locations,
                        startDate,
                        endDate,
                        "confirmed"
                      )} confirmed cases${
                        type.length == 1 ? ` in ${country[1]} during this period` : ``
                      }.`
                    );
                    break;
                  case "recovered":
                    output = output.concat(
                      ` ${timelineCalcWithType(
                        data.locations,
                        startDate,
                        endDate,
                        "recovered"
                      )} people have recovered${
                        type.length == 1 ? ` during this period in ${country[1]}` : ``
                      }. We wish the best for the rest of them.`
                    );
                    break;
                  default:
                    console.log(
                      `Warning: invalid stat_type (${type[i]}) should not have been received`
                    );
                    output = output.concat(`Error: Invalid stat type encounted in the request - ${type[i]}. 
                    Please specify whether you are looking for all COVID-19 stats, the number of confiremed cases, 
                    the deaths of deaths or the number of recovered cases`);
                    break;
                }
              }
            }
          }
          requestFullfillementFlag = true;
        }
        if (agent.parameters["geo-state"].length > 0) {
          for (let state of agent.parameters["geo-state"]) {
            const result = await axios.get(
              `https://coronavirus-tracker-api.ruizlab.org/v2/locations?source=nyt&timelines=true&province=${state}`
            );
            console.log("data retrieved successfully");
            const data = result.data;
            // console.log(data);

            if (type.length >= 2 || type.includes("all")) {
              output = output.concat(` Stats for ${state} during this duration are as follows:\n`);
            }
            if (type.length >= 3 || type.includes("all")) {
              output = output.concat(`
                There are currently ${timelineCalcWithType(
                  data.locations,
                  startDate,
                  endDate,
                  "confirmed"
                )} cases of COVID-19. 
                Out of the cases with an outcome, while it has caused ${timelineCalcWithType(
                  data.locations,
                  startDate,
                  endDate,
                  "deaths"
                )}} deaths, 
                ${timelineCalcWithType(
                  data.locations,
                  startDate,
                  endDate,
                  "recovered"
                )} people have recovered after being infected with the virus.`);
            } else {
              for (let i = 0; i < type.length; i++) {
                switch (type[i]) {
                  case "deaths":
                    output = output.concat(
                      ` ${timelineCalcWithType(
                        data.locations,
                        startDate,
                        endDate,
                        "deaths"
                      )} deaths have been recorded${
                        type.length == 1 ? ` in ${state} during this period` : ``
                      }.`
                    );
                    break;
                  case "confirmed":
                    output = output.concat(
                      ` There have been ${timelineCalcWithType(
                        data.locations,
                        startDate,
                        endDate,
                        "confirmed"
                      )} confirmed cases${
                        type.length == 1 ? ` in ${state} during this period` : ``
                      }.`
                    );
                    break;
                  case "recovered":
                    output = output.concat(
                      ` ${timelineCalcWithType(
                        data.locations,
                        startDate,
                        endDate,
                        "recovered"
                      )} people have recovered${
                        type.length == 1 ? ` during this period in ${state}` : ``
                      }. We wish the best for the rest of them.`
                    );
                    break;
                  default:
                    console.log(
                      `Warning: invalid stat_type (${type[i]}) should not have been received`
                    );
                    output = output.concat(`Error: Invalid stat type encounted in the request - ${type[i]}. 
                    Please specify whether you are looking for all COVID-19 stats, the number of confiremed cases, 
                    the deaths of deaths or the number of recovered cases`);
                    break;
                }
              }
            }
          }
          requestFullfillementFlag = true;
        }
        if (!requestFullfillementFlag) {
          const result = await axios.get(
            `https://coronavirus-tracker-api.ruizlab.org/v2/locations?source=jhu&timelines=true`
          );
          console.log("data retrieved successfully");
          const data = result.data;
          console.log(data);
          if (type.length >= 2 || type.includes("all")) {
            output = output.concat(`Worldwide stats for the requested duration are as follows:\n`);
          }
          if (type.length >= 3 || type.includes("all")) {
            output = output.concat(`
                  There have been ${timelineCalcWithType(
                    data.locations,
                    startDate,
                    endDate,
                    "confirmed"
                  )} cases of COVID-19. 
                  Out of the cases with an outcome, while it has caused ${timelineCalcWithType(
                    data.locations,
                    startDate,
                    endDate,
                    "deaths"
                  )} deaths, 
                  ${timelineCalcWithType(
                    data.locations,
                    startDate,
                    endDate,
                    "recovered"
                  )} people have recovered after being infected with the virus.`);
          } else {
            for (let i = 0; i < type.length; i++) {
              switch (type[i]) {
                case "deaths":
                  output = output.concat(
                    ` ${timelineCalcWithType(
                      data.locations,
                      startDate,
                      endDate,
                      "deaths"
                    )} deaths have been recorded${
                      type.length == 1 ? ` worldwide during this period` : ``
                    }.`
                  );
                  break;
                case "confirmed":
                  output = output.concat(
                    ` There have been ${timelineCalcWithType(
                      data.locations,
                      startDate,
                      endDate,
                      "confirmed"
                    )} confirmed cases${type.length == 1 ? ` worldwide during this period` : ``}.`
                  );
                  break;
                case "recovered":
                  output = output.concat(
                    `${type.length == 1 ? `During this period, ` : ``}${timelineCalcWithType(
                      data.locations,
                      startDate,
                      endDate,
                      "recovered"
                    )} people have recovered after being infected with the virus. We wish the best for the rest of them.`
                  );
                  break;
                default:
                  console.log(
                    `Warning: invalid stat_type (${type[i]}) should not have been received`
                  );
                  output = output.concat(`Error: Invalid stat type encounted in the request - ${type[i]}. 
                      Please specify whether you are looking for all COVID-19 stats, the number of confiremed cases, 
                      the deaths of deaths or the number of recovered cases`);
                  break;
              }
            }
          }
          requestFullfillementFlag = true;
        }
        if (!requestFullfillementFlag) {
          output = output.concat(`Error in fetching data.`);
          console.log(`WArning: Unknown error occured and request not fulfilled.`);
        }
        output = output.trim();
        agent.add(output);
        console.log(`output: ${output}`);
      } catch (error) {
        console.log(error);
        agent.add(`error: ${error}`);
      }
    } else {
      agent.add(`Seems like you were trying to query stats for a particular time period but we didn't get you. 
      Could you try again, please?`);
    }
  }

  async function statsByLocation(agent) {
    //axios.get(``)
    let requestFullfillementFlag = false;
    let output = "";
    try {
      const type = agent.parameters.type;
      console.log(`type: ${type}`);
      if (agent.parameters["geo-country-code"].length > 0) {
        const countries = agent.parameters["geo-country-code"].reduce((carr, c) => {
          carr.push([c["alpha-2"], c["name"]]);
          return carr;
        }, []);
        console.log(countries);
        for (let country of countries) {
          const response = await axios.get(
            `https://coronavirus-tracker-api.ruizlab.org/v2/locations?source=jhu&country_code=${country[0]}`
          );
          let result;
          if (!response.data.latest) {
            console.log(`Error: Country not recognized - ${country[1]}`);
            agent.add(`We are sorry, we currently do not have any statistics for ${country[1]}`);
            return;
          }
          result = response.data.latest;
          if (type.length >= 2 || type.includes("all")) {
            output = output.concat(` Stats for ${country[1]} are as follows:` + "\n");
          }
          if (type.length >= 3 || type.includes("all")) {
            output = output.concat(`
              There are currently ${result.confirmed} cases of COVID-19. 
              Out of the cases with an outcome, while it has caused ${result.deaths} deaths, 
              ${result.recovered} people have recovered after being infected with the virus.`);
          } else {
            for (let i = 0; i < type.length; i++) {
              switch (type[i]) {
                case "deaths":
                  output = output.concat(
                    ` ${result.deaths} deaths have been recorded${
                      type.length == 1 ? ` in ${country[1]}` : ``
                    }.`
                  );
                  break;
                case "confirmed":
                  output = output.concat(
                    ` There are currently ${result.confirmed} confirmed cases${
                      type.length == 1 ? ` in ${country[1]}` : ``
                    }.`
                  );
                  break;
                case "recovered":
                  output = output.concat(
                    `${type.length == 1 ? `In ${country[1]} ` : ``}${
                      result.recovered
                    } people have recovered after being infected with the virus. We wish the best for the rest of them.`
                  );
                  break;
                default:
                  console.log(
                    `Warning: invalid stat_type (${type[i]}) should not have been received`
                  );
                  output = output.concat(`Error: Invalid stat type encounted in the request - ${type[i]}. 
                    Please specify whether you are looking for all COVID-19 stats, the number of confiremed cases, 
                    the deaths of deaths or the number of recovered cases`);
                  break;
              }
            }
          }
        }
        requestFullfillementFlag = true;
      }
      if (agent.parameters["county"].length > 0) {
        // output = output.concat(`state: ${agent.parameters["geo-state"][0]}`)
        const counties = agent.parameters["county"].map((county) => {
          const c = county.split(" ");
          return [c[0][0].toUpperCase() + c[0].slice(1), c[1]];
        });
        console.log("Counties received in request", counties);
        // let countynum = 0;
        for (let county of counties) {
          const response = await axios.get(
            `https://coronavirus-tracker-api.ruizlab.org/v2/locations?source=nyt&county=${county[0]}`
          );
          let result;
          if (!response.data.latest) {
            console.log(`Error: Data not found for county- ${county[0]}`);
            output = output.concat(
              `We are sorry, we currently do not have any statistics for ${county[0]}`
            );
            continue;
          }
          let locations = response.data.locations;
          if (locations.length > 1) {
            if (agent.parameters["geo-state"].length == 0) {
              output = output.concat(
                `${output.length > 1 ? "\n" : ""}We found the following ${
                  locations.length
                } counties with the name ${county[0]}: `
              );
              console.log(
                `multiple counties found with name ${county} exist and unable to filter on the basis of state`
              );
            } else {
              locations = locations.filter(
                (location) =>
                  location.province.toLowerCase() == agent.parameters["geo-state"][0].toLowerCase()
              );
              console.log(`Filtered multiple counties with name ${county} on the basis of state`);
              console.log(locations);
            }
          }
          for (let location of locations) {
            result = location.latest;
            if (type.length >= 2 || type.includes("all")) {
              output = output.concat(
                ` Stats for ${county[0]} ${county[1]}, ${location.province} are as follows:\n`
              );
            }
            if (type.length >= 3 || type.includes("all")) {
              output = output.concat(`
              There are currently ${result.confirmed} cases of COVID-19. 
              Out of the cases with an outcome, while it has caused ${result.deaths} deaths, 
              ${result.recovered} people have recovered after being infected with the virus.`);
            } else {
              for (let i = 0; i < type.length; i++) {
                switch (type[i]) {
                  case "deaths":
                    output = output.concat(
                      ` ${result.deaths} deaths have been recorded${
                        type.length == 1
                          ? ` in ${county[0]} ${county[1]}, ${location.province}`
                          : ``
                      }.`
                    );
                    break;
                  case "confirmed":
                    output = output.concat(
                      ` There are currently ${result.confirmed} confirmed cases${
                        type.length == 1
                          ? ` in ${county[0]} ${county[1]}, ${location.province}`
                          : ``
                      }.`
                    );
                    break;
                  case "recovered":
                    output = output.concat(
                      `${
                        type.length == 1
                          ? `In ${county[0]} ${county[1]}, ${location.province} `
                          : ``
                      }${
                        result.recovered
                      } people have recovered after being infected with the virus. We wish the best for the rest of them.`
                    );
                    break;
                  default:
                    console.log(
                      `Warning: invalid stat_type (${type[i]}) should not have been received`
                    );
                    output = output.concat(`Error: Invalid stat type encounted in the request - ${type[i]}. 
                    Please specify whether you are looking for all COVID-19 stats, the number of confiremed cases, 
                    the deaths of deaths or the number of recovered cases`);
                    break;
                }
              }
            }
          }
          // countynum++;
        }
        requestFullfillementFlag = true;
      }
      if (agent.parameters["geo-state"].length > 0 && !requestFullfillementFlag) {
        // output = output.concat(`state: ${agent.parameters["geo-state"][0]}`)
        for (let state of agent.parameters["geo-state"]) {
          const response = await axios.get(
            `https://coronavirus-tracker-api.ruizlab.org/v2/locations?source=jhu&province=${state}`
          );
          let result;
          if (!response.data.latest) {
            console.log(`Error: State not recognized - ${state}`);
            output = output.concat(
              `We are sorry, we currently do not have any statistics for ${state}`
            );
            continue;
          }
          result = response.data.latest;
          if (type.length >= 2 || type.includes("all")) {
            output = output.concat(` Stats for ${state} are as follows:`);
          }
          if (type.length >= 3 || type.includes("all")) {
            output = output.concat(`
              There are currently ${result.confirmed} cases of COVID-19. 
              Out of the cases with an outcome, while it has caused ${result.deaths} deaths, 
              ${result.recovered} people have recovered after being infected with the virus.`);
          } else {
            for (let i = 0; i < type.length; i++) {
              switch (type[i]) {
                case "deaths":
                  output = output.concat(
                    ` ${result.deaths} deaths have been recorded${
                      type.length == 1 ? ` in ${state}` : ``
                    }.`
                  );
                  break;
                case "confirmed":
                  output = output.concat(
                    ` There are currently ${result.confirmed} confirmed cases${
                      type.length == 1 ? ` in ${state}` : ``
                    }.`
                  );
                  break;
                case "recovered":
                  output = output.concat(
                    `${type.length == 1 ? `In ${state} ` : ``}${
                      result.recovered
                    } people have recovered after being infected with the virus. We wish the best for the rest of them.`
                  );
                  break;
                default:
                  console.log(
                    `Warning: invalid stat_type (${type[i]}) should not have been received`
                  );
                  output = output.concat(`Error: Invalid stat type encounted in the request - ${type[i]}. 
                    Please specify whether you are looking for all COVID-19 stats, the number of confiremed cases, 
                    the deaths of deaths or the number of recovered cases`);
                  break;
              }
            }
          }
        }
        requestFullfillementFlag = true;
      }
      if (!requestFullfillementFlag) {
        output =
          "Seems like you were trying to get stats for a particular location but we couldn't find the place. Please try again.";
      }
      output = output.trim();
      console.log(`output: ${output}`);
      agent.add(output);
    } catch (error) {
      //console.log(`error: ${error}`);
      console.log(`Error occured on webhook call: ${error}`);
      agent.add(`Seems like you were trying to query stats for a particular location but we didn't get you. 
      Could you say that again, please?`);
    }
  }

  // Run the proper function handler based on the matched Dialogflow intent name
  let intentMap = new Map();
  // intentMap.set('Default Welcome Intent', welcome);
  // intentMap.set('Default Fallback Intent', fallback);
  intentMap.set("stats.worldwide", worlwideStats);
  intentMap.set("stats.bylocation", statsByLocation);
  intentMap.set("stats.byDate", statsByDate);
  // intentMap.set('your intent name here', yourFunctionHandler);
  // intentMap.set('your intent name here', googleAssistantHandler);
  agent.handleRequest(intentMap);
});
