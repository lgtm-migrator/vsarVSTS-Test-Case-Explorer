//---------------------------------------------------------------------
// <copyright file="app.ts">
//    This code is licensed under the MIT License.
//    THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF 
//    ANY KIND, EXPRESS OR IMPLIED, INCLUDING BUT NOT LIMITED 
//    TO THE WARRANTIES OF MERCHANTABILITY, FITNESS FOR A 
//    PARTICULAR PURPOSE AND NONINFRINGEMENT.
// </copyright>
// <summary>
//    This is part of the Test Case Explorer extensions
//    from the ALM Rangers. This file contains mainly common 
//    application initialization code.
// </summary>
//---------------------------------------------------------------------

/// <reference path='ref/jquery/jquery.d.ts' />
/// <reference path='ref/VSS.d.ts' />


import Common = require("scripts/Common");
Common.WIQLConstants.getWiqlConstants();


import DetailsToggle = require("scripts/DetailsToggle");
var paneToggler = new DetailsToggle.DetailsPaneToggler();

import DetailsView = require("scripts/DetailsView");
var dv = new DetailsView.DetailsView();

import TestCaseView = require("scripts/TestCaseView");
var tc = new TestCaseView.TestCaseView();
tc.initialize(paneToggler, RefreshPane);

import TreeViewView = require("scripts/TreeViewView");
var tv = new TreeViewView.TreeviewView();

import Controls = require("VSS/Controls");
import SplitterControls = require("VSS/Controls/Splitter");


var leftSplitter = <SplitterControls.Splitter>Controls.Enhancement.getInstance(SplitterControls.Splitter, $(".left-hub-splitter"));
VSS.getService<IExtensionDataService>(VSS.ServiceIds.ExtensionData).then(function (dataService) {
    var posReq = dataService.getValue("LeftPaneWidth", { scopeType: "User" }).then(width => {
        leftSplitter.toggleExpanded(true)
        leftSplitter.resize(width);
    });
});

leftSplitter._element.on('changed', function () {
    saveWidth();
});

var splitter = <SplitterControls.Splitter>Controls.Enhancement.getInstance(SplitterControls.Splitter, $(".right-hub-splitter"));
paneToggler.init(this, $(".far-right-pane-pivot"), splitter, tc, dv).then(function (t) {
    tc.updateTogle(t);
});

tv.initialize(RefreshGrid);
dv.initialize(paneToggler);

function RefreshGrid(pivot: string, value: string, showRecursive: boolean): void {
    tc.RefreshGrid(pivot, value, showRecursive);
    dv.selectionChanged(null);
}

function RefreshPane(id: string): void {
    dv.selectionChanged(id);
}

function saveWidth() {

    var width = leftSplitter.leftPane.width();
    width = (width == 0 ? 200 : width);

    VSS.getService<IExtensionDataService>(VSS.ServiceIds.ExtensionData).then(function (dataService) {
        // Set value in user scope
        dataService.setValue("LeftPaneWidth", width, { scopeType: "User" }).then(function (value) {
        });
    });
}