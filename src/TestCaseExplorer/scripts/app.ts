﻿//---------------------------------------------------------------------
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

/// <reference path='ref/jquery.d.ts' />
/// <reference path='ref/VSS.d.ts' />

import DetailsToggle = require("scripts/DetailsToggle");
var paneToggler = new DetailsToggle.DetailsPaneToggler();

import DetailsView = require("scripts/DetailsView");
var dv = new DetailsView.DetailsView();

import TestCaseView = require("scripts/TestCaseView");
var tc = new TestCaseView.TestCaseView();
tc.initialize(paneToggler, RefreshPane );

import TreeViewView = require("scripts/TreeViewView");
var tv = new TreeViewView.TreeviewView();

import Controls = require("VSS/Controls");
import CommonControls = require("VSS/Controls/Common");

var splitter = <CommonControls.Splitter>Controls.Enhancement.getInstance(CommonControls.Splitter, $(".right-hub-splitter"));
paneToggler.init(this, $(".far-right-pane-pivot"), splitter, tc, dv).then(function (t) {
    tc.updateTogle(t);
});

tv.initialize(RefreshGrid);
dv.initialize(paneToggler);

function RefreshGrid(pivot:string, value:string, showRecursive:boolean):void{
    tc.RefreshGrid(pivot, value, showRecursive );
}

function RefreshPane(id: string): void {
    dv.selectionChanged(id);
}