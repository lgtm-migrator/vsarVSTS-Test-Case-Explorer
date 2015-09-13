/// <reference path='ref/jquery.d.ts' />
/// <reference path='ref/VSS.d.ts' />
define(["require", "exports", "scripts/DetailsToggle", "scripts/TestCaseView", "scripts/TreeViewView", "scripts/DetailsView"], function (require, exports, DetailsToggle, TestCaseView, TreeViewView, DetailsView) {
    var paneToggler = new DetailsToggle.DetailsPaneToggler();
    var tc = new TestCaseView.TestCaseView();
    tc.initialize(paneToggler);
    var tv = new TreeViewView.TreeviewView();
    tv.initialize(RefreshGrid);
    var dv = new DetailsView.DetailsView();
    dv.initialize();
    paneToggler.init(this, $(".far-right-pane-pivot"), null, null, null);
    function RefreshGrid(pivot, value) {
        tc.RefreshGrid(pivot, value);
    }
});
//# sourceMappingURL=app.js.map