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
define(["require", "exports", "scripts/DetailsToggle", "scripts/DetailsView", "scripts/TestCaseView", "scripts/TreeViewView", "VSS/Controls", "VSS/Controls/Common"], function (require, exports, DetailsToggle, DetailsView, TestCaseView, TreeViewView, Controls, CommonControls) {
    var paneToggler = new DetailsToggle.DetailsPaneToggler();
    var dv = new DetailsView.DetailsView();
    var tc = new TestCaseView.TestCaseView();
    tc.initialize(paneToggler, RefreshPane);
    var tv = new TreeViewView.TreeviewView();
    var splitter = Controls.Enhancement.getInstance(CommonControls.Splitter, $(".right-hub-splitter"));
    paneToggler.init(this, $(".far-right-pane-pivot"), splitter, tc, dv).then(function (t) {
        tc.updateTogle(t);
    });
    tv.initialize(RefreshGrid);
    dv.initialize(paneToggler);
    function RefreshGrid(pivot, value, showRecursive) {
        tc.RefreshGrid(pivot, value, showRecursive);
    }
    function RefreshPane(id) {
        dv.selectionChanged(id);
    }
});
//# sourceMappingURL=app.js.map