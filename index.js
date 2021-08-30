'use strict';

const Alexa = require('alexa-sdk');
const https = require('https');
const apikey = 'elzcz7myxn';

const APP_ID = 'amzn1.ask.skill.e688f866-42b5-4f87-a881-a76aac7624fc';

const languageStrings = {
    'en': {
        translation: {
            SKILL_NAME: 'Indian Railway Enquiry System',
            WELCOME_MESSAGE: "Welcome to %s. You can ask a question like, what\'s my PNR status? ... Now, what can I help you with?",
            WELCOME_REPROMPT: 'For instructions on what you can say, please say help me.',
            DISPLAY_CARD_TITLE: '%s  - Recipe for %s.',
            HELP_MESSAGE: "You can ask questions such as, what\'s the PNR status, or, you can say exit...Now, what can I help you with?",
            HELP_REPROMPT: "You can say things like, what\'s the PNR status, or you can say exit...Now, what can I help you with?",
            STOP_MESSAGE: 'Goodbye!',
            REQUEST_REPEAT_MESSAGE: 'Try saying repeat.',
            REQUEST_NOT_FOUND_MESSAGE: "I\'m sorry, I currently do not know ",
            REQUEST_NOT_FOUND_WITH_ITEM_NAME: 'the request for %s. ',
            REQUEST_NOT_FOUND_WITHOUT_ITEM_NAME: 'that request. ',
            REQUEST_NOT_FOUND_REPROMPT: 'What else can I help with?'
        }
    },
    'en-US': {
        translation: {
            SKILL_NAME: 'Indian Railway Enquiry System'
        }
    },
    'en-GB': {
        translation: {
            SKILL_NAME: 'Indian Railway Enquiry System'
        }
    },
    'en-IN': {
        translation: {
            SKILL_NAME: 'Indian Railway Enquiry System'
        }
    }
};

function getDateInDDMMYY(inputDate) {
    let tempDate = new Date(inputDate);
    var dd = tempDate.getDate();
    var mm = tempDate.getMonth() + 1;
    var yyyy = tempDate.getFullYear();

    if (dd < 10) {
        dd = '0' + dd;
    }
    if (mm < 10) {
        mm = '0' + mm;
    }

    var outputDate = dd + '-' + mm + '-' + yyyy;
    return  outputDate;
}

function irctcAPI(input, api, result) {

    let url = '';
    if (api === 'trainNameFinder') {
        url = 'https://api.railwayapi.com/v2/name-number/train/' + input + '/apikey/' + apikey + '/';
    } else if (api === 'pnrStatusFinder') {
        url = 'https://api.railwayapi.com/v2/pnr-status/pnr/' + input + '/apikey/' + apikey + '/';
    } else if (api === 'trainArraivalsFinder') {
        url = 'https://api.railwayapi.com/v2/arrivals/station/' + input.stationCode + '/hours/' + input.searchHours + '/apikey/' + apikey + '/';
    } else if (api === 'trainLiveStatusFinder') {
        url = 'https://api.railwayapi.com/v2/live/train/' + input.trainNumber + '/date/' + input.liveDate + '/apikey/' + apikey + '/';
    } else if (api === 'trainRouteFinder') {
        url = 'https://api.railwayapi.com/v2/route/train/' + input + '/apikey/' + apikey + '/';
    } else if (api === 'trainSeatsAvailabilityFinder') {
        url = 'https://api.railwayapi.com/v2/check-seat/train/' + input.trainNumber + '/source/' + input.sourceStationCode + '/dest/' + input.destinationStationCode + '/date/' + input.bookingDate + '/pref/' + input.preferredClass + '/quota/' + input.preferredQuota + '/apikey/' + apikey + '/';
    }

    if (url === '') {
        result('no_api');
    } else {
        var req = https.get(url, function (res) {

            var responseString = '';

            res.on('data', function (data) {
                responseString += data;
            });

            res.on('end', function () {
                var responseObject = JSON.parse(responseString);
                console.log('IRCTC Api Request:' + url);
                console.log('IRCTC Api Response:' + JSON.stringify(responseObject));
                const serverErrorResponceCodes = [404, 405, 505, 501];
                const serverInvalidDataResponceCodes = [210, 211, 220, 221, 230, 502];

                if (responseObject.response_code === 200) {
                    if (api === 'trainNameFinder') {
                        result(responseObject.train.name);
                    } else if (api === 'pnrStatusFinder') {
                        var msg = 'Current status are';
                        for (var i = 0; i < responseObject.passengers.length; i++) {
                            msg += ', for passenger ' + i + ', ' + responseObject.passengers[i].current_status;
                        }
                        result(msg);
                    } else if (api === 'trainArraivalsFinder') {
                        if (responseObject.total === 0) {
                            result('There are no trains arraiving at ' + input.stationCode + ' for the next ' + input.searchHours + ' hours');
                        } else {
                            var msg = 'Trains arraiving at ' + input.stationCode + ' for next ' + input.searchHours + ' are';
                            for (var i = 0; i < responseObject.trains.length; i++) {
                                msg += ', train  ' + responseObject.trains[i].number + ', ' + responseObject.trains[i].name + ' is ';
                                msg += ((responseObject.trains[i].delayarr === 'RIGHT TIME') ? ' running at right time' : ' delayed by ' + responseObject.trains[i].delayarr);
                            }
                            result(msg);
                        }
                    } else if (api === 'trainLiveStatusFinder') {
                        result(responseObject.position);
                    } else if (api === 'trainRouteFinder') {
                        var msg = 'Train number ' + responseObject.train.number + ', ' + responseObject.train.name + ' starts at ';
                        var i = 0;
                        msg += responseObject.route[i++].station.name + ' and runs via ';
                        for (; i < responseObject.route.length - 1; i++) {
                            msg += ', ' + responseObject.route[i].station.name;
                        }
                        msg += ' before it reaches its destination at ' + responseObject.route[i].station.name;
                        result(msg);
                    } else if (api === 'trainSeatsAvailabilityFinder') {
                        var msg = 'These are the current availabilities of seats requested for ';
                        msg += ' train number ' + responseObject.train.number + ', ' + responseObject.train.name;
                        msg += ', from ' + responseObject.from_station.name + ' to ' + responseObject.to_station.name;
                        msg += ', in ' + responseObject.journey_class.name;
                        msg += ', for ' + responseObject.quota.name + ' are.' ; 
                        for (var i = 0; i < responseObject.availability.length; i++) {
                            msg += ', on ' + responseObject.availability[i].date + ' is ' + responseObject.availability[i].status;
                        }
                        result(msg);
                    } else {
                        result('no_api');
                    }
                } else if (serverErrorResponceCodes.indexOf(responseObject.response_code) >= 0) {
                    result('server_error');
                } else if (serverInvalidDataResponceCodes.indexOf(responseObject.response_code) >= 0) {
                    result('invalid_data');
                } else {
                    result('invalid_response_code');
                }
            });
        });

        req.on('error', function (e) {
            console.log('problem with request: ' + e.message);
            result('error');
        });
    }
}


function getTrainNameFromIRCTC(intent, callback) {
    const cardTitle = intent.name;
    const trainNumber = intent.slots.trainNumber;
    let repromptText = '';
    let speechOutput = '';
    let shouldEndSession = false;

    if (trainNumber && trainNumber.value) {
        const requestTrainNumber = trainNumber.value;
        irctcAPI(requestTrainNumber, 'trainNameFinder', function (result) {
            if (result === 'no_api' || result === 'error') {
                speechOutput = 'Invalid request for train number.  Can you please repeat question?';
                repromptText = 'Invalid request for train number.  Can you please repeat question?';
                let reply = {speechOutput: speechOutput, repromptText: repromptText, shouldEndSession: shouldEndSession};
                callback(reply);
            } else if (result === 'invalid_data') {
                speechOutput = '' + requestTrainNumber + ' is invalid train number.  Can you please tell me the train number';
                repromptText = "I didn't hear you, " + requestTrainNumber + ' is invalid train number. Can you please tell me the train number';
                let reply = {speechOutput: speechOutput, repromptText: repromptText, shouldEndSession: shouldEndSession};
                callback(reply);
            } else if (result === 'server_error') {
                speechOutput = 'No trains available with number' + requestTrainNumber + '. Good bye.';
                shouldEndSession = true;
                let reply = {speechOutput: speechOutput, repromptText: repromptText, shouldEndSession: shouldEndSession};
                callback(reply);
            } else {
                speechOutput = 'Name of train number ' + trainNumber.value + ' is ' + result + '. Good bye.';
                shouldEndSession = true;
                let reply = {speechOutput: speechOutput, repromptText: repromptText, shouldEndSession: shouldEndSession};
                callback(reply);
            }
        });
    } else {
        speechOutput = "what is the train number?";
        repromptText = "I didn't hear you, can you please tell me the train number?";
        let reply = {speechOutput: speechOutput, repromptText: repromptText, shouldEndSession: shouldEndSession};
        callback(reply);
    }
}

function getPNRStatusFromIRCTC(intent, callback) {
    const cardTitle = intent.name;
    const pnrNumber = intent.slots.pnrNumber;
    let repromptText = '';
    let speechOutput = '';
    let shouldEndSession = false;

    if (pnrNumber && pnrNumber.value) {
        const requestPnrNumber = pnrNumber.value;
        irctcAPI(requestPnrNumber, 'pnrStatusFinder', function (result) {
            if (result === 'no_api' || result === 'error') {
                speechOutput = 'Invalid request for PNR status.  Can you please repeat question?';
                repromptText = 'Invalid request for PNR status.  Can you please repeat question?';
                let reply = {speechOutput: speechOutput, repromptText: repromptText, shouldEndSession: shouldEndSession};
                callback(reply);
            } else if (result === 'invalid_data') {
                speechOutput = '' + requestPnrNumber + ' is invalid PNR.  Can you please repeat your PNR number';
                repromptText = "I didn't hear you, " + requestPnrNumber + ' is invalid PNR. Can you please repeat your PNR number';
                let reply = {speechOutput: speechOutput, repromptText: repromptText, shouldEndSession: shouldEndSession};
                callback(reply);
            } else if (result === 'server_error') {
                speechOutput = 'No Details available with given number. Good bye.';
                shouldEndSession = true;
                let reply = {speechOutput: speechOutput, repromptText: repromptText, shouldEndSession: shouldEndSession};
                callback(reply);
            } else {
                speechOutput = result + '. Good bye.';
                shouldEndSession = true;
                let reply = {speechOutput: speechOutput, repromptText: repromptText, shouldEndSession: shouldEndSession};
                callback(reply);
            }
        });
    } else {
        speechOutput = "what is your PNR number?";
        repromptText = "I didn't hear you, can you please tell me your PNR number?";
        //sessionAttributes['intentName'] = 'PNRStatusFinder';
        let reply = {speechOutput: speechOutput, repromptText: repromptText, shouldEndSession: shouldEndSession};
        callback(reply);
    }
}

function getTrainArraivalsFromIRCTC(intent, callback) {
    const cardTitle = intent.name;
    const stationCode = intent.slots.stationCode.resolutions.resolutionsPerAuthority[0].values[0].value.id;
    const searchHours = intent.slots.searchHours;
    let repromptText = '';
    let speechOutput = '';
    let shouldEndSession = false;

    const requestStationCode = stationCode;
    const requestSearchHours = searchHours.value;

    console.log('input: ' + requestStationCode + ' - ' + requestSearchHours);

    var params = {
        stationCode: requestStationCode
    };

    if (requestSearchHours < 4) {
        params['searchHours'] = 2;
    } else {
        params['searchHours'] = 4;
    }

    irctcAPI(params, 'trainArraivalsFinder', function (result) {
        if (result === 'no_api' || result === 'error') {
            speechOutput = 'Invalid request for upcoming trains.  Can you please repeat question?';
            repromptText = 'Invalid request for scheduled trains.  Can you please repeat question?';
            let reply = {speechOutput: speechOutput, repromptText: repromptText, shouldEndSession: shouldEndSession};
            callback(reply);
        } else if (result === 'invalid_data') {
            speechOutput = '' + requestStationCode + ' is invalid station name.  Can you please repeat your station name?';
            repromptText = "I didn't hear you, " + requestStationCode + ' is invalid station. Can you please repeat your station name?';
            let reply = {speechOutput: speechOutput, repromptText: repromptText, shouldEndSession: shouldEndSession};
            callback(reply);
        } else if (result === 'server_error') {
            speechOutput = 'No Details available with station name. Good bye.';
            shouldEndSession = true;
            let reply = {speechOutput: speechOutput, repromptText: repromptText, shouldEndSession: shouldEndSession};
            callback(reply);
        } else {
            speechOutput = result + '. Good bye.';
            shouldEndSession = true;
            let reply = {speechOutput: speechOutput, repromptText: repromptText, shouldEndSession: shouldEndSession};
            callback(reply);
        }
    });
}

function getTrainLiveStatusFromIRCTC(intent, callback) {
    const cardTitle = intent.name;
    const trainNumber = intent.slots.trainNumber;
    const liveDate = intent.slots.liveDate;
    let repromptText = '';
    let speechOutput = '';
    let shouldEndSession = false;

    const requestTrainNumber = trainNumber.value;
    const requestLiveDate = getDateInDDMMYY(liveDate.value);

    var params = {
        trainNumber: requestTrainNumber,
        liveDate: requestLiveDate
    };

    irctcAPI(params, 'trainLiveStatusFinder', function (result) {
        if (result === 'no_api' || result === 'error') {
            speechOutput = 'Invalid request to find live status. Can you please repeat question?';
            repromptText = 'Invalid request to find live status. Can you please repeat question?';
            let reply = {speechOutput: speechOutput, repromptText: repromptText, shouldEndSession: shouldEndSession};
            callback(reply);
        } else if (result === 'invalid_data') {
            speechOutput = '' + requestTrainNumber + ' is invalid train number.  Can you please repeat your train number?';
            repromptText = "I didn't hear you, " + requestTrainNumber + ' is invalid train number. Can you please repeat your train number?';
            let reply = {speechOutput: speechOutput, repromptText: repromptText, shouldEndSession: shouldEndSession};
            callback(reply);
        } else if (result === 'server_error') {
            speechOutput = 'No Details available with train number ' + requestTrainNumber + ' on ' + requestLiveDate + '. Good bye.';
            shouldEndSession = true;
            let reply = {speechOutput: speechOutput, repromptText: repromptText, shouldEndSession: shouldEndSession};
            callback(reply);
        } else {
            speechOutput = result + '. Good bye.';
            shouldEndSession = true;
            let reply = {speechOutput: speechOutput, repromptText: repromptText, shouldEndSession: shouldEndSession};
            callback(reply);
        }
    });
}

function getTrainRouteFromIRCTC(intent, callback) {
    const cardTitle = intent.name;
    const trainNumber = intent.slots.trainNumber;
    let repromptText = '';
    let speechOutput = '';
    let shouldEndSession = false;

    const requestTrainNumber = trainNumber.value;

    irctcAPI(requestTrainNumber, 'trainRouteFinder', function (result) {
        if (result === 'no_api' || result === 'error') {
            speechOutput = 'Invalid request for train route.  Can you please repeat question?';
            repromptText = 'Invalid request for train route.  Can you please repeat question?';
            let reply = {speechOutput: speechOutput, repromptText: repromptText, shouldEndSession: shouldEndSession};
            callback(reply);
        } else if (result === 'invalid_data') {
            speechOutput = '' + requestTrainNumber + ' is invalid train number.  Can you please repeat your train number?';
            repromptText = "I didn't hear you, " + requestTrainNumber + ' is invalid train number. Can you please repeat your train number?';
            let reply = {speechOutput: speechOutput, repromptText: repromptText, shouldEndSession: shouldEndSession};
            callback(reply);
        } else if (result === 'server_error') {
            speechOutput = 'No Details available with train number ' + requestTrainNumber + '. Good bye.';
            shouldEndSession = true;
            let reply = {speechOutput: speechOutput, repromptText: repromptText, shouldEndSession: shouldEndSession};
            callback(reply);
        } else {
            speechOutput = result + '. Good bye.';
            shouldEndSession = true;
            let reply = {speechOutput: speechOutput, repromptText: repromptText, shouldEndSession: shouldEndSession};
            callback(reply);
        }
    });
}

function getTrainSeatsAvailabilityFromIRCTC(intent, callback) {
    const cardTitle = intent.name;
    const trainNumber = intent.slots.trainNumber;
    const bookingDate = intent.slots.bookingDate;
    const sourceStationCode = intent.slots.sourceStationCode.resolutions.resolutionsPerAuthority[0].values[0].value.id;
    const destinationStationCode = intent.slots.destinationStationCode.resolutions.resolutionsPerAuthority[0].values[0].value.id;
    const preferredClass = intent.slots.preferredClass.resolutions.resolutionsPerAuthority[0].values[0].value.id;
    const preferredQuota = intent.slots.preferredQuota.resolutions.resolutionsPerAuthority[0].values[0].value.id;

    let repromptText = '';
    let speechOutput = '';
    let shouldEndSession = false;

    const requestTrainNumber = trainNumber.value;
    const requestBookingDate = getDateInDDMMYY(bookingDate.value);
    const requestSourceStationCode = sourceStationCode;
    const requestDestinationStationCode = destinationStationCode;
    const requestPreferredClass = preferredClass;
    const requestPreferredQuota = preferredQuota;

    var params = {
        trainNumber: requestTrainNumber,
        bookingDate: requestBookingDate,
        sourceStationCode: requestSourceStationCode,
        destinationStationCode: requestDestinationStationCode,
        preferredClass: requestPreferredClass,
        preferredQuota: requestPreferredQuota
    };

    irctcAPI(params, 'trainSeatsAvailabilityFinder', function (result) {
        if (result === 'no_api' || result === 'error') {
            speechOutput = 'Invalid request to find seats availability in train. Can you please repeat question?';
            repromptText = 'Invalid request to find seats availability in train. Can you please repeat question?';
            let reply = {speechOutput: speechOutput, repromptText: repromptText, shouldEndSession: shouldEndSession};
            callback(reply);
        } else if (result === 'invalid_data') {
            speechOutput = 'I think you provided invalid details.  Can you please repeat question?';
            repromptText = "I didn't hear you, I think you provided invalid details. Can you please repeat your question?";
            let reply = {speechOutput: speechOutput, repromptText: repromptText, shouldEndSession: shouldEndSession};
            callback(reply);
        } else if (result === 'server_error') {
            speechOutput = 'No Details available with given information. Good bye.';
            shouldEndSession = true;
            let reply = {speechOutput: speechOutput, repromptText: repromptText, shouldEndSession: shouldEndSession};
            callback(reply);
        } else {
            speechOutput = result + '. Good bye.';
            shouldEndSession = true;
            let reply = {speechOutput: speechOutput, repromptText: repromptText, shouldEndSession: shouldEndSession};
            callback(reply);
        }
    });
}

const handlers = {
    'LaunchRequest': function () {
        this.attributes.speechOutput = this.t('WELCOME_MESSAGE', this.t('SKILL_NAME'));
        this.attributes.repromptSpeech = this.t('WELCOME_REPROMPT');
        this.response.speak(this.attributes.speechOutput).listen(this.attributes.repromptSpeech);
        this.emit(':responseReady');
    },
    'TrainNameFinder': function () {
        if (this.event.request.dialogState === 'STARTED') {
            let updatedIntent = this.event.request.intent;
            this.emit(':delegate', updatedIntent);
        } else if (this.event.request.dialogState !== 'COMPLETED') {
            const self = this;
            if (this.event.request.intent.slots.trainNumber.confirmationStatus === 'CONFIRMED') {
                getTrainNameFromIRCTC(self.event.request.intent, function (result) {
                    //self.attributes.speechOutput = result.speechOutput;
                    //self.attributes.repromptSpeech = result.repromptText;

                    //self.response.speak(result.speechOutput).listen(self.attributes.repromptSpeech);
                    //self.response.cardRenderer(self.event.request.intent.name, result.speechOutput);
                    //self.emit(':responseReady');
                    self.emit(':tellWithCard',result.speechOutput,self.event.request.intent.name,result.speechOutput);
                });
            } else {
                this.emit(':delegate');
            }
        } else {
            const self = this;
            getTrainNameFromIRCTC(self.event.request.intent, function (result) {
                //self.response.speak(result.speechOutput).listen(result.repromptText);
                //self.response.cardRenderer(self.event.request.intent.name, result.speechOutput);
                //self.emit(':responseReady');
                self.emit(':tellWithCard',result.speechOutput,self.event.request.intent.name,result.speechOutput);
            });
        }
    },
    'PNRStatusFinder': function () {
        if (this.event.request.dialogState === 'STARTED') {
            let updatedIntent = this.event.request.intent;
            this.emit(':delegate', updatedIntent);
        } else if (this.event.request.dialogState !== 'COMPLETED') {
            const self = this;
            if (this.event.request.intent.slots.pnrNumber.confirmationStatus === 'CONFIRMED') {
                getPNRStatusFromIRCTC(self.event.request.intent, function (result) {
                    //self.attributes.speechOutput = result.speechOutput;
                    //self.attributes.repromptSpeech = result.repromptText;

                    //self.response.speak(result.speechOutput).listen(self.attributes.repromptSpeech);
                    //self.response.cardRenderer(self.event.request.intent.name, result.speechOutput);
                    //self.emit(':responseReady');
                    self.emit(':tellWithCard',result.speechOutput,self.event.request.intent.name,result.speechOutput);
                });
            } else {
                this.emit(':delegate');
            }
        } else {
            const self = this;
            getPNRStatusFromIRCTC(self.event.request.intent, function (result) {
                //self.response.speak(result.speechOutput).listen(result.repromptText);
                //self.response.cardRenderer(self.event.request.intent.name, result.speechOutput);
                //self.emit(':responseReady');
                self.emit(':tellWithCard',result.speechOutput,self.event.request.intent.name,result.speechOutput);
            });
        }
    },
    'TrainArrivalsFinder': function () {
        if (this.event.request.dialogState === 'STARTED') {
            let updatedIntent = this.event.request.intent;
            this.emit(':delegate', updatedIntent);
        } else if (this.event.request.dialogState !== 'COMPLETED') {
            const self = this;
            if (this.event.request.intent.slots.stationCode.confirmationStatus === 'CONFIRMED' &&
                    this.event.request.intent.slots.searchHours.confirmationStatus === 'CONFIRMED') {
                getTrainArraivalsFromIRCTC(self.event.request.intent, function (result) {
                    //self.attributes.speechOutput = result.speechOutput;
                    //self.attributes.repromptSpeech = result.repromptText;

                    //self.response.speak(result.speechOutput).listen(self.attributes.repromptSpeech);
                    //self.response.cardRenderer(self.event.request.intent.name, result.speechOutput);
                    //self.emit(':responseReady');
                    self.emit(':tellWithCard',result.speechOutput,self.event.request.intent.name,result.speechOutput);
                });
            } else {
                this.emit(':delegate');
            }
        } else {
            const self = this;
            getTrainArraivalsFromIRCTC(self.event.request.intent, function (result) {
                //self.response.speak(result.speechOutput).listen(result.repromptText);
                //self.response.cardRenderer(self.event.request.intent.name, result.speechOutput);
                //self.emit(':responseReady');
                self.emit(':tellWithCard',result.speechOutput,self.event.request.intent.name,result.speechOutput);
            });
        }
    },
    'TrainLiveStatusFinder': function () {
        if (this.event.request.dialogState === 'STARTED') {
            let updatedIntent = this.event.request.intent;
            this.emit(':delegate', updatedIntent);
        } else if (this.event.request.dialogState !== 'COMPLETED') {
            const self = this;
            if (this.event.request.intent.slots.trainNumber.confirmationStatus === 'CONFIRMED' &&
                    this.event.request.intent.slots.liveDate.confirmationStatus === 'CONFIRMED') {
                getTrainLiveStatusFromIRCTC(self.event.request.intent, function (result) {
                    //self.attributes.speechOutput = result.speechOutput;
                    //self.attributes.repromptSpeech = result.repromptText;

                    //self.response.speak(result.speechOutput).listen(self.attributes.repromptSpeech);
                    //self.response.cardRenderer(self.event.request.intent.name, result.speechOutput);
                    //self.emit(':responseReady');
                    self.emit(':tellWithCard',result.speechOutput,self.event.request.intent.name,result.speechOutput);
                });
            } else {
                this.emit(':delegate');
            }
        } else {
            const self = this;
            getTrainLiveStatusFromIRCTC(self.event.request.intent, function (result) {
                //self.response.speak(result.speechOutput).listen(result.repromptText);
                //self.response.cardRenderer(self.event.request.intent.name, result.speechOutput);
                //self.emit(':responseReady');
                self.emit(':tellWithCard',result.speechOutput,self.event.request.intent.name,result.speechOutput);
            });
        }
    },
    'TrainRouteFinder': function () {
        const self = this;
        if (this.event.request.intent.slots.trainNumber.value) {
            getTrainRouteFromIRCTC(self.event.request.intent, function (result) {
                //self.attributes.speechOutput = result.speechOutput;
                //self.attributes.repromptSpeech = result.repromptText;

                //self.response.speak(result.speechOutput).listen(self.attributes.repromptSpeech);
                //self.response.cardRenderer(self.event.request.intent.name, result.speechOutput);
                //self.emit(':responseReady');
                self.emit(':tellWithCard',result.speechOutput,self.event.request.intent.name,result.speechOutput);
            });
        } else {
            const slotToElicit = 'trainNumber';
            const speechOutput = 'What is the train number?';
            const repromptSpeech = speechOutput;
            this.emit(':elicitSlot', slotToElicit, speechOutput, repromptSpeech);
        }
    },
    'SeatsAvailabilityFinder': function () {
        const self = this;
        if (!this.event.request.intent.slots.trainNumber.value) {
            const slotToElicit = 'trainNumber';
            const speechOutput = 'What is the train number?';
            const repromptSpeech = speechOutput;
            this.emit(':elicitSlot', slotToElicit, speechOutput, repromptSpeech);
        } else if (!this.event.request.intent.slots.sourceStationCode.value) {
            const slotToElicit = 'sourceStationCode';
            const speechOutput = 'Where do you want to book ticket from. Tell me station code';
            const repromptSpeech = speechOutput;
            this.emit(':elicitSlot', slotToElicit, speechOutput, repromptSpeech);
        } else if (!this.event.request.intent.slots.destinationStationCode.value) {
            const slotToElicit = 'destinationStationCode';
            const speechOutput = 'Tell me station code for destination';
            const repromptSpeech = speechOutput;
            this.emit(':elicitSlot', slotToElicit, speechOutput, repromptSpeech);
        } else if (!this.event.request.intent.slots.bookingDate.value) {
            const slotToElicit = 'bookingDate';
            const speechOutput = 'On which date do you want to me to find';
            const repromptSpeech = speechOutput;
            this.emit(':elicitSlot', slotToElicit, speechOutput, repromptSpeech);
        } else if (!this.event.request.intent.slots.preferredClass.value) {
            const slotToElicit = 'preferredClass';
            const speechOutput = 'What is your preferred class to Travel';
            const repromptSpeech = speechOutput;
            this.emit(':elicitSlot', slotToElicit, speechOutput, repromptSpeech);
        } else if (this.event.request.intent.slots.preferredClass.resolutions.resolutionsPerAuthority[0].status.code === 'ER_SUCCESS_NO_MATCH') {
            const slotToElicit = 'preferredClass';
            const speechOutput = "I didn't understand your preferred Class. Can you please say again?";
            const repromptSpeech = speechOutput;
            this.emit(':elicitSlot', slotToElicit, speechOutput, repromptSpeech);
        } else if (!this.event.request.intent.slots.preferredQuota.value) {
            const slotToElicit = 'preferredQuota';
            const speechOutput = 'Which quota do you want to travel in';
            const repromptSpeech = speechOutput;
            this.emit(':elicitSlot', slotToElicit, speechOutput, repromptSpeech);
        } else if (!this.event.request.intent.slots.preferredQuota.resolutions.resolutionsPerAuthority[0].status.code === 'ER_SUCCESS_NO_MATCH') {
            const slotToElicit = 'preferredQuota';
            const speechOutput = "I didn't understand your preferred passenger quota. Can you please say your quota again";
            const repromptSpeech = speechOutput;
            this.emit(':elicitSlot', slotToElicit, speechOutput, repromptSpeech);
        } else {
            getTrainSeatsAvailabilityFromIRCTC(self.event.request.intent, function (result) {
                //self.attributes.speechOutput = result.speechOutput;
                //self.attributes.repromptSpeech = result.repromptText;

                //self.response.speak(result.speechOutput).listen(self.attributes.repromptSpeech);
                //self.response.cardRenderer(self.event.request.intent.name, result.speechOutput);
                //self.emit(':responseReady');
                self.emit(':tellWithCard',result.speechOutput,self.event.request.intent.name,result.speechOutput);
            });
        }
    },
    'AMAZON.HelpIntent': function () {
        this.attributes.speechOutput = this.t('HELP_MESSAGE');
        this.attributes.repromptSpeech = this.t('HELP_REPROMPT');
        this.response.speak(this.attributes.speechOutput).listen(this.attributes.repromptSpeech);
        this.emit(':responseReady');
    },
    'AMAZON.RepeatIntent': function () {
        this.response.speak(this.attributes.speechOutput).listen(this.attributes.repromptSpeech);
        this.emit(':responseReady');
    },
    'AMAZON.StopIntent': function () {
        this.emit('SessionEndedRequest');
    },
    'AMAZON.CancelIntent': function () {
        this.emit('SessionEndedRequest');
    },
    'SessionEndedRequest': function () {
        console.log('Session ended');
        this.emit(':tell', 'Thank you for using Railway Enquiry!'); 
    },
    'Unhandled': function () {
        this.attributes.speechOutput = this.t('HELP_MESSAGE');
        this.attributes.repromptSpeech = this.t('HELP_REPROMPT');
        this.response.speak(this.attributes.speechOutput).listen(this.attributes.repromptSpeech);
        this.emit(':responseReady');
    }
};

exports.handler = function (event, context, callback) {
    const alexa = Alexa.handler(event, context, callback);
    alexa.APP_ID = APP_ID;
    // To enable string internationalization (i18n) features, set a resources object.
    alexa.resources = languageStrings;
    alexa.registerHandlers(handlers);
    alexa.execute();
};

