/// <reference path='ref/jquery.d.ts' />
/// <reference path='ref/VSS.d.ts' />
define(["require", "exports", "scripts/DetailsToggle", "scripts/DetailsView", "scripts/TestCaseView", "scripts/TreeViewView", "VSS/Controls", "VSS/Controls/Common"], function (require, exports, DetailsToggle, DetailsView, TestCaseView, TreeViewView, Controls, CommonControls) {
    var gridTC;
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