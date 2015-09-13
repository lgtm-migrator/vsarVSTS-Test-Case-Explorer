/// <reference path='ref/jquery.d.ts' />
/// <reference path='ref/VSS.d.ts' />

import DetailsToggle = require("scripts/DetailsToggle");
var paneToggler = new DetailsToggle.DetailsPaneToggler();


import TestCaseView = require("scripts/TestCaseView");
var tc = new TestCaseView.TestCaseView();
tc.initialize(paneToggler);

import TreeViewView = require("scripts/TreeViewView");
var tv = new TreeViewView.TreeviewView();
tv.initialize( RefreshGrid);

import DetailsView = require("scripts/DetailsView");
var dv = new DetailsView.DetailsView();
dv.initialize();



paneToggler.init(this, $(".far-right-pane-pivot"), null,  null, null);




function RefreshGrid(pivot:string, value:string):void{
    tc.RefreshGrid(pivot, value);
}
