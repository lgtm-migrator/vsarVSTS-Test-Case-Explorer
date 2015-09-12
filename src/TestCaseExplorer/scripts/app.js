/// <reference path='ref/jquery.d.ts' />
/// <reference path='ref/VSS.d.ts' />
define(["require", "exports", "scripts/DetailsView", "scripts/TestCaseView", "scripts/TreeViewView"], function (require, exports, DetailsView, TestCaseView, TreeViewView) {
    var paneToggler = new DetailsView.DetailsPaneToggler();
    var tc = new TestCaseView.TestCaseView();
    tc.initialize(paneToggler);
    var tv = new TreeViewView.TreeviewView();
    tv.initialize(RefreshGrid);
    paneToggler.init(this, $(".far-right-pane-pivot"), null, null, null);
    function RefreshGrid(pivot, value) {
        tc.RefreshGrid(pivot, value);
    }
});
//# sourceMappingURL=app.js.map