/// <reference path='ref/jquery.d.ts' />
/// <reference path='ref/VSS.d.ts' />

import DetailsToggle = require("scripts/DetailsToggle");
var paneToggler = new DetailsToggle.DetailsPaneToggler();


import DetailsView = require("scripts/DetailsView");
var dv = new DetailsView.DetailsView();
dv.initialize();

import TestCaseView = require("scripts/TestCaseView");
var tc = new TestCaseView.TestCaseView();
tc.initialize(paneToggler, RefreshPane );

import TreeViewView = require("scripts/TreeViewView");
var tv = new TreeViewView.TreeviewView();
tv.initialize( RefreshGrid);





paneToggler.init(this, $(".far-right-pane-pivot"), null,  null, null);




function RefreshGrid(pivot:string, value:string):void{
    tc.RefreshGrid(pivot, value);
}

function RefreshPane(id: string): void {
    dv.selectionChanged(id);
}