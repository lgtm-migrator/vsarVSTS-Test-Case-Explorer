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




function RefreshGrid(pivot:string, value:string):void{
    tc.RefreshGrid(pivot, value);
}

function RefreshPane(id: string): void {
    dv.selectionChanged(id);
}