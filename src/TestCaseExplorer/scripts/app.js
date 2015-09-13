/// <reference path='ref/jquery.d.ts' />
/// <reference path='ref/VSS.d.ts' />
define(["require", "exports", "scripts/DetailsToggle", "scripts/DetailsView", "scripts/TestCaseView", "scripts/TreeViewView"], function (require, exports, DetailsToggle, DetailsView, TestCaseView, TreeViewView) {
    var paneToggler = new DetailsToggle.DetailsPaneToggler();
    var dv = new DetailsView.DetailsView();
    dv.initialize();
    var tc = new TestCaseView.TestCaseView();
    tc.initialize(paneToggler, RefreshPane);
    var tv = new TreeViewView.TreeviewView();
    tv.initialize(RefreshGrid);
    paneToggler.init(this, $(".far-right-pane-pivot"), null, null, null);
    function RefreshGrid(pivot, value) {
        tc.RefreshGrid(pivot, value);
    }
    function RefreshPane(id) {
        dv.selectionChanged(id);
    }
});
//# sourceMappingURL=app.js.map