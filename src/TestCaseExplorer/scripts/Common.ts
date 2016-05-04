//---------------------------------------------------------------------
// <copyright file="DetailsView.ts">
//    This code is licensed under the MIT License.
//    THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF 
//    ANY KIND, EXPRESS OR IMPLIED, INCLUDING BUT NOT LIMITED 
//    TO THE WARRANTIES OF MERCHANTABILITY, FITNESS FOR A 
//    PARTICULAR PURPOSE AND NONINFRINGEMENT.
// </copyright>
// <summary>
//    This is part of the Test Case Explorer extensions
//    from the ALM Rangers. This file contains the implementation
//    of Common code 
// </summary>
//---------------------------------------------------------------------

/// <reference path='ref/jquery/jquery.d.ts' />
/// <reference path='ref/jqueryui.d.ts' />
/// <reference path='ref/VSS.d.ts' />
/// <reference path="telemetryclient.ts" />

import WorkItemContracts = require("TFS/WorkItemTracking/Contracts");
import WorkItemClient = require("TFS/WorkItemTracking/RestClient");

import Q = require("q");

export class WIQLConstants {

    public TestCaseTypeName: string = "Test Case";
    public TestCaseCategoryName: string = "Test Case Category";
    public RequirementsCategoryName: string = "Requirement Category";


    private static constants: WIQLConstants;
    public static getWiqlConstants(): WIQLConstants {

        if (!this.constants) {
            this.constants = new WIQLConstants();
            this.constants.Init();
        }

        return this.constants;
    }



    private Init() {
        try {
            var c = this;
            var witClient = WorkItemClient.getClient();
            
            var testCat = witClient.getWorkItemTypeCategory(VSS.getWebContext().project.id, "Microsoft.TestCaseCategory");
            var reqCat = witClient.getWorkItemTypeCategory(VSS.getWebContext().project.id, "Microsoft.RequirementCategory");

            Q.all([testCat, reqCat]).then(categories=> {
                c.TestCaseCategoryName = categories[0].name;
                c.TestCaseTypeName = categories[0].defaultWorkItemType.name;
                c.RequirementsCategoryName = categories[1].name;
            });
        }
        catch (e) {
            //this.constants = null;
            console.log(e);
        }
    }
}