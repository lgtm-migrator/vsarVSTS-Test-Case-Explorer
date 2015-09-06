/// <reference path='ref/jquery.d.ts' />
/// <reference path='ref/VSS.d.ts' />



import TestCaseView = require("scripts/TestCaseView");
var tc = new TestCaseView.TestCaseView();
tc.initialize();

import TreeViewView = require("scripts/TreeViewView");
var tv = new TreeViewView.TreeviewView();
tv.initialize( RefreshGrid);


function RefreshGrid(pivot:string, value:string):void{
    tc.RefreshGrid(pivot, value);
}
