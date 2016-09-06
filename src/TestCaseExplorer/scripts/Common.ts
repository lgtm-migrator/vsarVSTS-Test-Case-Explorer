//---------------------------------------------------------------------
// <copyright file="Common.ts">
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

/// <reference path='../typings/tsd.d.ts' />

import WorkItemContracts = require("TFS/WorkItemTracking/Contracts");
import WorkItemClient = require("TFS/WorkItemTracking/RestClient");
import Context = require("VSS/Context");
import Q = require("q");

export function  createDragTile(dragType:string, $dragItemTitle:JQuery):JQuery {
    var $dragTile = $("<div />")
        .addClass("drag-tile")

    var $dropNOTAllowed = $("<div style='display:none'/>").addClass("drop-not-allowed");
    var $dropNOTAllowedIcon = $("<img src='img/cancel.png'/>")
    var $dropNotAllowedMsg = $("<div>").addClass("drop-not-allowed-message");
    $dropNOTAllowed.append($dropNOTAllowedIcon);
    $dropNOTAllowed.append($dropNotAllowedMsg);
    $dragTile.append($dropNOTAllowed);

    var $dropAllowed = $("<div />").addClass("drop-allowed");
    var $dragType = $("<span />")
        .addClass("drag-tile-drag-type")
        .text(dragType);


    var $dragHead = $("<div />")
        .addClass("drag-tile-head")
        .append($dragType)
        .append($dragItemTitle)

    $dropAllowed.append($dragHead);
    $dragTile.append($dropAllowed);

    return $dragTile;
}


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

            Q.all([testCat, reqCat]).then(categories => {
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

export function getTestResultCellContent(rowInfo, dataIndex, expandedState, level, column, indentIndex, columnOrder) {
    var outcome = this.getColumnValue(dataIndex, column.index);
    var d = $("<div class='grid-cell'/>").width(column.width || 100)
    var dIcon = $("<div class='testpoint-outcome-shade icon bowtie-icon-small'/>");
    dIcon.addClass(getIconFromTestOutcome(outcome));
    d.append(dIcon);
    var dTxt = $("<span />");
    dTxt.text(outcome);
    d.append(dTxt);
    return d;
}

export function getIconFromTestOutcome(outcome): string {
    var icon: string = "";
    switch (outcome) {
        case "NotApplicable":
            icon = "icon-tfs-tcm-not-applicable";
            break;
        case "Blocked":
            icon = "icon-tfs-tcm-block-test";
            break;
        case "Passed":
            icon = "icon-tfs-build-status-succeeded";
            break;
        case "Failed":
            icon = "icon-tfs-build-status-failed";
            break;
        case "None":
            icon = "icon-tfs-tcm-block-test";
            break;
        case "DynamicTestSuite":
            icon = "icon-tfs-build-status-succeeded";
            break
    }
    return icon;
}

export interface ICustomColumnDef {
    field: string;
    name: string;
    width: number;
    getCellContents?: any;
}

export function MergeColumnLists(lst1: ICustomColumnDef[], lst2: ICustomColumnDef[]): ICustomColumnDef[] {
    var a = lst1.concat(lst2)

    var seen = {};
    return a.filter(item => {
        return seen.hasOwnProperty(item.field) ? false : (seen[item.field] = true);
    });
}

export function getToolbarIcon(name): string {
    var isHosted: boolean = Context.getPageContext().webAccessConfiguration.isHosted;
    var icon: string = "";
    switch (name) {
        case "show-recursive":
            icon = isHosted ? "bowtie-row-child" : "icon-inherited-form";
            break;
        case "expand-all":
            icon = isHosted ? "bowtie-toggle-expand-all" : "icon-tree-expand-all";
            break;
        case "collapse-all":
            icon = isHosted ? "bowtie-toggle-collapse" : "icon-tree-collapse-all";
            break;
        case "open-testsuite":
            icon = isHosted ? "bowtie-arrow-open" : "icon-open";
            break;
        case "remove":
            icon = isHosted ? "bowtie-edit-delete" : "icon-delete";
            break;
        case "refresh":
            icon = isHosted ? "bowtie-navigate-refresh" : "icon-refresh";
            break;
        case "new-testcase":
            icon = isHosted ? "icon-add-small" : "icon-add-small";
            break;
        case "open-testcase":
            icon = isHosted ? "bowtie-arrow-open" : "icon-open";
            break;
        case "remove-testcase":
            icon = isHosted ? "bowtie-edit-delete" : "icon-delete";
            break;
        case "toggle":
            icon = isHosted ? "bowtie-details-pane" : "icon-tfs-tcm-associated-pane-toggle";
            break;
        case "":
            icon = isHosted ? "" : "";
            break;
    }
    return icon;
}

export function getToolbarCss(): string {
    var isHosted: boolean = Context.getPageContext().webAccessConfiguration.isHosted;
    return isHosted ? "bowtie-icon" : "";
}