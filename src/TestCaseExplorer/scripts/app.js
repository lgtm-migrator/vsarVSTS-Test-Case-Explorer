/// <reference path='ref/jquery.d.ts' />
/// <reference path='ref/VSS.d.ts' />
define(["require", "exports", "scripts/TestCaseView", "scripts/TreeViewView"], function (require, exports, TestCaseView, TreeViewView) {
    var tc = new TestCaseView.TestCaseView();
    tc.initialize();
    var tv = new TreeViewView.TreeviewView();
    tv.initialize();
});
//# sourceMappingURL=app.js.map