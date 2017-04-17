//---------------------------------------------------------------------
// <copyright file="TelemetryClient.ts">
//    This code is licensed under the MIT License.
//    THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF 
//    ANY KIND, EXPRESS OR IMPLIED, INCLUDING BUT NOT LIMITED 
//    TO THE WARRANTIES OF MERCHANTABILITY, FITNESS FOR A 
//    PARTICULAR PURPOSE AND NONINFRINGEMENT.
// </copyright>
// <summary>
//    This is part of the Test Case Explorer extensions
//    from the ALM Rangers. This file contains the implementation
//    of the application insights telemetry integration. 
// </summary>
//---------------------------------------------------------------------

/// <reference path='../typings/tsd.d.ts' />

import VSS_VSS = require("VSS/VSS");
import Context = require("VSS/Context")


export class TelemetryClient implements VSS_VSS.errorPublisher {

    private static telemetryClient: TelemetryClient;
    public static getClient(): TelemetryClient {

        if (!this.telemetryClient) {
            this.telemetryClient = new TelemetryClient();
            this.telemetryClient.Init();
        }

        return this.telemetryClient;
    }

    private appInsightsClient: Microsoft.ApplicationInsights.AppInsights;

    private Init() {
        var self = this;
        try {
            var x = VSS.getExtensionContext();

            var snippet: any = {
                config: {
                    instrumentationKey: "__AppInsightsKey__"
                }
            };

            var init = new Microsoft.ApplicationInsights.Initialization(snippet);
            this.appInsightsClient = init.loadAppInsights();


            var webContext = VSS.getWebContext();
            this.appInsightsClient.setAuthenticatedUserContext(webContext.user.id, webContext.account.name);
            this.appInsightsClient.context.application.ver = Context.getPageContext().webAccessConfiguration.isHosted ? "hosted" : "onPrem";
            this.appInsightsClient.context.application.build = VSS.getExtensionContext().version;

            window.onerror = this.appInsightsClient._onerror;
            VSS_VSS.errorHandler.attachErrorPublisher(self);

            try {
                this.trackEvent("InitTelemetry", {
                    version: VSS.getExtensionContext().version,
                    isHosted: Context.getPageContext().webAccessConfiguration.isHosted,
                    account: VSS.getWebContext().account.uri
                });
            }
            catch (ex) {
                //Just log to console 
                console.log(ex);
            }
        }
        catch (e) {
            this.appInsightsClient = null;
            console.log(e);
        }
    }

    public publishError(error: TfsError): void {

        var e = new Error();
        e.name = error.name;
        e.message = error.message;
        e["stack"] = error.stack;
        if (e.message.indexOf('%error="1660002";%') > 0) {
            // SDK Bug causes getSettings & getDocument calls to recieven unhandled exceptions - despite beeing handled 
            // just log it to console and kill it 
            console.log(e.message)
        }
        else {
            this.appInsightsClient.trackException(e)
        }

    }

    public startTrackPageView(name?: string) {
        try {
            if (this.appInsightsClient != null) {
                this.appInsightsClient.startTrackPage(name);
            }
        }
        catch (e) {
            console.log(e);
        }
    }

    public stopTrackPageView(name?: string) {
        try {
            if (this.appInsightsClient != null) {
                this.appInsightsClient.stopTrackPage(name);
            }
        }
        catch (e) {
            console.log(e);
        }
    }

    public trackPageView(name?: string, url?: string, properties?: Object, measurements?: Object, duration?: number) {
        try {
            if (this.appInsightsClient != null) {
                this.appInsightsClient.trackPageView(name, url, properties, measurements, duration);
            }
        }
        catch (e) {
            console.log(e);
        }
    }

    public trackEvent(name: string, properties?: Object, measurements?: Object) {
        try {
            if (this.appInsightsClient != null) {

                this.appInsightsClient.trackEvent(name, properties, measurements);
                this.appInsightsClient.flush();
            }
        }
        catch (e) {
            console.log(e);
        }
    }

    public trackException(exception: Error, handledAt?: string, properties?: Object, measurements?: Object) {
        try {
            if (this.appInsightsClient != null) {
                this.appInsightsClient.trackException(exception, handledAt, properties, measurements);
                this.appInsightsClient.flush();
            }
        }
        catch (e) {
            console.log(e);
        }
    }

    public trackMetric(name: string, average: number, sampleCount?: number, min?: number, max?: number, properties?: Object) {
        try {
            if (this.appInsightsClient != null) {
                this.appInsightsClient.trackMetric(name, average, sampleCount, min, max, properties);
                this.appInsightsClient.flush();
            }
        }
        catch (e) {
            console.log(e);
        }
    }

}

