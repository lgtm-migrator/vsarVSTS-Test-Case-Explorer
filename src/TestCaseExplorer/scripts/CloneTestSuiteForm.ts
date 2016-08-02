/// <reference path='../typings/tsd.d.ts' />

import Context = require("VSS/Context");

export interface IFormInput {
    cloneChildSuites: boolean;
    cloneRequirements: boolean;
}

export class CloneTestSuiteForm {

    public setSuites(sourceSuite: string, targetSuite: string) {
        $("#sourceSuite").text(sourceSuite);
        $("#targetSuite").text(targetSuite);
    }

    public getFormData(): IFormInput {
        return {
            cloneChildSuites: $("#cloneChildSuites").prop("checked"),
            cloneRequirements: $("#cloneRequirements").prop("checked")
        };
    }
}

VSS.register("clone-testsuite-form", context => {
    return new CloneTestSuiteForm();
});

VSS.notifyLoadSucceeded();