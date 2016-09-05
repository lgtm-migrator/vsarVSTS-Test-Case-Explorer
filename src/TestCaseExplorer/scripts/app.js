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
define(["require", "exports", "scripts/Common", "scripts/DetailsToggle", "scripts/DetailsView", "scripts/TestCaseView", "scripts/TreeViewView", "VSS/Controls", "VSS/Controls/Splitter"], function (require, exports, Common, DetailsToggle, DetailsView, TestCaseView, TreeViewView, Controls, SplitterControls) {
    /// <reference path='../typings/tsd.d.ts' />
    console.log("Loading TestCaseExplorer version " + VSS.getExtensionContext().version) + "...";
    Common.WIQLConstants.getWiqlConstants();
    var paneToggler = new DetailsToggle.DetailsPaneToggler();
    var dv = new DetailsView.DetailsView();
    var tc = new TestCaseView.TestCaseView();
    tc.initialize(paneToggler, RefreshPane);
    var tv = new TreeViewView.TreeviewView();
    window.onkeydown = listenToTheKey;
    window.onkeyup = listenToTheKey;
    function listenToTheKey(e) {
        if (e.which === 27 || e.keyCode === 27) {
            console.log("cancelling drag...");
            $("li.node").draggable({ 'revert': true }).trigger('mouseup');
        }
        else {
            var mode = "";
            if (e.ctrlKey) {
                console.log("clone...");
                mode = "Clone";
            }
            else if (e.shiftKey) {
                console.log("add...");
                mode = "Add";
            }
            else {
                console.log("move...");
                mode = "Move";
            }
            var text = $(".drag-tile-drag-type").text();
            if (text != "Attach") {
                $(".drag-tile-drag-type").text(mode);
            }
        }
    }
    var leftSplitter = Controls.Enhancement.getInstance(SplitterControls.Splitter, $(".left-hub-splitter"));
    VSS.getService(VSS.ServiceIds.ExtensionData).then(function (dataService) {
        var posReq = dataService.getValue("LeftPaneWidth", { scopeType: "User" }).then(function (width) {
            leftSplitter.toggleExpanded(true);
            leftSplitter.resize(width);
        });
    });
    leftSplitter._element.on('changed', function () {
        saveWidth();
    });
    var splitter = Controls.Enhancement.getInstance(SplitterControls.Splitter, $(".right-hub-splitter"));
    paneToggler.init(this, $(".far-right-pane-pivot"), splitter, tc, dv).then(function (t) {
        tc.updateTogle(t);
    });
    tv.initialize(RefreshGrid);
    dv.initialize(paneToggler, tv);
    function RefreshGrid(pivot, value, showRecursive) {
        tc.RefreshGrid(pivot, value, showRecursive);
        dv.selectionChanged(null);
    }
    function RefreshPane(id) {
        dv.selectionChanged(id);
    }
    function saveWidth() {
        var width = leftSplitter.leftPane.width();
        width = (width == 0 ? 200 : width);
        VSS.getService(VSS.ServiceIds.ExtensionData).then(function (dataService) {
            // Set value in user scope
            dataService.setValue("LeftPaneWidth", width, { scopeType: "User" }).then(function (value) {
            });
        });
    }
});
//# sourceMappingURL=app.js.map