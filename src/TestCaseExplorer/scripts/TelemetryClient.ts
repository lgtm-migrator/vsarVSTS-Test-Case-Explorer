/// <reference path="ai.0.21.5-build00175.d.ts" />

class TelemetryClient {

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
        var snippet: any = {
            config: {
                instrumentationKey: "f83f44a3-3005-4754-bf97-f978931244a6",
            }
        };
        var x = VSS.getExtensionContext();

        var init = new Microsoft.ApplicationInsights.Initialization(snippet);
        this.appInsightsClient = init.loadAppInsights();

        var webContext = VSS.getWebContext();
        this.appInsightsClient.setAuthenticatedUserContext(webContext.user.id, webContext.collection.id);

    }

    public startTrackPageView(name?: string) {
        this.appInsightsClient.startTrackPage(name);
    }

    public stopTrackPageView(name?: string) {
        this.appInsightsClient.stopTrackPage(name);
    }

    public trackPageView(name?: string, url?: string, properties?: Object, measurements?: Object, duration?: number) {
        this.appInsightsClient.trackPageView("TCExplorer." + name, url, properties, measurements, duration);        
    }

    public trackEvent(name: string, properties?: Object, measurements?: Object) {
        this.appInsightsClient.trackEvent("TCExplorer." + name, properties, measurements);
        this.appInsightsClient.flush();
    }

    public trackException(exception: Error, handledAt?: string, properties?: Object, measurements?: Object) {
        this.appInsightsClient.trackException(exception, handledAt, properties, measurements);
        this.appInsightsClient.flush();
    }

    public trackMetric(name: string, average: number, sampleCount?: number, min?: number, max?: number, properties?: Object) {
        this.appInsightsClient.trackMetric("TCExplorer." + name, average, sampleCount, min, max, properties);
        this.appInsightsClient.flush();
    }

}